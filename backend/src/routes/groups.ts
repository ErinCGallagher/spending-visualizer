/** Group routes: list and create expense groups. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";

const router = Router();
router.use(requireAuth);

const VALID_TYPES = ["trip", "daily", "business"] as const;
type GroupType = (typeof VALID_TYPES)[number];

/** GET /api/groups — all groups for the authenticated user. */
router.get("/", async (_req, res) => {
  const userId: string = res.locals.userId;
  try {
    const { rows } = await pool.query(
      `SELECT id, name, group_type AS "groupType", created_at AS "createdAt"
       FROM groups
       WHERE user_id = $1
       ORDER BY group_type, name`,
      [userId]
    );
    res.json({ groups: rows });
  } catch (err) {
    console.error("GET /api/groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/groups — create a new group for the authenticated user. */
router.post("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { name, groupType } = req.body as { name?: string; groupType?: string };

  if (!name || typeof name !== "string" || name.trim() === "") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  if (!groupType || !VALID_TYPES.includes(groupType as GroupType)) {
    res.status(400).json({ error: `groupType must be one of: ${VALID_TYPES.join(", ")}` });
    return;
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO groups (id, user_id, name, group_type)
       VALUES (gen_random_uuid(), $1, $2, $3)
       ON CONFLICT (user_id, name) DO UPDATE SET group_type = EXCLUDED.group_type
       RETURNING id, name, group_type AS "groupType", created_at AS "createdAt"`,
      [userId, name.trim(), groupType]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("POST /api/groups error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
