/** Budget routes: list, bulk-save, delete, and summarize per-category monthly budget amounts. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { parseBudgetsBody } from "../lib/budgetValidation";

export function mapBudgetMonthlyRow(r: {
  month: string;
  category_id: string;
  category_name: string;
  actual: string;
}) {
  return {
    month: r.month,
    categoryId: r.category_id,
    categoryName: r.category_name,
    actual: parseFloat(r.actual),
  };
}

export function mapBudgetCategoryRow(r: {
  category_id: string;
  category_name: string;
  parent_id: string | null;
  parent_name: string | null;
  monthly_amount: string;
}) {
  return {
    categoryId: r.category_id,
    categoryName: r.category_name,
    parentId: r.parent_id,
    parentName: r.parent_name,
    monthlyAmount: parseFloat(r.monthly_amount),
  };
}

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

/**
 * GET /api/budgets/summary — budgeted categories with their monthly amounts,
 * plus actual monthly spend per category scoped to the group chosen in
 * budget_settings. Query params: from, to (optional date range on transactions).
 */
router.get("/summary", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to } = req.query as Record<string, string | undefined>;

  try {
    const { rows: settingsRows } = await pool.query<{ group_id: string; group_name: string }>(
      `SELECT bs.group_id, g.name AS group_name
       FROM budget_settings bs
       JOIN groups g ON g.id = bs.group_id
       WHERE bs.user_id = $1`,
      [userId]
    );
    const settings = settingsRows[0];
    if (!settings) {
      res.status(404).json({ error: "Budget settings not configured" });
      return;
    }

    const { rows: budgetRows } = await pool.query<{
      category_id: string;
      category_name: string;
      parent_id: string | null;
      parent_name: string | null;
      monthly_amount: string;
    }>(
      `SELECT b.category_id, c.name AS category_name, c.parent_id, p.name AS parent_name, b.monthly_amount
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN categories p ON p.id = c.parent_id
       WHERE b.user_id = $1
       ORDER BY c.name`,
      [userId]
    );

    const categories = budgetRows.map(mapBudgetCategoryRow);
    const totalMonthlyBudget = categories.reduce((sum, c) => sum + c.monthlyAmount, 0);

    if (categories.length === 0) {
      res.json({ groupId: settings.group_id, groupName: settings.group_name, totalMonthlyBudget: 0, categories: [], monthly: [] });
      return;
    }

    const categoryIds = categories.map((c) => c.categoryId);
    const conditions: string[] = ["t.user_id = $1", "t.group_id = $2", "t.category_id = ANY($3)"];
    const values: unknown[] = [userId, settings.group_id, categoryIds];

    const addParam = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (from) conditions.push(`t.date >= ${addParam(from)}`);
    if (to) conditions.push(`t.date <= ${addParam(to)}`);

    const { rows: monthlyRows } = await pool.query<{
      month: string;
      category_id: string;
      category_name: string;
      actual: string;
    }>(
      `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month,
              t.category_id,
              c.name AS category_name,
              SUM(t.amount_home) AS actual
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE ${conditions.join(" AND ")}
       GROUP BY month, t.category_id, c.name
       ORDER BY month, c.name`,
      values
    );

    res.json({
      groupId: settings.group_id,
      groupName: settings.group_name,
      totalMonthlyBudget,
      categories,
      monthly: monthlyRows.map(mapBudgetMonthlyRow),
    });
  } catch (err) {
    console.error("GET /api/budgets/summary error:", err);
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

/** DELETE /api/budgets/:categoryId — removes a single per-category budget. */
router.delete("/:categoryId", async (req, res) => {
  const userId: string = res.locals.userId;
  const { categoryId } = req.params;
  try {
    await pool.query("DELETE FROM budgets WHERE user_id = $1 AND category_id = $2", [
      userId,
      categoryId,
    ]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/budgets/:categoryId error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
