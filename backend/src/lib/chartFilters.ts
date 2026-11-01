/**
 * Pure helper for the SQL filter fragment shared by the chart routes. Kept
 * separate so it can be unit-tested without a database.
 */

export interface ChartFilterInput {
  from?: string;
  to?: string;
  countries?: string[];
  groupTypes?: string[];
  groupId?: string;
}

export interface ChartFilterSQL {
  /** Additional JOIN clauses (may be empty). */
  joins: string[];
  /** WHERE conditions — always starts with "t.user_id = $1". */
  conditions: string[];
  /** Bound parameter values; userId is $1. */
  values: unknown[];
}

export function buildChartFilterSQL(userId: string, input: ChartFilterInput): ChartFilterSQL {
  const conditions: string[] = ["t.user_id = $1"];
  const values: unknown[] = [userId];
  const joins: string[] = [];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (input.from) conditions.push(`t.date >= ${addParam(input.from)}`);
  if (input.to) conditions.push(`t.date <= ${addParam(input.to)}`);
  if (input.countries?.length) conditions.push(`t.country = ANY(${addParam(input.countries)})`);
  if (input.groupId) conditions.push(`t.group_id = ${addParam(input.groupId)}`);
  if (input.groupTypes?.length) {
    joins.push("JOIN groups g ON g.id = t.group_id");
    conditions.push(`g.group_type = ANY(${addParam(input.groupTypes)})`);
  }

  return { joins, conditions, values };
}
