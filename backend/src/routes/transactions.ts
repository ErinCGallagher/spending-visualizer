/** Transaction query, filter, and delete routes. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { parseTransactionQuery } from "../lib/queryParams";
import { buildTransactionFilterSQL, buildGroupsMetaSQL } from "../lib/transactionQuery";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/transactions — paginated list with optional filters.
 * Supports: from, to, category (uuid), paymentMethod, traveller, page, limit.
 */
router.get("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { params, errors } = parseTransactionQuery(req.query as Record<string, unknown>);

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const { from, to, category, paymentMethod, traveller, groupId, groupType, search, page, limit } = params;

  const { joins, conditions, values } = buildTransactionFilterSQL(userId, {
    from, to, category, paymentMethod, traveller, groupId, groupType, search,
  });

  const filterJoins = [...new Set(joins)].join("\n");
  const where = conditions.join(" AND ");
  const offset = (page - 1) * limit;

  try {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM transactions t
       ${filterJoins}
       WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Add pagination params after count query so they don't affect the WHERE clause
    values.push(limit, offset);
    const limitParam = `$${values.length - 1}`;
    const offsetParam = `$${values.length}`;

    const { rows } = await pool.query(
      `SELECT
         t.id,
         t.date,
         t.description,
         t.amount_home    AS "amountHome",
         t.amount_local   AS "amountLocal",
         t.local_currency AS "localCurrency",
         t.category_id    AS "categoryId",
         COALESCE(p.name, c.name) AS "parentCategoryName",
         CASE WHEN p.name IS NOT NULL THEN c.name ELSE NULL END AS "subCategoryName",
         t.category_source AS "categorySource",
         t.payment_method  AS "paymentMethod",
         t.country,
         t.payer,
         u.home_currency  AS "homeCurrency",
         g.name           AS "groupName",
         g.group_type     AS "groupType"
       FROM transactions t
       ${[...new Set([
         ...joins,
         "LEFT JOIN categories c ON c.id = t.category_id",
         "LEFT JOIN categories p ON p.id = c.parent_id",
         "LEFT JOIN uploads u ON u.id = t.upload_id",
         "LEFT JOIN groups g ON g.id = t.group_id"
       ])].join("\n")}
       WHERE ${where}
       ORDER BY t.date DESC, t.id
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values
    );

    res.json({ transactions: rows, total, page, limit });
  } catch (err) {
    console.error("GET /api/transactions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/transactions/meta — distinct filter values for the authenticated user.
 * Used to populate filter dropdowns in the UI.
 */
router.get("/meta", async (_req, res) => {
  const userId: string = res.locals.userId;

  try {
    const [catResult, travellerResult, pmResult, countryResult, dateResult, groupResult, currencyResult] = await Promise.all([
      pool.query<{ id: string; name: string }>(
        `SELECT DISTINCT c.id, c.name
         FROM transactions t
         JOIN categories c ON c.id = t.category_id
         WHERE t.user_id = $1
         ORDER BY c.name`,
        [userId]
      ),
      pool.query<{ payer: string }>(
        `SELECT DISTINCT payer
         FROM transactions
         WHERE user_id = $1 AND payer IS NOT NULL
         ORDER BY payer`,
        [userId]
      ),
      pool.query<{ payment_method: string }>(
        `SELECT DISTINCT payment_method
         FROM transactions
         WHERE user_id = $1 AND payment_method IS NOT NULL
         ORDER BY payment_method`,
        [userId]
      ),
      pool.query<{ country: string }>(
        `SELECT DISTINCT country
         FROM transactions
         WHERE user_id = $1 AND country IS NOT NULL
         ORDER BY country`,
        [userId]
      ),
      pool.query<{ min_date: string | null; max_date: string | null }>(
        `SELECT MIN(date)::text AS min_date, MAX(date)::text AS max_date
         FROM transactions
         WHERE user_id = $1`,
        [userId]
      ),
      pool.query<{ id: string; name: string; groupType: string }>(buildGroupsMetaSQL(), [userId]),
      pool.query<{ home_currency: string }>(
        `SELECT home_currency FROM uploads WHERE user_id = $1 ORDER BY uploaded_at DESC LIMIT 1`,
        [userId]
      ),
    ]);

    const dateRow = dateResult.rows[0];
    const dateRange =
      dateRow.min_date && dateRow.max_date
        ? { from: dateRow.min_date, to: dateRow.max_date }
        : null;

    res.json({
      categories: catResult.rows.map((r) => ({ id: r.id, name: r.name })),
      travellers: travellerResult.rows.map((r) => r.payer),
      paymentMethods: pmResult.rows.map((r) => r.payment_method),
      countries: countryResult.rows.map((r) => r.country),
      dateRange,
      groups: groupResult.rows,
      homeCurrency: currencyResult.rows[0]?.home_currency ?? null,
    });
  } catch (err) {
    console.error("GET /api/transactions/meta error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/transactions — deletes transactions by date range or by group.
 * Supply either { from, to } or { groupId }. Cascade handles transaction_splits.
 */
router.delete("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, groupId } = req.body as { from?: string; to?: string; groupId?: string };

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (groupId !== undefined) {
    if (!UUID_RE.test(groupId)) {
      res.status(400).json({ error: "groupId must be a valid UUID" });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      const txResult = await client.query(
        `DELETE FROM transactions WHERE user_id = $1 AND group_id = $2`,
        [userId, groupId]
      );

      const { rows } = await client.query<{ count: string }>(
        `SELECT COUNT(*) AS count FROM transactions WHERE group_id = $1`,
        [groupId]
      );
      if (parseInt(rows[0].count, 10) === 0) {
        // Clear the FK on uploads before removing the group
        await client.query(
          `UPDATE uploads SET group_id = NULL WHERE group_id = $1 AND user_id = $2`,
          [groupId, userId]
        );
        await client.query(
          `DELETE FROM groups WHERE id = $1 AND user_id = $2`,
          [groupId, userId]
        );
      }

      await client.query("COMMIT");
      res.json({ deleted: txResult.rowCount ?? 0 });
    } catch (err) {
      await client.query("ROLLBACK");
      console.error("DELETE /api/transactions error:", err);
      res.status(500).json({ error: "Internal server error" });
    } finally {
      client.release();
    }
    return;
  }

  if (!from || !to) {
    res.status(400).json({ error: "from and to dates are required" });
    return;
  }

  try {
    const result = await pool.query(
      `DELETE FROM transactions
       WHERE user_id = $1 AND date >= $2 AND date <= $3`,
      [userId, from, to]
    );
    res.json({ deleted: result.rowCount ?? 0 });
  } catch (err) {
    console.error("DELETE /api/transactions error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
