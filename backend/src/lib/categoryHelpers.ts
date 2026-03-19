/** Pure helpers for building the category taxonomy from flat DB rows. */

export interface CategoryRow {
  id: string;
  name: string;
  parent_id: string | null;
}

export interface CategoryChild {
  id: string;
  name: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  parentId: string | null;
  children: CategoryChild[];
}

/**
 * Converts a flat list of category rows into a nested taxonomy.
 * Top-level categories (parent_id IS NULL) are returned as nodes with
 * their children nested. Orphaned children (parent not in list) are
 * included as top-level nodes so no data is silently dropped.
 */
export function buildTaxonomy(rows: CategoryRow[]): CategoryNode[] {
  const byId = new Map<string, CategoryNode>();

  for (const row of rows) {
    byId.set(row.id, { id: row.id, name: row.name, parentId: row.parent_id, children: [] });
  }

  const roots: CategoryNode[] = [];

  for (const node of byId.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parentId);
      if (parent) {
        parent.children.push({ id: node.id, name: node.name });
      } else {
        // Parent not found — treat as root to avoid data loss
        roots.push(node);
      }
    }
  }

  return roots;
}
