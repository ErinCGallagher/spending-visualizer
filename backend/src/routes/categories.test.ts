/** Unit tests for category name validation. */

import { describe, it, expect } from "vitest";
import { validateCategoryName, CATEGORIES_MAX_COUNT } from "./categories";

describe("validateCategoryName", () => {
  it("returns null for a valid name", () => {
    expect(validateCategoryName("Food")).toBeNull();
  });

  it("returns an error for an empty string", () => {
    expect(validateCategoryName("")).not.toBeNull();
  });

  it("returns an error for a whitespace-only string", () => {
    expect(validateCategoryName("   ")).not.toBeNull();
  });

  it("returns an error for a non-string value", () => {
    expect(validateCategoryName(42)).not.toBeNull();
    expect(validateCategoryName(null)).not.toBeNull();
    expect(validateCategoryName(undefined)).not.toBeNull();
  });

  it("returns null for a name at the 100-character limit", () => {
    expect(validateCategoryName("A".repeat(100))).toBeNull();
  });

  it("returns an error for a name exceeding 100 characters", () => {
    expect(validateCategoryName("A".repeat(101))).not.toBeNull();
  });
});

describe("CATEGORIES_MAX_COUNT", () => {
  it("is 60", () => {
    expect(CATEGORIES_MAX_COUNT).toBe(30);
  });
});
