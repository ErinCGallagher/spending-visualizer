/** Unit tests for the bulk category-update request body validator. */

import { describe, it, expect } from "vitest";
import { parseBulkCategoryUpdateBody } from "./categoryUpdateValidation";

const UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

describe("parseBulkCategoryUpdateBody", () => {
  it("accepts a valid ids-mode body", () => {
    const { params, errors } = parseBulkCategoryUpdateBody({ categoryId: UUID, ids: [UUID] });
    expect(errors).toHaveLength(0);
    expect(params.categoryId).toBe(UUID);
    expect(params.ids).toEqual([UUID]);
    expect(params.filter).toBeUndefined();
  });

  it("accepts a valid filter-mode body", () => {
    const { params, errors } = parseBulkCategoryUpdateBody({ categoryId: UUID, filter: { search: "coffee" } });
    expect(errors).toHaveLength(0);
    expect(params.filter).toEqual({ search: "coffee" });
    expect(params.ids).toBeUndefined();
  });

  it("accepts a null categoryId (clearing the category)", () => {
    const { params, errors } = parseBulkCategoryUpdateBody({ categoryId: null, ids: [UUID] });
    expect(errors).toHaveLength(0);
    expect(params.categoryId).toBeNull();
  });

  it("rejects a non-UUID categoryId", () => {
    const { errors } = parseBulkCategoryUpdateBody({ categoryId: "not-a-uuid", ids: [UUID] });
    expect(errors.some((e) => e.field === "categoryId")).toBe(true);
  });

  it("rejects when neither ids nor filter is provided", () => {
    const { errors } = parseBulkCategoryUpdateBody({ categoryId: UUID });
    expect(errors.some((e) => e.field === "ids")).toBe(true);
  });

  it("rejects when both ids and filter are provided", () => {
    const { errors } = parseBulkCategoryUpdateBody({ categoryId: UUID, ids: [UUID], filter: {} });
    expect(errors.some((e) => e.field === "ids")).toBe(true);
  });

  it("rejects an empty ids array", () => {
    const { errors } = parseBulkCategoryUpdateBody({ categoryId: UUID, ids: [] });
    expect(errors.some((e) => e.field === "ids")).toBe(true);
  });

  it("rejects an ids array containing a non-UUID entry", () => {
    const { errors } = parseBulkCategoryUpdateBody({ categoryId: UUID, ids: [UUID, "nope"] });
    expect(errors.some((e) => e.field === "ids")).toBe(true);
  });
});
