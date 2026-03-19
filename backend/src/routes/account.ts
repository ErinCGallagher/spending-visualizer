/** Account management routes (delete account). */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";

const router = Router();

router.use(requireAuth);

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
