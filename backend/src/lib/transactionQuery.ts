/**
 * Pure helpers for building the SQL filter fragment used by GET /api/transactions.
 * Extracted so the logic can be unit-tested independently of the database.
 */

export interface TransactionFilterInput {
  from?: string;
  to?: string;
  category?: string;
  paymentMethod?: string;
  /** Name of the payer to filter by (maps to transactions.payer). */
  traveller?: string;
  groupId?: string;
  groupType?: string | string[];
  search?: string;
}

export interface TransactionFilterSQL {
  /** Additional JOIN clauses (may be empty). */
  joins: string[];
  /** WHERE conditions — always starts with "t.user_id = $1". */
  conditions: string[];
  /** Bound parameter values corresponding to the placeholders in conditions/joins. */
  values: unknown[];
}

/**
 * Builds the JOIN clauses and WHERE conditions for the transactions list query.
 * Returns the joins, conditions, and the bound values array with userId as $1.
 */
export function buildTransactionFilterSQL(
  userId: string,
  params: TransactionFilterInput
): TransactionFilterSQL {
  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];
  const joins: string[] = [];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (params.from) conditions.push(`t.date >= ${addParam(params.from)}`);
  if (params.to) conditions.push(`t.date <= ${addParam(params.to)}`);
  if (params.category) conditions.push(`t.category_id = ${addParam(params.category)}`);
  if (params.paymentMethod) conditions.push(`t.payment_method = ${addParam(params.paymentMethod)}`);
  if (params.groupId) conditions.push(`t.group_id = ${addParam(params.groupId)}`);
  const groupTypes = [params.groupType ?? []].flat().filter(Boolean);
  if (groupTypes.length > 0) {
    joins.push(`LEFT JOIN groups g ON g.id = t.group_id`);
    conditions.push(`g.group_type = ANY(${addParam(groupTypes)})`);
  }

  if (params.search) {
    // Ensure we have categories for searching by name
    if (!joins.some(j => j.includes("JOIN categories c"))) {
      joins.push(`LEFT JOIN categories c ON c.id = t.category_id`);
    }
    const s = `%${params.search}%`;
    const p = addParam(s);
    conditions.push(`(t.description ILIKE ${p} OR c.name ILIKE ${p} OR t.payer ILIKE ${p})`);
  }

  // Filter by the payer stored directly on the transaction, not by split participant.
  if (params.traveller) {
    conditions.push(`t.payer = ${addParam(params.traveller)}`);
  }

  return { joins, conditions, values };
}

/**
 * SQL query for the groups section of the /api/transactions/meta response.
 * Returns the groups belonging to a user, deduplicated by name so that groups
 * created more than once with the same name only appear once in filter dropdowns.
 */
export function buildGroupsMetaSQL(): string {
  return `SELECT DISTINCT ON (name) id, name, group_type AS "groupType"
     FROM groups
     WHERE user_id = $1
     ORDER BY name, group_type, created_at`;
}
