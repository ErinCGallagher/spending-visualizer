/** Upload routes: parse CSV, AI categorisation, confirm. */

import { Router } from "express";
import multer from "multer";
import Papa from "papaparse";
import { GoogleGenAI } from "@google/genai";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { TravelSpendParser } from "../parsers/travelspend";
import { WealthsimpleParser } from "../parsers/wealthsimple";
import { buildCategorisePrompt, parseCategoriseResponse, CategoriseResult } from "../lib/categorisePrompt";
import { toMerchantKey } from "../lib/merchantKey";
import { CsvParser, ParsedTransaction } from "../parsers/types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });
const travelspendParser = new TravelSpendParser();

const SUPPORTED_PARSERS: Record<string, CsvParser> = {
  travelspend: travelspendParser,
  wealthsimple: new WealthsimpleParser(),
};

const CREDIT_CARD_FORMATS = new Set(["wealthsimple"]);

const MAX_FILE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_ROWS = 10_000;

router.use(requireAuth);

/**
 * POST /api/uploads — parses an uploaded CSV and returns preview data.
 * Nothing is persisted at this stage; the client confirms via /confirm.
 */
router.post("/", upload.single("file"), async (req, res) => {
  const userId: string = res.locals.userId;

  if (!req.file) {
    res.status(400).json({ error: "file is required" });
    return;
  }

  const parserName: string = req.body?.parser;
  if (!parserName || !SUPPORTED_PARSERS[parserName]) {
    res.status(400).json({ error: `parser must be one of: ${Object.keys(SUPPORTED_PARSERS).join(", ")}` });
    return;
  }

  if (req.file.size > MAX_FILE_BYTES) {
    res.status(400).json({ error: "File exceeds 10 MB limit" });
    return;
  }

  const csvText = req.file.buffer.toString("utf-8");
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.data.length > MAX_ROWS) {
    res.status(400).json({ error: `File exceeds ${MAX_ROWS} row limit` });
    return;
  }

  const parser = SUPPORTED_PARSERS[parserName];
  const result = parser.parse(parsed.data, "", userId);

  // Check for date range overlap with existing transactions
  let overlapWarning = false;
  if (result.transactions.length > 0) {
    const { from, to } = result.dateRange;
    const overlap = await pool.query(
      `SELECT 1 FROM transactions
       WHERE user_id = $1
         AND date <= $2
         AND date >= $3
       LIMIT 1`,
      [userId, to.toISOString(), from.toISOString()]
    );
    overlapWarning = (overlap.rowCount ?? 0) > 0;
  }

  res.json({
    transactions: result.transactions.map(serializeTransaction),
    travellers: result.travellers,
    categories: result.categories,
    errors: result.errors,
    homeCurrency: result.homeCurrency,
    dateRange: {
      from: result.dateRange.from.toISOString(),
      to: result.dateRange.to.toISOString(),
    },
    overlapWarning,
    ...(result.skippedPayments ? { skippedPayments: result.skippedPayments } : {}),
  });
});

/**
 * POST /api/uploads/categorise — calls Claude to suggest categories for a
 * batch of transactions. Falls back gracefully if the AI is unavailable.
 */
