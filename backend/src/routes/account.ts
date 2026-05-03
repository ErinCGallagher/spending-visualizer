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
  const updates = req.body as Record<string, any>;
  
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

  const values = fieldsToUpdate.map(k => updates[k] || null);
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
