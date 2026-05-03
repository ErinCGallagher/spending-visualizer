/** Account management routes (delete account). */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { VALID_GROUP_TYPE_VALUES, GROUP_TYPE_OPTIONS } from "../lib/queryParams";

const router = Router();

router.use(requireAuth);

/** GET /api/account/settings — returns user settings. */
router.get("/settings", async (_req, res) => {
  const userId: string = res.locals.userId;
  try {
    const { rows } = await pool.query(
      `SELECT overview_default_filter AS "overviewDefaultFilter",
              trip_default_filter AS "tripDefaultFilter"
       FROM "user"
       WHERE id = $1`,
      [userId]
    );
    const row = rows[0] || { overviewDefaultFilter: null, tripDefaultFilter: null };
    res.json({ ...row, groupTypes: GROUP_TYPE_OPTIONS });
  } catch (err) {
    console.error("GET /api/account/settings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PATCH /api/account/settings — updates user settings. */
router.patch("/settings", async (req, res) => {
  const userId: string = res.locals.userId;
  const updates = req.body as Record<string, unknown>;

  const allowedUpdates = ["overviewDefaultFilter", "tripDefaultFilter"];
  const dbFields: Record<string, string> = {
    overviewDefaultFilter: "overview_default_filter",
    tripDefaultFilter: "trip_default_filter"
  };

  const fieldsToUpdate = Object.keys(updates).filter(k => allowedUpdates.includes(k));
  if (fieldsToUpdate.length === 0) {
    res.status(400).json({ error: "No valid fields provided" });
    return;
  }

  // Empty string means "clear the preference" — treat as null
  const values: (string | null)[] = fieldsToUpdate.map(k => {
    const v = updates[k];
    return typeof v === "string" && v !== "" ? v : null;
  });
  const invalidField = fieldsToUpdate.find((k, i) => {
    const v = values[i];
    return v !== null && !(VALID_GROUP_TYPE_VALUES as readonly string[]).includes(v);
  });
  if (invalidField) {
    res.status(400).json({ error: `Invalid value for ${invalidField}. Must be one of: ${VALID_GROUP_TYPE_VALUES.join(", ")}` });
    return;
  }

  const sets = fieldsToUpdate.map((k, i) => `${dbFields[k]} = $${i + 1}`);
  values.push(userId);

  try {
    await pool.query(
      `UPDATE "user" SET ${sets.join(", ")} WHERE id = $${values.length}`,
      values
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/account/settings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/account/settings/parsers — returns parser settings (e.g. card mappings). */
router.get("/settings/parsers", async (_req, res) => {
  const userId: string = res.locals.userId;
  try {
    const { rows } = await pool.query(
      `SELECT id, parser_type AS "parserType", setting_key AS "settingKey", setting_value AS "settingValue"
       FROM parser_settings
       WHERE user_id = $1
       ORDER BY parser_type, setting_key`,
      [userId]
    );
    res.json({ settings: rows });
  } catch (err) {
    console.error("GET /api/account/settings/parsers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/account/settings/parsers — upserts a parser setting. */
router.post("/settings/parsers", async (req, res) => {
  const userId: string = res.locals.userId;
  const { parserType, settingKey, settingValue } = req.body as {
    parserType: string;
    settingKey: string;
    settingValue: string;
  };

  if (!parserType || !settingKey || !settingValue) {
    res.status(400).json({ error: "parserType, settingKey, and settingValue are required" });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO parser_settings (user_id, parser_type, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (user_id, parser_type, setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()
       RETURNING id`,
      [userId, parserType, settingKey, settingValue]
    );
    res.json({ id: rows[0].id });
  } catch (err) {
    console.error("POST /api/account/settings/parsers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/account/settings/parsers/:id — deletes a parser setting. */
router.delete("/settings/parsers/:id", async (req, res) => {
  const userId: string = res.locals.userId;
  const { id } = req.params;

  try {
    await pool.query(
      "DELETE FROM parser_settings WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/account/settings/parsers error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/account — deletes the authenticated user's account and all
 * associated data. Categories are deleted first (not FK-cascaded from uploads),
 * then uploads (which cascade to transactions, travellers, transaction_splits),
 * then the BetterAuth user record (which cascades to session and account).
 */
router.delete("/", async (_req, res) => {
  const userId: string = res.locals.userId;
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    await client.query("DELETE FROM categories WHERE user_id = $1", [userId]);
    await client.query("DELETE FROM uploads WHERE user_id = $1", [userId]);
    await client.query(`DELETE FROM "user" WHERE id = $1`, [userId]);

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("DELETE /api/account error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
