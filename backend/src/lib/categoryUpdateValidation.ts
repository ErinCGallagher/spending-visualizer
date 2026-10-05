/** Pure validation for the bulk transaction category-update request body. */

import { UUID_REGEX } from "./queryParams";
import type { TransactionFilterInput } from "./transactionQuery";

export interface BulkCategoryUpdateParams {
  categoryId: string | null;
  ids?: string[];
  filter?: TransactionFilterInput;
}

export interface ParamError {
  field: string;
  message: string;
}

/**
 * Validates the body of PATCH /api/transactions/category.
 * Exactly one of `ids` or `filter` must be supplied, `categoryId` must be a
 * UUID or null. Returns parsed params plus any validation errors — callers
 * should return 400 when errors is non-empty.
 */
export function parseBulkCategoryUpdateBody(raw: unknown): {
  params: BulkCategoryUpdateParams;
  errors: ParamError[];
} {
  const errors: ParamError[] = [];
  const body = (raw ?? {}) as Record<string, unknown>;

  const categoryId = body.categoryId === null ? null : body.categoryId;
  if (categoryId !== null && (typeof categoryId !== "string" || !UUID_REGEX.test(categoryId))) {
    errors.push({ field: "categoryId", message: "Must be a valid UUID or null" });
  }

  const hasIds = body.ids !== undefined;
  const hasFilter = body.filter !== undefined;

  if (hasIds === hasFilter) {
    errors.push({ field: "ids", message: "Exactly one of ids or filter is required" });
  }

  let ids: string[] | undefined;
  if (hasIds) {
    if (!Array.isArray(body.ids) || body.ids.length === 0 || !body.ids.every((id) => typeof id === "string" && UUID_REGEX.test(id))) {
      errors.push({ field: "ids", message: "Must be a non-empty array of UUIDs" });
    } else {
      ids = body.ids as string[];
    }
  }

  const filter = hasFilter ? (body.filter as TransactionFilterInput) : undefined;

  return {
    params: { categoryId: categoryId as string | null, ids, filter },
    errors,
  };
}
