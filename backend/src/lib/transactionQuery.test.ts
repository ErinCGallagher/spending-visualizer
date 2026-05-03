/** Unit tests for transaction SQL filter builder and meta query helpers. */

import { describe, it, expect } from "vitest";
import { buildTransactionFilterSQL, buildGroupsMetaSQL } from "./transactionQuery";

describe("buildTransactionFilterSQL", () => {
  it("includes only user_id condition when no filters are provided", () => {
    const { joins, conditions, values } = buildTransactionFilterSQL("user1", {});
    expect(joins).toHaveLength(0);
    expect(conditions).toEqual(["t.user_id = $1"]);
    expect(values).toEqual(["user1"]);
  });

  it("adds a date range condition for from and to", () => {
    const { conditions } = buildTransactionFilterSQL("user1", {
      from: "2024-01-01",
      to: "2024-12-31",
    });
    expect(conditions.some((c) => c.includes("t.date >="))).toBe(true);
    expect(conditions.some((c) => c.includes("t.date <="))).toBe(true);
  });

  it("adds a category condition when category is provided", () => {
    const uuid = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
    const { conditions } = buildTransactionFilterSQL("user1", { category: uuid });
    expect(conditions.some((c) => c.includes("t.category_id"))).toBe(true);
  });

  // Bug 1: payer filter must filter by transactions.payer, not transaction_splits.traveller_name
  it("traveller filter adds a t.payer condition, not a transaction_splits join", () => {
    const { joins, conditions } = buildTransactionFilterSQL("user1", {
      traveller: "Alice",
    });
    expect(conditions.some((c) => c.includes("t.payer"))).toBe(true);
    expect(joins.some((j) => j.includes("transaction_splits"))).toBe(false);
  });

  it("binds the traveller value into the values array", () => {
    const { values } = buildTransactionFilterSQL("user1", { traveller: "Bob" });
    expect(values).toContain("Bob");
  });

  it("does not add any join or payer condition when traveller is undefined", () => {
    const { joins, conditions } = buildTransactionFilterSQL("user1", {});
    expect(joins).toHaveLength(0);
    expect(conditions.some((c) => c.includes("t.payer"))).toBe(false);
  });

  it("groupType filter uses INNER JOIN so ungrouped transactions are excluded", () => {
    const { joins } = buildTransactionFilterSQL("user1", { groupType: ["trip"] });
    expect(joins).toHaveLength(1);
    expect(joins[0]).toMatch(/^JOIN groups/i);
    expect(joins[0]).not.toMatch(/LEFT JOIN/i);
  });

  it("groupType filter adds a g.group_type = ANY condition", () => {
    const { conditions } = buildTransactionFilterSQL("user1", { groupType: ["trip"] });
    expect(conditions.some((c) => c.includes("g.group_type = ANY"))).toBe(true);
  });

  it("groupType filter binds the types array as a single parameter", () => {
    const { values } = buildTransactionFilterSQL("user1", { groupType: ["trip", "daily"] });
    expect(values).toContainEqual(["trip", "daily"]);
  });

  it("single groupType string is coerced to an array", () => {
    const { joins, values } = buildTransactionFilterSQL("user1", { groupType: "business" });
    expect(joins).toHaveLength(1);
    expect(values).toContainEqual(["business"]);
  });

  it("empty groupType array adds no join or group_type condition", () => {
    const { joins, conditions } = buildTransactionFilterSQL("user1", { groupType: [] });
    expect(joins).toHaveLength(0);
    expect(conditions.some((c) => c.includes("g.group_type"))).toBe(false);
  });
});

describe("buildGroupsMetaSQL", () => {
  // Bug 2: groups were appearing twice because the query returned duplicate rows.
  // The query must include DISTINCT to prevent duplicate group names in the dropdown.
  it("includes DISTINCT to prevent duplicate group names", () => {
    const sql = buildGroupsMetaSQL();
    expect(sql.toUpperCase()).toContain("DISTINCT");
  });

  it("selects id, name, and groupType columns", () => {
    const sql = buildGroupsMetaSQL();
    expect(sql).toContain("id");
    expect(sql).toContain("name");
    expect(sql).toContain("groupType");
  });

  it("filters by user_id parameter", () => {
    const sql = buildGroupsMetaSQL();
    expect(sql).toContain("user_id = $1");
  });
});