router.post("/categorise", async (req, res) => {
  const userId: string = res.locals.userId;

  const { transactions } = req.body as {
    transactions: { description: string; country: string | null }[];
  };

  if (!Array.isArray(transactions) || transactions.length === 0) {
    res.status(400).json({ error: "transactions must be a non-empty array" });
    return;
  }

  // Build merchant keys and check the cache for previously categorised merchants
  const merchantKeys = transactions.map((tx) => toMerchantKey(tx.description));
  const { rows: cacheRows } = await pool.query<{ merchant_key: string; category_name: string }>(
    `SELECT ccm.merchant_key, c.name AS category_name
     FROM credit_card_category_mappings ccm
     JOIN categories c ON c.id = ccm.category_id
     WHERE ccm.user_id = $1 AND ccm.merchant_key = ANY($2)`,
    [userId, merchantKeys]
  );
  const cacheByKey = new Map(cacheRows.map((r) => [r.merchant_key, r.category_name]));

  // Partition into cache hits and transactions that need AI categorisation
  const uncachedIndices: number[] = [];
  const uncachedTransactions: typeof transactions = [];
  for (let i = 0; i < transactions.length; i++) {
    if (!cacheByKey.has(merchantKeys[i])) {
      uncachedIndices.push(i);
      uncachedTransactions.push(transactions[i]);
    }
  }

  // Pre-fill results with cache hits
  const results: CategoriseResult[] = transactions.map((_, i) => {
    const cached = cacheByKey.get(merchantKeys[i]);
    return cached
      ? { categoryName: cached, confidence: 1, source: "cache" }
      : { categoryName: "Uncategorized", confidence: 0, source: "ai" };
  });

  if (uncachedTransactions.length === 0) {
    res.json({ results });
    return;
  }

  // Fetch the user's existing category names to give the model context
  const { rows: catRows } = await pool.query<{ name: string }>(
    "SELECT name FROM categories WHERE user_id = $1 ORDER BY name",
    [userId]
  );
  const availableCategories = catRows.map((r) => r.name);

  const prompt = buildCategorisePrompt(uncachedTransactions, availableCategories);

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              categoryName: { type: "string" },
              confidence: { type: "number" },
            },
            required: ["categoryName", "confidence"],
          },
        },
      },
    });

    const aiResults = parseCategoriseResponse(response.text ?? "", uncachedTransactions.length);
    for (let i = 0; i < uncachedIndices.length; i++) {
      // Cap AI confidence at 0.99 so they are always shown in the review table.
      // 1.0 is reserved for true database cache hits.
      if (aiResults[i].confidence >= 1) {
        aiResults[i].confidence = 0.99;
      }
      results[uncachedIndices[i]] = aiResults[i];
    }
    res.json({ results });
  } catch (err) {
    // Degrade gracefully — the client can let the user categorise manually
    console.error("AI categorisation error:", err);
    for (const idx of uncachedIndices) {
      results[idx] = { categoryName: "Uncategorized", confidence: 0, source: "ai" };
    }
    res.json({ results });
  }
});

/**
 * POST /api/uploads/confirm — persists a confirmed upload in a single DB transaction.
 * Inserts into uploads, travellers, transactions, and transaction_splits.
 */
