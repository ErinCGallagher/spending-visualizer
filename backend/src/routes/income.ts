/** Income routes: ensure the "Income" top-level category exists and list its children. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";

const router = Router();
router.use(requireAuth);

/**
 * GET /api/income — ensures the "Income" top-level category exists for the
 * authenticated user, then returns it with its child categories. Idempotent:
 * safe to call on every load, relies on idx_categories_user_name_top_level.
 */
router.get("/", async (_req, res) => {
  const userId: string = res.locals.userId;

  try {
    await pool.query(
      `INSERT INTO categories (id, user_id, name, parent_id)
       VALUES (gen_random_uuid(), $1, 'Income', NULL)
       ON CONFLICT (user_id, name) WHERE parent_id IS NULL DO NOTHING`,
      [userId]
    );

    const { rows: parentRows } = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM categories WHERE user_id = $1 AND name = 'Income' AND parent_id IS NULL`,
      [userId]
    );
    const parent = parentRows[0];

    const { rows: children } = await pool.query<{ id: string; name: string }>(
      `SELECT id, name FROM categories WHERE user_id = $1 AND parent_id = $2 ORDER BY name`,
      [userId, parent.id]
    );

    res.json({ parent, children });
  } catch (err) {
    console.error("GET /api/income error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
