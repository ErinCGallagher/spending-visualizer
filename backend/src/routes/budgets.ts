/** Budget routes: list and bulk-save per-category monthly budget amounts. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { parseBudgetsBody } from "../lib/budgetValidation";

const router = Router();
router.use(requireAuth);

/** GET /api/budgets — all per-category monthly budgets for the authenticated user. */
router.get("/", async (_req, res) => {
  const userId: string = res.locals.userId;
  try {
    const { rows } = await pool.query(
      `SELECT category_id AS "categoryId", monthly_amount AS "monthlyAmount"
       FROM budgets
       WHERE user_id = $1
       ORDER BY category_id`,
      [userId]
    );
    res.json({ budgets: rows });
  } catch (err) {
    console.error("GET /api/budgets error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/budgets — bulk upsert of per-category monthly budget amounts. */
router.post("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { budgets, errors } = parseBudgetsBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const b of budgets) {
      await client.query(
        `INSERT INTO budgets (id, user_id, category_id, monthly_amount)
         VALUES (gen_random_uuid(), $1, $2, $3)
         ON CONFLICT (user_id, category_id)
         DO UPDATE SET monthly_amount = EXCLUDED.monthly_amount, updated_at = now()`,
        [userId, b.categoryId, b.monthlyAmount]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/budgets error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  } finally {
    client.release();
  }

  const { rows } = await pool.query(
    `SELECT category_id AS "categoryId", monthly_amount AS "monthlyAmount"
     FROM budgets
     WHERE user_id = $1
     ORDER BY category_id`,
    [userId]
  );
  res.status(201).json({ budgets: rows });
});

export default router;
