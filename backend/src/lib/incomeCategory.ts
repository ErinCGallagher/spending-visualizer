/**
 * The reserved Income category and the SQL predicate that keeps its tree out of
 * spending queries. Shared by the chart and transaction routes.
 */

/**
 * The reserved top-level category name for income. Income transactions carry the
 * opposite sign to expenses, so they must be kept out of spending charts — otherwise
 * they net against spending and drag totals negative.
 */
export const INCOME_CATEGORY = "Income";

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
