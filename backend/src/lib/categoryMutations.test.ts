/** Unit tests for category create/delete validation helpers. */

import { describe, it, expect } from "vitest";
import { validateCategoryName, validateParentForCreate, isUniqueViolation } from "./categoryMutations";
import { CategoryRow } from "./categoryHelpers";

describe("validateCategoryName", () => {
  it("trims and accepts a valid name", () => {
    expect(validateCategoryName("  Travel  ")).toEqual({ valid: true, name: "Travel" });
  });

  it("rejects an empty string", () => {
    expect(validateCategoryName("")).toEqual({ valid: false, error: "name is required" });
  });

  it("rejects a whitespace-only string", () => {
    expect(validateCategoryName("   ")).toEqual({ valid: false, error: "name is required" });
  });

  it("rejects a non-string value", () => {
    expect(validateCategoryName(undefined as unknown as string)).toEqual({
      valid: false,
      error: "name is required",
    });
  });
});

describe("validateParentForCreate", () => {
  it("allows a null parentId (top-level category)", () => {
    expect(validateParentForCreate(null, undefined)).toEqual({ ok: true });
  });

  it("allows an undefined parentId (top-level category)", () => {
    expect(validateParentForCreate(undefined, undefined)).toEqual({ ok: true });
  });

  it("rejects a parentId that doesn't resolve to a row", () => {
    expect(validateParentForCreate(undefined, "missing-id")).toEqual({
      ok: false,
      status: 404,
      error: "Parent category not found",
    });
  });

  it("allows a parentId resolving to a top-level category", () => {
    const parent: CategoryRow = { id: "1", name: "Travel", parent_id: null };
    expect(validateParentForCreate(parent, "1")).toEqual({ ok: true });
  });

  it("rejects a parentId resolving to a category that already has a parent", () => {
    const parent: CategoryRow = { id: "2", name: "Flight", parent_id: "1" };
    expect(validateParentForCreate(parent, "2")).toEqual({
      ok: false,
      status: 400,
      error: "Cannot nest a category under a sub-category",
    });
  });
});

describe("isUniqueViolation", () => {
  it("returns true for a postgres unique_violation error code", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
  });

  it("returns false for other error codes", () => {
    expect(isUniqueViolation({ code: "23503" })).toBe(false);
  });

  it("returns false for a non-error value", () => {
    expect(isUniqueViolation(null)).toBe(false);
    expect(isUniqueViolation("oops")).toBe(false);
  });
});
