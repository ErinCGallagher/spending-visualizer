/** Unit tests for the budgets route row mapper functions. */

import { describe, it, expect } from "vitest";
import {
  mapBudgetMonthlyRow,
  mapBudgetCategoryRow,
  mapIncomeMonthlyRow,
  mapUnbudgetedMonthlyRow,
  mapPensionMonthlyRow,
  excludeIncomeCategories,
} from "./budgets";

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

describe("mapBudgetCategoryRow", () => {
  it("maps all fields including parent info and parses the monthly amount", () => {
    const row = {
      category_id: "c1",
      category_name: "Groceries",
      parent_id: "p1",
      parent_name: "Food",
      monthly_amount: "412.50",
    };
    const result = mapBudgetCategoryRow(row);
    expect(result).toEqual({
      categoryId: "c1",
      categoryName: "Groceries",
      parentId: "p1",
      parentName: "Food",
      monthlyAmount: 412.5,
    });
  });

  it("passes through null parent fields for top-level categories", () => {
    const row = {
      category_id: "c2",
      category_name: "Rent",
      parent_id: null,
      parent_name: null,
      monthly_amount: "2000",
    };
    const result = mapBudgetCategoryRow(row);
    expect(result.parentId).toBeNull();
    expect(result.parentName).toBeNull();
  });
});

describe("mapIncomeMonthlyRow", () => {
  it("negates amount_home since income transactions are stored negative", () => {
    const row = { month: "2026-03", category_id: "i1", category_name: "Salary", actual: "-5000.00" };
    const result = mapIncomeMonthlyRow(row);
    expect(result).toEqual({
      month: "2026-03",
      categoryId: "i1",
      categoryName: "Salary",
      actual: 5000,
    });
  });

  it("still produces a positive figure for a positive raw sum (e.g. a refunded income entry)", () => {
    const row = { month: "2026-04", category_id: "i1", category_name: "Salary", actual: "120.00" };
    const result = mapIncomeMonthlyRow(row);
    expect(result.actual).toBe(-120);
  });
});

describe("mapUnbudgetedMonthlyRow", () => {
  it("maps month and parses the actual amount", () => {
    const row = { month: "2026-03", actual: "87.25" };
    const result = mapUnbudgetedMonthlyRow(row);
    expect(result).toEqual({ month: "2026-03", actual: 87.25 });
  });
});

describe("mapPensionMonthlyRow", () => {
  it("maps month and parses the amount", () => {
    const row = { month: "2026-03", amount: "450.00" };
    const result = mapPensionMonthlyRow(row);
    expect(result).toEqual({ month: "2026-03", amount: 450 });
  });
});

describe("excludeIncomeCategories", () => {
  it("removes a category whose id is in the income tree, e.g. a budget set directly on Income", () => {
    const categories = [
      { categoryId: "c1", categoryName: "Groceries" },
      { categoryId: "income-parent", categoryName: "Income" },
    ];
    const result = excludeIncomeCategories(categories, ["income-parent", "income-child"]);
    expect(result).toEqual([{ categoryId: "c1", categoryName: "Groceries" }]);
  });

  it("returns the list unchanged when no categories are in the income tree", () => {
    const categories = [{ categoryId: "c1", categoryName: "Groceries" }];
    expect(excludeIncomeCategories(categories, [])).toEqual(categories);
  });
});
