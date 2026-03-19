/** Category taxonomy routes: list and organise. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { buildTaxonomy, CategoryRow } from "../lib/categoryHelpers";

const router = Router();

router.use(requireAuth);

/** GET /api/categories — returns the user's full nested category taxonomy. */
router.get("/", async (_req, res) => {
  const userId: string = res.locals.userId;

  try {
    const { rows } = await pool.query<CategoryRow>(
      "SELECT id, name, parent_id FROM categories WHERE user_id = $1 ORDER BY name",
      [userId]
    );
    res.json(buildTaxonomy(rows));
  } catch (err) {
    console.error("GET /api/categories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/categories/organise — upserts categories and sets parent relationships.
 * Accepts `{ categories: { name, parentName | null }[] }` and returns the
 * updated taxonomy. Idempotent: safe to call multiple times with the same data.
 */
router.post("/organise", async (req, res) => {
  const userId: string = res.locals.userId;
  const { categories } = req.body as {
    categories: { name: string; parentName: string | null }[];
  };

  if (!Array.isArray(categories)) {
    res.status(400).json({ error: "categories must be an array" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Upsert all categories first (without parent_id) so parent lookups work
    for (const cat of categories) {
      await client.query(
        `INSERT INTO categories (id, user_id, name)
         VALUES (gen_random_uuid(), $1, $2)
         ON CONFLICT (user_id, name) DO NOTHING`,
        [userId, cat.name]
      );
    }

    // Now set parent_id for entries that have a parentName
    for (const cat of categories) {
      if (cat.parentName !== null && cat.parentName !== undefined) {
        await client.query(
          `UPDATE categories
           SET parent_id = (
             SELECT id FROM categories WHERE user_id = $1 AND name = $2 LIMIT 1
           )
           WHERE user_id = $1 AND name = $3`,
          [userId, cat.parentName, cat.name]
        );
      }
    }

    await client.query("COMMIT");

    const { rows } = await client.query<CategoryRow>(
      "SELECT id, name, parent_id FROM categories WHERE user_id = $1 ORDER BY name",
      [userId]
    );
    res.json(buildTaxonomy(rows));
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("POST /api/categories/organise error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
  }
});

export default router;
