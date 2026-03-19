/** Unit tests for the category taxonomy builder. */

import { describe, it, expect } from "vitest";
import { buildTaxonomy, CategoryRow } from "./categoryHelpers";

describe("buildTaxonomy", () => {
  it("returns an empty array for empty input", () => {
    expect(buildTaxonomy([])).toEqual([]);
  });

  it("returns top-level categories with empty children arrays", () => {
    const rows: CategoryRow[] = [
      { id: "1", name: "Food", parent_id: null },
      { id: "2", name: "Transport", parent_id: null },
    ];
    const result = buildTaxonomy(rows);
    expect(result).toHaveLength(2);
    expect(result[0].children).toEqual([]);
    expect(result[1].children).toEqual([]);
  });

  it("nests children under their parent", () => {
    const rows: CategoryRow[] = [
      { id: "1", name: "Food", parent_id: null },
      { id: "2", name: "Groceries", parent_id: "1" },
      { id: "3", name: "Restaurants", parent_id: "1" },
    ];
    const result = buildTaxonomy(rows);
    const food = result.find((n) => n.id === "1")!;
    expect(food.children).toHaveLength(2);
    expect(food.children.map((c) => c.name)).toContain("Groceries");
    expect(food.children.map((c) => c.name)).toContain("Restaurants");
  });

  it("does not include children as top-level nodes", () => {
    const rows: CategoryRow[] = [
      { id: "1", name: "Food", parent_id: null },
      { id: "2", name: "Groceries", parent_id: "1" },
    ];
    const result = buildTaxonomy(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Food");
  });

  it("includes parentId on each node", () => {
    const rows: CategoryRow[] = [
      { id: "1", name: "Food", parent_id: null },
      { id: "2", name: "Groceries", parent_id: "1" },
    ];
    const result = buildTaxonomy(rows);
    expect(result[0].parentId).toBeNull();
  });

  it("promotes orphaned children to top level rather than losing them", () => {
    const rows: CategoryRow[] = [
      { id: "2", name: "Groceries", parent_id: "missing-id" },
    ];
    const result = buildTaxonomy(rows);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Groceries");
  });
});
