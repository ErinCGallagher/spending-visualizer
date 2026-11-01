/** Pure validation for the bulk transaction category-update request body. */

import { UUID_REGEX } from "./queryParams";
import { parseTransactionSelection } from "./transactionSelection";
import type { ParamError, TransactionSelection } from "./transactionSelection";

export type { ParamError };

export interface BulkCategoryUpdateParams extends TransactionSelection {
  categoryId: string | null;
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

  const { selection, errors: selectionErrors } = parseTransactionSelection(body);
  errors.push(...selectionErrors);

  return {
    params: { categoryId: categoryId as string | null, ...selection },
    errors,
  };
}
