/** Chart data aggregation routes. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { validateGroupTypes } from "../lib/queryParams";

/**
 * The reserved top-level category name for income. Income transactions carry the
 * opposite sign to expenses, so they must be kept out of spending charts — otherwise
 * they net against spending and drag totals negative.
 */
export const INCOME_CATEGORY = "Income";

/**
 * Drops the Income category (top-level or rolled-up children) from category-grouped
 * rows so it is not counted as spending.
 */
export function excludeIncomeRows<T extends { category: string }>(rows: T[]): T[] {
  return rows.filter((r) => r.category !== INCOME_CATEGORY);
}

/**
 * Sums the Income category from category-grouped rows and returns it as a positive
 * amount. Income is stored with the opposite sign to expenses, so the raw total is
 * negative; this negates it so callers can display "total income" directly.
 */
export function extractIncomeTotal<T extends { category: string; total: number }>(rows: T[]): number {
  const income = rows.find((r) => r.category === INCOME_CATEGORY);
  return income ? -income.total : 0;
}

/**
 * SQL predicate (takes no parameters) that keeps a transaction out of spending charts
 * when it belongs to the Income category tree — the reserved top-level "Income"
 * category or any of its children. Income carries the opposite sign to expenses, so
 * leaving it in nets against spending. Uncategorized transactions (category_id IS NULL)
 * are kept. Assumes the transactions table is aliased `t`.
 */
export const EXCLUDE_INCOME_SQL = `NOT EXISTS (
  SELECT 1 FROM categories ic
  LEFT JOIN categories ip ON ip.id = ic.parent_id
  WHERE ic.id = t.category_id
    AND (
      (ic.name = '${INCOME_CATEGORY}' AND ic.parent_id IS NULL)
      OR (ip.name = '${INCOME_CATEGORY}' AND ip.parent_id IS NULL)
    )
)`;

export function mapCountryTotalRow(r: { country: string; total: string; days: string; per_day: string | null }) {
  return {
    country: r.country,
    total: parseFloat(r.total),
    days: parseInt(r.days, 10),
    perDay: r.per_day != null ? parseFloat(r.per_day) : 0,
  };
}

const router = Router();

router.use(requireAuth);

/**
 * GET /api/charts/category-totals
 * Query params: from, to, traveller
 * When traveller is supplied, sums transaction_splits.amount_home for that traveller.
 * Otherwise sums transactions.amount_home.
 * Returns { categories, incomeTotal }: spending categories (income excluded) plus the
 * income total as a positive amount, so income is never counted as spending.
 */
