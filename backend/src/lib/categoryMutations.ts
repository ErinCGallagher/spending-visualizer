/** Pure validation helpers for creating and deleting categories. */

import { CategoryRow } from "./categoryHelpers";

export type NameValidationResult = { valid: true; name: string } | { valid: false; error: string };

export function validateCategoryName(name: unknown): NameValidationResult {
  if (typeof name !== "string" || name.trim().length === 0) {
    return { valid: false, error: "name is required" };
  }
  return { valid: true, name: name.trim() };
}

export type ParentValidationResult = { ok: true } | { ok: false; status: number; error: string };

/**
 * Validates a parentId against the looked-up parent row. The app only
 * supports a 2-level taxonomy, so a parent that already has a parent
 * of its own cannot be nested under further.
 */
export function validateParentForCreate(
  parent: CategoryRow | null | undefined,
  parentId: string | null | undefined
): ParentValidationResult {
  if (parentId === null || parentId === undefined) {
    return { ok: true };
  }
  if (!parent) {
    return { ok: false, status: 404, error: "Parent category not found" };
  }
  if (parent.parent_id !== null) {
    return { ok: false, status: 400, error: "Cannot nest a category under a sub-category" };
  }
  return { ok: true };
}

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err && (err as { code: unknown }).code === "23505";
}
