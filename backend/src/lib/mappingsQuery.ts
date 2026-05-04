/** Pure helpers for parsing and validating credit card category mappings query parameters. */

import { type ParamError, UUID_REGEX, parsePageParam, parseLimitParam } from "./queryParams";

export interface MappingsQueryParams {
  search: string | undefined;
  parentId: string | undefined;
  subId: string | undefined;
  page: number;
  limit: number;
}

export function parseMappingsQuery(raw: Record<string, unknown>): {
  params: MappingsQueryParams;
  errors: ParamError[];
} {
  const errors: ParamError[] = [];

  const search = typeof raw.search === "string" ? raw.search : undefined;

  if (search !== undefined && search.length > 100) {
    errors.push({ field: "search", message: "Must be 100 characters or fewer" });
  }
  const parentId = typeof raw.parentId === "string" ? raw.parentId : undefined;
  const subId = typeof raw.subId === "string" ? raw.subId : undefined;

  if (parentId !== undefined && !UUID_REGEX.test(parentId)) {
    errors.push({ field: "parentId", message: "Must be a valid UUID" });
  }
  if (subId !== undefined && !UUID_REGEX.test(subId)) {
    errors.push({ field: "subId", message: "Must be a valid UUID" });
  }

  const page = parsePageParam(raw.page, errors);
  const limit = parseLimitParam(raw.limit, 25, errors);

  return { params: { search, parentId, subId, page, limit }, errors };
}

export interface MappingsFilterSQL {
  /** JOIN clauses required by the conditions (must be included in any query using these conditions). */
  joins: string[];
  /** WHERE conditions — always starts with "ccm.user_id = $1". */
  conditions: string[];
  /** Bound parameter values. */
  values: unknown[];
}

export function buildMappingsFilterSQL(
  userId: string,
  params: { search?: string; parentId?: string; subId?: string }
): MappingsFilterSQL {
  const joins: string[] = ["JOIN categories c ON c.id = ccm.category_id"];
  const conditions: string[] = ["ccm.user_id = $1"];
  const values: unknown[] = [userId];

  const addParam = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  if (params.search) {
    conditions.push(`ccm.merchant_key ILIKE ${addParam(`%${params.search}%`)}`);
  }

  if (params.subId) {
    conditions.push(`ccm.category_id = ${addParam(params.subId)}`);
  } else if (params.parentId) {
    const p = addParam(params.parentId);
    conditions.push(`(ccm.category_id = ${p} OR c.parent_id = ${p})`);
  }

  return { joins, conditions, values };
}