router.post("/confirm", async (req, res) => {
  const userId: string = res.locals.userId;

  const {
    homeCurrency,
    sourceFormat,
    filename,
    primaryGroupId,
    transactions,
    travellers,
  } = req.body as {
    homeCurrency: string;
    sourceFormat: string;
    filename: string;
    primaryGroupId: string;
    transactions: Array<{
      date: string;
      description: string;
      amountHome: number;
      amountLocal: number | null;
      localCurrency: string | null;
      categoryName?: string | null;
      categoryId?: string | null;
      categorySource: "csv" | "ai" | "user" | null;
      categoryConfidence: number | null;
      paymentMethod: string | null;
      country: string | null;
      payer: string | null;
      sourceFormat: string;
      raw: Record<string, string>;
      splits: { travellerName: string; amountHome: number }[];
      groupId: string;
    }>;
    travellers: string[];
  };

  if (!homeCurrency || !sourceFormat || !filename || !Array.isArray(transactions)) {
    res.status(400).json({ error: "homeCurrency, sourceFormat, filename, and transactions are required" });
    return;
  }
  if (!primaryGroupId) {
    res.status(400).json({ error: "primaryGroupId is required" });
    return;
  }

  // Validate all group IDs belong to this user
  const groupIds = [...new Set([primaryGroupId, ...transactions.map((t) => t.groupId).filter(Boolean)])];
  const { rows: groupRows } = await pool.query<{ id: string }>(
    `SELECT id FROM groups WHERE id = ANY($1) AND user_id = $2`,
    [groupIds, userId]
  );
  if (groupRows.length !== groupIds.length) {
    res.status(400).json({ error: "One or more group IDs are invalid" });
    return;
  }

  // Resolve category names to IDs for transactions that carry a name but no ID
  const categoryNames = [
    ...new Set(
      transactions
        .filter((t) => !t.categoryId && t.categoryName)
        .map((t) => t.categoryName as string)
    ),
  ];

  const categoryIdByName = new Map<string, string>();
  if (categoryNames.length > 0) {
    const { rows } = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM categories WHERE user_id = $1 AND name = ANY($2)`,
      [userId, categoryNames]
    );
    for (const row of rows) {
      categoryIdByName.set(row.name, row.id);
    }
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Create the upload record
    const uploadResult = await client.query<{ id: string }>(
      `INSERT INTO uploads (id, user_id, uploaded_at, filename, source_format, home_currency, group_id)
       VALUES (gen_random_uuid(), $1, NOW(), $2, $3, $4, $5)
       RETURNING id`,
      [userId, filename, sourceFormat, homeCurrency, primaryGroupId]
    );
    const uploadId = uploadResult.rows[0].id;

    // Insert travellers
    for (const name of (travellers ?? [])) {
      await client.query(
        `INSERT INTO travellers (id, upload_id, user_id, name)
         VALUES (gen_random_uuid(), $1, $2, $3)`,
        [uploadId, userId, name]
      );
    }

    // Insert transactions and their splits
    const merchantMappings: { merchantKey: string; categoryId: string }[] = [];
    for (const tx of transactions) {
      const resolvedCategoryId = tx.categoryId ?? (tx.categoryName ? categoryIdByName.get(tx.categoryName) ?? null : null);
      const txResult = await client.query<{ id: string }>(
        `INSERT INTO transactions (
           id, upload_id, user_id, date, description,
           amount_home, amount_local, local_currency,
           category_id, category_source, category_confidence,
           payment_method, country, payer, source_format, raw, group_id
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4,
           $5, $6, $7,
           $8, $9, $10,
           $11, $12, $13, $14, $15, $16
         ) RETURNING id`,
        [
          uploadId, userId, tx.date, tx.description,
          tx.amountHome, tx.amountLocal ?? null, tx.localCurrency ?? null,
          resolvedCategoryId,
          tx.categorySource ?? null, tx.categoryConfidence ?? null,
          tx.paymentMethod ?? null, tx.country ?? null, tx.payer ?? null,
          tx.sourceFormat, JSON.stringify(tx.raw), tx.groupId ?? primaryGroupId,
        ]
      );
      const txId = txResult.rows[0].id;

      for (const split of (tx.splits ?? [])) {
        await client.query(
          `INSERT INTO transaction_splits (id, transaction_id, traveller_name, amount_home)
           VALUES (gen_random_uuid(), $1, $2, $3)`,
          [txId, split.travellerName, split.amountHome]
        );
      }

      if (CREDIT_CARD_FORMATS.has(tx.sourceFormat) && resolvedCategoryId) {
        merchantMappings.push({ merchantKey: toMerchantKey(tx.description), categoryId: resolvedCategoryId });
      }
    }

    if (merchantMappings.length > 0) {
      // Deduplicate mappings by merchantKey to avoid Postgres error:
      // "ON CONFLICT DO UPDATE command cannot affect row a second time"
      const uniqueMappings = Array.from(
        merchantMappings
          .reduce((map, m) => map.set(m.merchantKey, m.categoryId), new Map<string, string>())
          .entries()
      );

      await client.query(
        `INSERT INTO credit_card_category_mappings (user_id, merchant_key, category_id, updated_at)
         SELECT $1, unnest($2::text[]), unnest($3::uuid[]), now()
         ON CONFLICT (user_id, merchant_key)
         DO UPDATE SET category_id = EXCLUDED.category_id, updated_at = EXCLUDED.updated_at`,
        [
          userId,
          uniqueMappings.map(([key]) => key),
          uniqueMappings.map(([, id]) => id),
        ]
      );
    }

    await client.query("COMMIT");
    res.json({ uploadId });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/uploads/confirm error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

/** Converts a ParsedTransaction date to an ISO string for JSON serialisation. */
function serializeTransaction(t: ParsedTransaction): Record<string, unknown> {
  return {
    ...t,
    date: t.date instanceof Date ? t.date.toISOString() : t.date,
  };
}

export default router;
