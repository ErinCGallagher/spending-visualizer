/** Budget settings routes: get/set the group that scopes the budget feature. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { parseBudgetSettingsBody } from "../lib/budgetValidation";

const router = Router();
router.use(requireAuth);

/** GET /api/budget-settings — the authenticated user's budget scope, or null if unset. */
router.get("/", async (_req, res) => {
  const userId: string = res.locals.userId;
  try {
    const { rows } = await pool.query(
      `SELECT g.id AS "groupId", g.name AS "groupName", g.group_type AS "groupType"
       FROM budget_settings bs
       JOIN groups g ON g.id = bs.group_id
       WHERE bs.user_id = $1`,
      [userId]
    );
    res.json(rows[0] ?? null);
  } catch (err) {
    console.error("GET /api/budget-settings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/budget-settings — select (or change) the group the budget is scoped to. */
router.post("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { groupId, errors } = parseBudgetSettingsBody(req.body);
  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  try {
    const owned = await pool.query(`SELECT 1 FROM groups WHERE id = $1 AND user_id = $2`, [
      groupId,
      userId,
    ]);
    if (owned.rowCount === 0) {
      res.status(400).json({ error: "groupId does not belong to this user" });
      return;
    }

    const { rows } = await pool.query(
      `INSERT INTO budget_settings (id, user_id, group_id)
       VALUES (gen_random_uuid(), $1, $2)
       ON CONFLICT (user_id) DO UPDATE SET group_id = EXCLUDED.group_id
       RETURNING group_id AS "groupId"`,
      [userId, groupId]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/budget-settings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
