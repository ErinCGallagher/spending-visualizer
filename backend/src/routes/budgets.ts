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

/** Income transactions are stored negative (inflow), so negate to get a positive actual. */
export function mapIncomeMonthlyRow(r: {
  month: string;
  category_id: string;
  category_name: string;
  actual: string;
}) {
  return {
    month: r.month,
    categoryId: r.category_id,
    categoryName: r.category_name,
    actual: -parseFloat(r.actual),
  };
}

export function mapUnbudgetedMonthlyRow(r: { month: string; actual: string }) {
  return {
    month: r.month,
    actual: parseFloat(r.actual),
  };
}

export function mapPensionMonthlyRow(r: { month: string; amount: string }) {
  return {
    month: r.month,
    amount: parseFloat(r.amount),
  };
}

/**
 * Excludes any category in the Income tree from a budgeted-category list.
 * A budget set directly on Income (or a child) should surface as income, not
 * as a spend category, even though nothing stops a user from budgeting it.
 */
export function excludeIncomeCategories<T extends { categoryId: string }>(
  categories: T[],
  incomeCategoryIds: string[]
): T[] {
  return categories.filter((c) => !incomeCategoryIds.includes(c.categoryId));
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

    const { rows: incomeParentRows } = await pool.query<{ id: string }>(
      `SELECT id FROM categories WHERE user_id = $1 AND name = 'Income' AND parent_id IS NULL`,
      [userId]
    );
    const incomeParentId = incomeParentRows[0]?.id ?? null;
    let incomeCategoryIds: string[] = [];
    if (incomeParentId) {
      const { rows: incomeChildRows } = await pool.query<{ id: string }>(
        `SELECT id FROM categories WHERE user_id = $1 AND parent_id = $2`,
        [userId, incomeParentId]
      );
      incomeCategoryIds = [incomeParentId, ...incomeChildRows.map((r) => r.id)];
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

    const categories = excludeIncomeCategories(budgetRows.map(mapBudgetCategoryRow), incomeCategoryIds);
    const totalMonthlyBudget = categories.reduce((sum, c) => sum + c.monthlyAmount, 0);

    const pensionConditions: string[] = ["user_id = $1"];
    const pensionValues: unknown[] = [userId];
    const addPensionParam = (value: unknown): string => {
      pensionValues.push(value);
      return `$${pensionValues.length}`;
    };
    if (from) pensionConditions.push(`make_date(year, month, 1) >= ${addPensionParam(from)}`);
    if (to) pensionConditions.push(`make_date(year, month, 1) <= ${addPensionParam(to)}`);

    const { rows: pensionRows } = await pool.query<{ month: string; amount: string }>(
      `SELECT TO_CHAR(make_date(year, month, 1), 'YYYY-MM') AS month, amount
       FROM pension_contributions
       WHERE ${pensionConditions.join(" AND ")}
       ORDER BY year, month`,
      pensionValues
    );
    const pensionMonthly = pensionRows.map(mapPensionMonthlyRow);

    if (categories.length === 0) {
      res.json({
        groupId: settings.group_id,
        groupName: settings.group_name,
        totalMonthlyBudget: 0,
        categories: [],
        monthly: [],
        incomeMonthly: [],
        unbudgetedMonthly: [],
        pensionMonthly,
      });
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

    let incomeMonthly: ReturnType<typeof mapIncomeMonthlyRow>[] = [];
    if (incomeCategoryIds.length > 0) {
      const incomeConditions: string[] = ["t.user_id = $1", "t.group_id = $2", "t.category_id = ANY($3)"];
      const incomeValues: unknown[] = [userId, settings.group_id, incomeCategoryIds];
      const addIncomeParam = (value: unknown): string => {
        incomeValues.push(value);
        return `$${incomeValues.length}`;
      };
      if (from) incomeConditions.push(`t.date >= ${addIncomeParam(from)}`);
      if (to) incomeConditions.push(`t.date <= ${addIncomeParam(to)}`);

      const { rows: incomeRows } = await pool.query<{
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
         WHERE ${incomeConditions.join(" AND ")}
         GROUP BY month, t.category_id, c.name
         ORDER BY month, c.name`,
        incomeValues
      );
      incomeMonthly = incomeRows.map(mapIncomeMonthlyRow);
    }

    const excludedIds = [...categoryIds, ...incomeCategoryIds];
    const unbudgetedConditions: string[] = [
      "t.user_id = $1",
      "t.group_id = $2",
      "(t.category_id IS NULL OR t.category_id <> ALL($3))",
    ];
    const unbudgetedValues: unknown[] = [userId, settings.group_id, excludedIds];
    const addUnbudgetedParam = (value: unknown): string => {
      unbudgetedValues.push(value);
      return `$${unbudgetedValues.length}`;
    };
    if (from) unbudgetedConditions.push(`t.date >= ${addUnbudgetedParam(from)}`);
    if (to) unbudgetedConditions.push(`t.date <= ${addUnbudgetedParam(to)}`);

    const { rows: unbudgetedRows } = await pool.query<{ month: string; actual: string }>(
      `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month, SUM(t.amount_home) AS actual
       FROM transactions t
       WHERE ${unbudgetedConditions.join(" AND ")}
       GROUP BY month
       ORDER BY month`,
      unbudgetedValues
    );

    res.json({
      groupId: settings.group_id,
      groupName: settings.group_name,
      totalMonthlyBudget,
      categories,
      monthly: monthlyRows.map(mapBudgetMonthlyRow),
      incomeMonthly,
      unbudgetedMonthly: unbudgetedRows.map(mapUnbudgetedMonthlyRow),
      pensionMonthly,
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