router.get("/category-totals", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, traveller } = req.query as Record<string, string | undefined>;
  const countries = [req.query.country ?? []].flat().filter(Boolean) as string[];
  const groupTypes = [req.query.groupType ?? []].flat().filter(Boolean) as string[];
  const groupTypeError = validateGroupTypes(groupTypes);
  if (groupTypeError) {
    res.status(400).json({ error: groupTypeError });
    return;
  }
  const groupId = typeof req.query.groupId === "string" ? req.query.groupId : undefined;

  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];
  const joins: string[] = [];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (from) conditions.push(`t.date >= ${addParam(from)}`);
  if (to) conditions.push(`t.date <= ${addParam(to)}`);
  if (countries.length > 0) conditions.push(`t.country = ANY(${addParam(countries)})`);
  if (groupId) conditions.push(`t.group_id = ${addParam(groupId)}`);
  if (groupTypes.length > 0) {
    joins.push("JOIN groups g ON g.id = t.group_id");
    conditions.push(`g.group_type = ANY(${addParam(groupTypes)})`);
  }

  const where = conditions.join(" AND ");
  const joinClause = joins.join(" ");

  try {
    let rows: { category: string; total: number }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      const result = await pool.query<{ category: string; total: string }>(
        `SELECT category, SUM(total) AS total
         FROM (
           SELECT COALESCE(p.name, c.name, 'Uncategorized') AS category,
                  ts.amount_home AS total
           FROM transactions t
           JOIN transaction_splits ts
             ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
           ${joinClause}
           LEFT JOIN categories c ON c.id = t.category_id
           LEFT JOIN categories p ON p.id = c.parent_id
           WHERE ${where}
         ) sub
         GROUP BY category
         ORDER BY total DESC`,
        values
      );
      rows = result.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) }));
    } else {
      const result = await pool.query<{ category: string; total: string }>(
        `SELECT category, SUM(total) AS total
         FROM (
           SELECT COALESCE(p.name, c.name, 'Uncategorized') AS category,
                  t.amount_home AS total
           FROM transactions t
           ${joinClause}
           LEFT JOIN categories c ON c.id = t.category_id
           LEFT JOIN categories p ON p.id = c.parent_id
           WHERE ${where}
         ) sub
         GROUP BY category
         ORDER BY total DESC`,
        values
      );
      rows = result.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) }));
    }

    res.json({ categories: excludeIncomeRows(rows), incomeTotal: extractIncomeTotal(rows) });
  } catch (err) {
    console.error("GET /api/charts/category-totals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/charts/country-totals
 * Query params: from, to, traveller (single value)
 * Returns per-country aggregate: total spent, distinct days, spent/day.
 */
router.get("/country-totals", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, traveller } = req.query as Record<string, string | undefined>;

  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (from) conditions.push(`t.date >= ${addParam(from)}`);
  if (to) conditions.push(`t.date <= ${addParam(to)}`);

  const where = conditions.join(" AND ");

  try {
    let rows: { country: string; total: string; days: string; per_day: string }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      const result = await pool.query<{ country: string; total: string; days: string; per_day: string }>(
        `SELECT
           t.country,
           SUM(ts.amount_home)                          AS total,
           COUNT(DISTINCT t.date::date)                  AS days,
           SUM(ts.amount_home) / NULLIF(COUNT(DISTINCT t.date::date), 0) AS per_day
         FROM transactions t
         JOIN transaction_splits ts
           ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
         WHERE ${where}
         GROUP BY t.country
         ORDER BY total DESC`,
        values
      );
      rows = result.rows;
    } else {
      const result = await pool.query<{ country: string; total: string; days: string; per_day: string }>(
        `SELECT
           t.country,
           SUM(t.amount_home)                           AS total,
           COUNT(DISTINCT t.date::date)                  AS days,
           SUM(t.amount_home) / NULLIF(COUNT(DISTINCT t.date::date), 0) AS per_day
         FROM transactions t
         WHERE ${where}
         GROUP BY t.country
         ORDER BY total DESC`,
        values
      );
      rows = result.rows;
    }

    res.json(rows.map(mapCountryTotalRow));
  } catch (err) {
    console.error("GET /api/charts/country-totals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/charts/trip-totals
 * Query params: from, to, traveller (single value)
 * Returns per-trip aggregate for groups of type 'trip': total spent, distinct days, spent/day.
 */
router.get("/trip-totals", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, traveller } = req.query as Record<string, string | undefined>;

  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (from) conditions.push(`t.date >= ${addParam(from)}`);
  if (to) conditions.push(`t.date <= ${addParam(to)}`);

  const where = conditions.join(" AND ");

  try {
    let rows: { group_id: string; trip_name: string; total: string; days: string; per_day: string | null }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      const result = await pool.query<{ group_id: string; trip_name: string; total: string; days: string; per_day: string | null }>(
        `SELECT
           g.id AS group_id,
           g.name AS trip_name,
           SUM(ts.amount_home) AS total,
           COUNT(DISTINCT t.date::date) AS days,
           SUM(ts.amount_home) / NULLIF(COUNT(DISTINCT t.date::date), 0) AS per_day
         FROM transactions t
         JOIN groups g ON g.id = t.group_id AND g.group_type = 'trip'
         JOIN transaction_splits ts
           ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
         WHERE ${where}
         GROUP BY g.id, g.name
         ORDER BY total DESC`,
        values
      );
      rows = result.rows;
    } else {
      const result = await pool.query<{ group_id: string; trip_name: string; total: string; days: string; per_day: string | null }>(
        `SELECT
           g.id AS group_id,
           g.name AS trip_name,
           SUM(t.amount_home) AS total,
           COUNT(DISTINCT t.date::date) AS days,
           SUM(t.amount_home) / NULLIF(COUNT(DISTINCT t.date::date), 0) AS per_day
         FROM transactions t
         JOIN groups g ON g.id = t.group_id AND g.group_type = 'trip'
         WHERE ${where}
         GROUP BY g.id, g.name
         ORDER BY total DESC`,
        values
      );
      rows = result.rows;
    }

    res.json(
      rows.map((r) => ({
        groupId: r.group_id,
        tripName: r.trip_name,
        total: parseFloat(r.total),
        days: parseInt(r.days, 10),
        perDay: r.per_day != null ? parseFloat(r.per_day) : 0,
      }))
    );
  } catch (err) {
    console.error("GET /api/charts/trip-totals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/charts/monthly-totals
 * Query params: from, to, traveller, groupBy ("category" | "total", default "total")
 * Returns monthly aggregations optionally broken down by category.
 */
router.get("/monthly-totals", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, traveller, groupBy = "total", granularity = "month" } = req.query as Record<string, string | undefined>;
  const countries = [req.query.country ?? []].flat().filter(Boolean) as string[];
  const groupTypes = [req.query.groupType ?? []].flat().filter(Boolean) as string[];
  const groupTypeError = validateGroupTypes(groupTypes);
  if (groupTypeError) {
    res.status(400).json({ error: groupTypeError });
    return;
  }

  if (groupBy !== "category" && groupBy !== "total") {
    res.status(400).json({ error: "groupBy must be 'category' or 'total'" });
    return;
  }
  if (!["day", "week", "month"].includes(granularity)) {
    res.status(400).json({ error: "granularity must be 'day', 'week', or 'month'" });
    return;
  }

  // For month granularity keep the short YYYY-MM format; day/week use full dates.
  const dateExpr =
    granularity === "month"
      ? `TO_CHAR(t.date, 'YYYY-MM')`
      : `TO_CHAR(DATE_TRUNC('${granularity}', t.date), 'YYYY-MM-DD')`;

  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];
  const joins: string[] = [];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (from) conditions.push(`t.date >= ${addParam(from)}`);
  if (to) conditions.push(`t.date <= ${addParam(to)}`);
  if (countries.length > 0) conditions.push(`t.country = ANY(${addParam(countries)})`);
  if (groupTypes.length > 0) {
    joins.push("JOIN groups g ON g.id = t.group_id");
    conditions.push(`g.group_type = ANY(${addParam(groupTypes)})`);
  }

  conditions.push(EXCLUDE_INCOME_SQL);
  const where = conditions.join(" AND ");
  const joinClause = joins.join(" ");

  try {
    let rows: { month: string; category?: string; total: number }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      if (groupBy === "category") {
        const result = await pool.query<{ month: string; category: string; total: string }>(
          `SELECT month, category, SUM(total) AS total
           FROM (
             SELECT ${dateExpr} AS month,
                    COALESCE(p.name, c.name, 'Uncategorized') AS category,
                    ts.amount_home AS total
             FROM transactions t
             JOIN transaction_splits ts
               ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
             ${joinClause}
             LEFT JOIN categories c ON c.id = t.category_id
             LEFT JOIN categories p ON p.id = c.parent_id
             WHERE ${where}
           ) sub
           GROUP BY month, category
           ORDER BY month, category`,
          values
        );
        rows = result.rows.map((r) => ({
          month: r.month,
          category: r.category,
          total: parseFloat(r.total),
        }));
      } else {
        const result = await pool.query<{ month: string; total: string }>(
          `SELECT ${dateExpr} AS month,
                  SUM(ts.amount_home) AS total
           FROM transactions t
           JOIN transaction_splits ts
             ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
           ${joinClause}
           WHERE ${where}
           GROUP BY month
           ORDER BY month`,
          values
        );
        rows = result.rows.map((r) => ({ month: r.month, total: parseFloat(r.total) }));
      }
    } else if (groupBy === "category") {
      const result = await pool.query<{ month: string; category: string; total: string }>(
        `SELECT month, category, SUM(total) AS total
         FROM (
           SELECT ${dateExpr} AS month,
                  COALESCE(p.name, c.name, 'Uncategorized') AS category,
                  t.amount_home AS total
           FROM transactions t
           ${joinClause}
           LEFT JOIN categories c ON c.id = t.category_id
           LEFT JOIN categories p ON p.id = c.parent_id
           WHERE ${where}
         ) sub
         GROUP BY month, category
         ORDER BY month, category`,
        values
      );
      rows = result.rows.map((r) => ({
        month: r.month,
        category: r.category,
        total: parseFloat(r.total),
      }));
    } else {
      const result = await pool.query<{ month: string; total: string }>(
        `SELECT ${dateExpr} AS month,
                SUM(t.amount_home) AS total
         FROM transactions t
         ${joinClause}
         WHERE ${where}
         GROUP BY month
         ORDER BY month`,
        values
      );
      rows = result.rows.map((r) => ({ month: r.month, total: parseFloat(r.total) }));
    }

    res.json(rows);
  } catch (err) {
    console.error("GET /api/charts/monthly-totals error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/charts/cumulative
 * Query params: from, to, traveller, granularity ("day" | "week" | "month", default "day")
 * Uses a SQL window function for the running total.
 */
router.get("/cumulative", async (req, res) => {
  const userId: string = res.locals.userId;
  const { from, to, traveller, granularity = "day" } = req.query as Record<string, string | undefined>;
  const countries = [req.query.country ?? []].flat().filter(Boolean) as string[];
  const groupTypes = [req.query.groupType ?? []].flat().filter(Boolean) as string[];
  const groupTypeError = validateGroupTypes(groupTypes);
  if (groupTypeError) {
    res.status(400).json({ error: groupTypeError });
    return;
  }

  if (!["day", "week", "month"].includes(granularity)) {
    res.status(400).json({ error: "granularity must be 'day', 'week', or 'month'" });
    return;
  }

  // Map granularity to a Postgres date_trunc key
  const truncMap: Record<string, string> = { day: "day", week: "week", month: "month" };
  const trunc = truncMap[granularity];

  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];
  const joins: string[] = [];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (from) conditions.push(`t.date >= ${addParam(from)}`);
  if (to) conditions.push(`t.date <= ${addParam(to)}`);
  if (countries.length > 0) conditions.push(`t.country = ANY(${addParam(countries)})`);
  if (groupTypes.length > 0) {
    joins.push("JOIN groups g ON g.id = t.group_id");
    conditions.push(`g.group_type = ANY(${addParam(groupTypes)})`);
  }

  conditions.push(EXCLUDE_INCOME_SQL);
  const where = conditions.join(" AND ");
  const joinClause = joins.join(" ");

  try {
    let rows: { date: string; runningTotal: number }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      const result = await pool.query<{ date: string; running_total: string }>(
        `SELECT
           TO_CHAR(bucket, 'YYYY-MM-DD') AS date,
           SUM(period_total) OVER (ORDER BY bucket) AS running_total
         FROM (
           SELECT
             DATE_TRUNC('${trunc}', t.date) AS bucket,
             SUM(ts.amount_home) AS period_total
           FROM transactions t
           JOIN transaction_splits ts
             ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
           ${joinClause}
           WHERE ${where}
           GROUP BY bucket
         ) sub
         ORDER BY date`,
        values
      );
      rows = result.rows.map((r) => ({
        date: r.date,
        runningTotal: parseFloat(r.running_total),
      }));
    } else {
      const result = await pool.query<{ date: string; running_total: string }>(
        `SELECT
           TO_CHAR(bucket, 'YYYY-MM-DD') AS date,
           SUM(period_total) OVER (ORDER BY bucket) AS running_total
         FROM (
           SELECT
             DATE_TRUNC('${trunc}', t.date) AS bucket,
             SUM(t.amount_home) AS period_total
           FROM transactions t
           ${joinClause}
           WHERE ${where}
           GROUP BY bucket
         ) sub
         ORDER BY date`,
        values
      );
      rows = result.rows.map((r) => ({
        date: r.date,
        runningTotal: parseFloat(r.running_total),
      }));
    }

    res.json(rows);
  } catch (err) {
    console.error("GET /api/charts/cumulative error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
