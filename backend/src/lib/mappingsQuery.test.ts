/** Unit tests for mappings query param parsing and SQL filter building. */

import { describe, it, expect } from "vitest";
import { parseMappingsQuery, buildMappingsFilterSQL } from "./mappingsQuery";

const VALID_UUID = "123e4567-e89b-12d3-a456-426614174000";
const OTHER_UUID = "223e4567-e89b-12d3-a456-426614174000";

describe("parseMappingsQuery", () => {
  it("defaults page to 1 and limit to 25", () => {
    const { params, errors } = parseMappingsQuery({});
    expect(errors).toHaveLength(0);
    expect(params.page).toBe(1);
    expect(params.limit).toBe(25);
  });

  it("parses page and limit as integers", () => {
    const { params, errors } = parseMappingsQuery({ page: "3", limit: "50" });
    expect(errors).toHaveLength(0);
    expect(params.page).toBe(3);
    expect(params.limit).toBe(50);
  });

  it("returns an error for non-integer page", () => {
    const { errors } = parseMappingsQuery({ page: "abc" });
    expect(errors.some((e) => e.field === "page")).toBe(true);
  });

  it("returns an error for page less than 1", () => {
    const { errors } = parseMappingsQuery({ page: "0" });
    expect(errors.some((e) => e.field === "page")).toBe(true);
  });

  it("returns an error for limit out of range", () => {
    const { errors } = parseMappingsQuery({ limit: "300" });
    expect(errors.some((e) => e.field === "limit")).toBe(true);
  });

  it("returns an error for limit less than 1", () => {
    const { errors } = parseMappingsQuery({ limit: "0" });
    expect(errors.some((e) => e.field === "limit")).toBe(true);
  });

  it("returns an error for invalid parentId UUID", () => {
    const { errors } = parseMappingsQuery({ parentId: "not-a-uuid" });
    expect(errors.some((e) => e.field === "parentId")).toBe(true);
  });

  it("returns an error for invalid subId UUID", () => {
    const { errors } = parseMappingsQuery({ subId: "not-a-uuid" });
    expect(errors.some((e) => e.field === "subId")).toBe(true);
  });

  it("accepts valid UUIDs for parentId and subId", () => {
    const { params, errors } = parseMappingsQuery({ parentId: VALID_UUID, subId: OTHER_UUID });
    expect(errors).toHaveLength(0);
    expect(params.parentId).toBe(VALID_UUID);
    expect(params.subId).toBe(OTHER_UUID);
  });

  it("passes search through as-is", () => {
    const { params, errors } = parseMappingsQuery({ search: "tim hortons" });
    expect(errors).toHaveLength(0);
    expect(params.search).toBe("tim hortons");
  });

  it("ignores non-string search values", () => {
    const { params } = parseMappingsQuery({ search: 123 });
    expect(params.search).toBeUndefined();
  });
});

describe("buildMappingsFilterSQL", () => {
  it("always includes user_id condition as $1", () => {
    const { conditions, values } = buildMappingsFilterSQL("user-1", {});
    expect(conditions[0]).toBe("ccm.user_id = $1");
    expect(values[0]).toBe("user-1");
  });

  it("returns only user_id condition when no filters set", () => {
    const { conditions } = buildMappingsFilterSQL("user-1", {});
    expect(conditions).toHaveLength(1);
  });

  it("adds ILIKE condition for search", () => {
    const { conditions, values } = buildMappingsFilterSQL("user-1", { search: "starbucks" });
    expect(conditions.some((c) => c.includes("ILIKE"))).toBe(true);
    expect(values).toContain("%starbucks%");
  });

  it("adds category_id equality condition for subId", () => {
    const { conditions, values } = buildMappingsFilterSQL("user-1", { subId: VALID_UUID });
    expect(conditions.some((c) => c.includes("ccm.category_id ="))).toBe(true);
    expect(values).toContain(VALID_UUID);
  });

  it("does not add parent_id condition when subId is set", () => {
    const { conditions } = buildMappingsFilterSQL("user-1", { subId: VALID_UUID, parentId: OTHER_UUID });
    expect(conditions.some((c) => c.includes("c.parent_id"))).toBe(false);
  });

  it("adds OR condition covering direct and child mappings for parentId alone", () => {
    const { conditions, values } = buildMappingsFilterSQL("user-1", { parentId: VALID_UUID });
    const parentCondition = conditions.find((c) => c.includes("c.parent_id"));
    expect(parentCondition).toBeDefined();
    expect(parentCondition).toContain("ccm.category_id =");
    expect(values).toContain(VALID_UUID);
  });

  it("uses the same parameter placeholder for both sides of the parentId OR", () => {
    const { conditions } = buildMappingsFilterSQL("user-1", { parentId: VALID_UUID });
    const parentCondition = conditions.find((c) => c.includes("c.parent_id"))!;
    // Both sides should reference the same $n placeholder
    const placeholders = parentCondition.match(/\$\d+/g) ?? [];
    expect(placeholders).toHaveLength(2);
    expect(placeholders[0]).toBe(placeholders[1]);
  });

  it("combines search and category conditions", () => {
    const { conditions } = buildMappingsFilterSQL("user-1", { search: "coffee", subId: VALID_UUID });
    // user_id + search + subId
    expect(conditions).toHaveLength(3);
  });
});
