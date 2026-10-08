/** Unit tests for the budgets route row mapper functions. */

import { describe, it, expect } from "vitest";
import { mapBudgetMonthlyRow } from "./budgets";

describe("mapBudgetMonthlyRow", () => {
  it("maps all fields and parses the actual amount", () => {
    const row = { month: "2026-03", category_id: "c1", category_name: "Groceries", actual: "412.50" };
    const result = mapBudgetMonthlyRow(row);
    expect(result).toEqual({
      month: "2026-03",
      categoryId: "c1",
      categoryName: "Groceries",
      actual: 412.5,
    });
  });

  it("parses whole-number string amounts", () => {
    const row = { month: "2026-04", category_id: "c2", category_name: "Rent", actual: "2000" };
    const result = mapBudgetMonthlyRow(row);
    expect(result.actual).toBe(2000);
  });
});
