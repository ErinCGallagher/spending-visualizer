/** Category taxonomy routes: list and organise. */

import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth";
import { pool } from "../db";
import { buildTaxonomy, CategoryRow } from "../lib/categoryHelpers";
import { parseMappingsQuery, buildMappingsFilterSQL } from "../lib/mappingsQuery";
import { validateCategoryName, validateParentForCreate, isUniqueViolation } from "../lib/categoryMutations";

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

/** POST /api/categories — creates a single category, optionally nested under a parent. */
router.post("/", async (req, res) => {
  const userId: string = res.locals.userId;
  const { name, parentId } = req.body as { name: unknown; parentId?: string | null };

  const nameResult = validateCategoryName(name);
  if (!nameResult.valid) {
    res.status(400).json({ error: nameResult.error });
    return;
  }

  try {
    let parent: CategoryRow | null = null;
    if (parentId !== null && parentId !== undefined) {
      const { rows } = await pool.query<CategoryRow>(
        "SELECT id, name, parent_id FROM categories WHERE id = $1 AND user_id = $2",
        [parentId, userId]
      );
      parent = rows[0] ?? null;
    }

    const parentResult = validateParentForCreate(parent, parentId);
    if (!parentResult.ok) {
      res.status(parentResult.status).json({ error: parentResult.error });
      return;
    }

    const { rows } = await pool.query<CategoryRow>(
      `INSERT INTO categories (id, user_id, name, parent_id)
       VALUES (gen_random_uuid(), $1, $2, $3)
       RETURNING id, name, parent_id`,
      [userId, nameResult.name, parentId ?? null]
    );
    const created = rows[0];
    res.status(201).json({ id: created.id, name: created.name, parentId: created.parent_id });
  } catch (err) {
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: `A category named "${nameResult.name}" already exists there` });
      return;
    }
    console.error("POST /api/categories error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * DELETE /api/categories/:id — deletes a category. Blocked if the category
 * still has sub-categories. Transactions referencing the deleted category
 * fall back to category_id = NULL (ON DELETE SET NULL); any credit card
 * mapping pointing at it is removed (ON DELETE CASCADE).
 */
router.delete("/:id", async (req, res) => {
  const userId: string = res.locals.userId;
  const { id } = req.params;

  try {
    const { rows: existing } = await pool.query(
      "SELECT id FROM categories WHERE id = $1 AND user_id = $2",
      [id, userId]
    );
    if (existing.length === 0) {
      res.status(404).json({ error: "Category not found" });
      return;
    }

    const { rows: children } = await pool.query(
      "SELECT 1 FROM categories WHERE parent_id = $1 LIMIT 1",
      [id]
    );
    if (children.length > 0) {
      res.status(409).json({ error: "Delete or move its sub-categories first" });
      return;
    }

    await pool.query("DELETE FROM categories WHERE id = $1 AND user_id = $2", [id, userId]);
    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /api/categories/:id error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/categories/mappings — paginated, filterable list of credit card category mappings. */
router.get("/mappings", async (req, res) => {
  const userId: string = res.locals.userId;
  const { params, errors } = parseMappingsQuery(req.query as Record<string, unknown>);

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  const { search, parentId, subId, page, limit } = params;
  const { joins, conditions, values } = buildMappingsFilterSQL(userId, { search, parentId, subId });
  const where = conditions.join(" AND ");
  const offset = (page - 1) * limit;
  const selectJoins = [...joins, "LEFT JOIN categories p ON p.id = c.parent_id"].join("\n       ");

  try {
    const countResult = await pool.query<{ count: string }>(
      `SELECT COUNT(*) AS count
       FROM credit_card_category_mappings ccm
       ${joins.join("\n       ")}
       WHERE ${where}`,
      values
    );
    const total = parseInt(countResult.rows[0].count, 10);

    values.push(limit, offset);
    const limitParam = `$${values.length - 1}`;
    const offsetParam = `$${values.length}`;

    const { rows } = await pool.query<{
      merchant_key: string;
      category_id: string;
      category_name: string;
      parent_id: string | null;
      parent_name: string | null;
    }>(
      `SELECT
         ccm.merchant_key,
         ccm.category_id,
         c.name AS category_name,
         c.parent_id,
         p.name AS parent_name
       FROM credit_card_category_mappings ccm
       ${selectJoins}
       WHERE ${where}
       ORDER BY ccm.merchant_key
       LIMIT ${limitParam} OFFSET ${offsetParam}`,
      values
    );

    res.json({ mappings: rows, total, page, limit });
  } catch (err) {
    console.error("GET /api/categories/mappings error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /api/categories/mappings — updates a credit card category mapping and all linked transactions. */
router.put("/mappings", async (req, res) => {
  const userId: string = res.locals.userId;
  const { merchantKey, categoryId } = req.body as {
    merchantKey: string;
    categoryId: string;
  };

  if (!merchantKey || !categoryId) {
    res.status(400).json({ error: "merchantKey and categoryId are required" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Update the mapping
    const mappingResult = await client.query(
      `UPDATE credit_card_category_mappings
       SET category_id = $1, updated_at = NOW()
       WHERE user_id = $2 AND merchant_key = $3`,
      [categoryId, userId, merchantKey]
    );

    if (mappingResult.rowCount === 0) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Mapping not found" });
      return;
    }

    // 2. Update all references in existing transactions
    // We use the same normalisation logic as toMerchantKey in TypeScript:
    // description.toLowerCase().trim().replace(/\s+/g, " ")
    await client.query(
      `UPDATE transactions
       SET category_id = $1, category_source = 'user'
       WHERE user_id = $2 
         AND LOWER(TRIM(REGEXP_REPLACE(description, '\\s+', ' ', 'g'))) = $3`,
      [categoryId, userId, merchantKey]
    );

    await client.query("COMMIT");
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("PUT /api/categories/mappings error:", err);
    res.status(500).json({ error: "Internal server error" });
  } finally {
    client.release();
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

    // Upsert top-level categories first so parent lookups below can find them.
    // Category names can repeat across different parents (see the partial
    // indexes in migrate.ts), so top-level and child rows are deduplicated
    // against separate arbiters rather than by name alone.
    for (const cat of categories) {
      if (cat.parentName === null || cat.parentName === undefined) {
        await client.query(
          `INSERT INTO categories (id, user_id, name)
           VALUES (gen_random_uuid(), $1, $2)
           ON CONFLICT (user_id, name) WHERE parent_id IS NULL DO NOTHING`,
          [userId, cat.name]
        );
      }
    }

    // Now upsert child categories directly under their resolved parent.
    for (const cat of categories) {
      if (cat.parentName !== null && cat.parentName !== undefined) {
        await client.query(
          `INSERT INTO categories (id, user_id, name, parent_id)
           VALUES (
             gen_random_uuid(), $1, $2,
             (SELECT id FROM categories WHERE user_id = $1 AND name = $3 AND parent_id IS NULL LIMIT 1)
           )
           ON CONFLICT (user_id, parent_id, name) WHERE parent_id IS NOT NULL DO NOTHING`,
          [userId, cat.name, cat.parentName]
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
