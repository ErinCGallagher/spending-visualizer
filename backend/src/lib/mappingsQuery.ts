/** Pure helpers for parsing and validating credit card category mappings query parameters. */

import type { ParamError } from "./queryParams";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  const parentId = typeof raw.parentId === "string" ? raw.parentId : undefined;
  const subId = typeof raw.subId === "string" ? raw.subId : undefined;

  if (parentId !== undefined && !UUID.test(parentId)) {
    errors.push({ field: "parentId", message: "Must be a valid UUID" });
  }
  if (subId !== undefined && !UUID.test(subId)) {
    errors.push({ field: "subId", message: "Must be a valid UUID" });
  }

  let page = 1;
  if (raw.page !== undefined) {
    const p = Number(raw.page);
    if (!Number.isInteger(p) || p < 1) {
      errors.push({ field: "page", message: "Must be a positive integer" });
    } else {
      page = p;
    }
  }

  let limit = 25;
  if (raw.limit !== undefined) {
    const l = Number(raw.limit);
    if (!Number.isInteger(l) || l < 1 || l > 200) {
      errors.push({ field: "limit", message: "Must be an integer between 1 and 200" });
    } else {
      limit = l;
    }
  }

  return { params: { search, parentId, subId, page, limit }, errors };
}

export interface MappingsFilterSQL {
  /** WHERE conditions — always starts with "ccm.user_id = $1". */
  conditions: string[];
  /** Bound parameter values. */
  values: unknown[];
}

export function buildMappingsFilterSQL(
  userId: string,
  params: { search?: string; parentId?: string; subId?: string }
): MappingsFilterSQL {
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

  return { conditions, values };
}
