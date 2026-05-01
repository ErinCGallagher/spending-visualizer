/** Account management routes (delete account). */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";

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
    res.json(rows[0] || { overviewDefaultFilter: null, tripDefaultFilter: null });
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
    res.json({ ok: true });
    return;
  }

  const sets = fieldsToUpdate.map((k, i) => `${dbFields[k]} = $${i + 1}`);
  const values = fieldsToUpdate.map(k => updates[k] || null);
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
