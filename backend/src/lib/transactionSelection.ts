/**
 * Pure validation for selecting transactions in bulk requests: either an
 * explicit list of ids or every transaction matching the list filters.
 */

import { UUID_REGEX } from "./queryParams";
import type { TransactionFilterInput } from "./transactionQuery";

export interface ParamError {
  field: string;
  message: string;
}

export interface TransactionSelection {
  ids?: string[];
  filter?: TransactionFilterInput;
}

/**
 * Exactly one of `ids` (non-empty array of UUIDs) or `filter` (object) must be
 * present in the body.
 */
export function parseTransactionSelection(raw: unknown): {
  selection: TransactionSelection;
  errors: ParamError[];
} {
  const errors: ParamError[] = [];
  const body = (raw ?? {}) as Record<string, unknown>;

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

  let filter: TransactionFilterInput | undefined;
  if (hasFilter) {
    if (typeof body.filter !== "object" || body.filter === null || Array.isArray(body.filter)) {
      errors.push({ field: "filter", message: "Must be an object" });
    } else {
      filter = body.filter as TransactionFilterInput;
    }
  }

  return { selection: { ids, filter }, errors };
}

/** Validates the body of DELETE /api/transactions/bulk. */
export function parseBulkDeleteBody(raw: unknown): {
  params: TransactionSelection;
  errors: ParamError[];
} {
  const { selection, errors } = parseTransactionSelection(raw);
  return { params: selection, errors };
}
