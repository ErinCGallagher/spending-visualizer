/** Chart data aggregation routes. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/charts/category-totals
 * Query params: from, to, traveller
 * When traveller is supplied, sums transaction_splits.amount_home for that traveller.
 * Otherwise sums transactions.amount_home.
 */
router.get("/category-totals", async (req, res) => {
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
    let rows: { category: string; total: number }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      const result = await pool.query<{ category: string; total: string }>(
        `SELECT COALESCE(c.name, 'Uncategorized') AS category,
                SUM(ts.amount_home) AS total
         FROM transactions t
         JOIN transaction_splits ts
           ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE ${where}
         GROUP BY c.name
         ORDER BY total DESC`,
        values
      );
      rows = result.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) }));
    } else {
      const result = await pool.query<{ category: string; total: string }>(
        `SELECT COALESCE(c.name, 'Uncategorized') AS category,
                SUM(t.amount_home) AS total
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE ${where}
         GROUP BY c.name
         ORDER BY total DESC`,
        values
      );
      rows = result.rows.map((r) => ({ category: r.category, total: parseFloat(r.total) }));
    }

    res.json(rows);
  } catch (err) {
    console.error("GET /api/charts/category-totals error:", err);
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
  const { from, to, traveller, groupBy = "total" } = req.query as Record<string, string | undefined>;

  if (groupBy !== "category" && groupBy !== "total") {
    res.status(400).json({ error: "groupBy must be 'category' or 'total'" });
    return;
  }

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
    let rows: { month: string; category?: string; total: number }[];

    if (traveller) {
      const travellerParam = addParam(traveller);
      if (groupBy === "category") {
        const result = await pool.query<{ month: string; category: string; total: string }>(
          `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month,
                  COALESCE(c.name, 'Uncategorized') AS category,
                  SUM(ts.amount_home) AS total
           FROM transactions t
           JOIN transaction_splits ts
             ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
           LEFT JOIN categories c ON c.id = t.category_id
           WHERE ${where}
           GROUP BY month, c.name
           ORDER BY month, c.name`,
          values
        );
        rows = result.rows.map((r) => ({
          month: r.month,
          category: r.category,
          total: parseFloat(r.total),
        }));
      } else {
        const result = await pool.query<{ month: string; total: string }>(
          `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month,
                  SUM(ts.amount_home) AS total
           FROM transactions t
           JOIN transaction_splits ts
             ON ts.transaction_id = t.id AND ts.traveller_name = ${travellerParam}
           WHERE ${where}
           GROUP BY month
           ORDER BY month`,
          values
        );
        rows = result.rows.map((r) => ({ month: r.month, total: parseFloat(r.total) }));
      }
    } else if (groupBy === "category") {
      const result = await pool.query<{ month: string; category: string; total: string }>(
        `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month,
                COALESCE(c.name, 'Uncategorized') AS category,
                SUM(t.amount_home) AS total
         FROM transactions t
         LEFT JOIN categories c ON c.id = t.category_id
         WHERE ${where}
         GROUP BY month, c.name
         ORDER BY month, c.name`,
        values
      );
      rows = result.rows.map((r) => ({
        month: r.month,
        category: r.category,
        total: parseFloat(r.total),
      }));
    } else {
      const result = await pool.query<{ month: string; total: string }>(
        `SELECT TO_CHAR(t.date, 'YYYY-MM') AS month,
                SUM(t.amount_home) AS total
         FROM transactions t
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

  if (!["day", "week", "month"].includes(granularity)) {
    res.status(400).json({ error: "granularity must be 'day', 'week', or 'month'" });
    return;
  }

  // Map granularity to a Postgres date_trunc key
  const truncMap: Record<string, string> = { day: "day", week: "week", month: "month" };
  const trunc = truncMap[granularity];

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
