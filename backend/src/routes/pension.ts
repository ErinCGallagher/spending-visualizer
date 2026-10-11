/** Pension routes: read and bulk-save per-year monthly pension contribution amounts. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { parsePensionBody } from "../lib/pensionValidation";

export function mapPensionRow(r: { month: number; amount: string }) {
  return {
    month: r.month,
    amount: parseFloat(r.amount),
  };
}

const router = Router();
router.use(requireAuth);

/** GET /api/pension?year=YYYY — the user's monthly pension contributions for a year. */
router.get("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const rawYear = req.query.year as string | undefined;
  const year = rawYear === undefined ? new Date().getFullYear() : parseInt(rawYear, 10);

  if (!Number.isInteger(year)) {
    res.status(400).json({ error: "year must be an integer" });
    return;
  }

  try {
    const { rows } = await pool.query<{ month: number; amount: string }>(
      `SELECT month, amount
       FROM pension_contributions
       WHERE user_id = $1 AND year = $2
       ORDER BY month`,
      [userId, year]
    );
    res.json({ year, contributions: rows.map(mapPensionRow) });
  } catch (err) {
    console.error("GET /api/pension error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/pension — bulk upsert of a year's monthly pension contribution amounts. */
router.post("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { year, contributions, errors } = parsePensionBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const c of contributions) {
      await client.query(
        `INSERT INTO pension_contributions (id, user_id, year, month, amount)
         VALUES (gen_random_uuid(), $1, $2, $3, $4)
         ON CONFLICT (user_id, year, month)
         DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()`,
        [userId, year, c.month, c.amount]
      );
    }
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/pension error:", err);
    res.status(500).json({ error: "Internal server error" });
    return;
  } finally {
    client.release();
  }

  const { rows } = await pool.query<{ month: number; amount: string }>(
    `SELECT month, amount
     FROM pension_contributions
     WHERE user_id = $1 AND year = $2
     ORDER BY month`,
    [userId, year]
  );
  res.status(201).json({ year, contributions: rows.map(mapPensionRow) });
});

export default router;
