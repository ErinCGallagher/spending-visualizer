import { describe, it, expect } from "vitest";
import {
  aggregateMonthlyActuals,
  computeBudgetStats,
  computeCategoryBudgetVsActual,
  groupCategoryBreakdown,
} from "./budgetStats";

describe("aggregateMonthlyActuals", () => {
  it("sums per-category actuals into one total per month, sorted ascending", () => {
    const result = aggregateMonthlyActuals([
      { month: "2026-02", actual: 100 },
      { month: "2026-01", actual: 50 },
      { month: "2026-01", actual: 25 },
    ]);
    expect(result).toEqual([
      { month: "2026-01", actual: 75 },
      { month: "2026-02", actual: 100 },
    ]);
  });

  it("returns an empty array for no input", () => {
    expect(aggregateMonthlyActuals([])).toEqual([]);
  });
});

describe("computeBudgetStats", () => {
  it("computes YTD actual/budget and averages for months within the current year", () => {
    const now = new Date(2026, 2, 15);
    const monthlyTotals = [
      { month: "2026-01", actual: 100 },
      { month: "2026-02", actual: 200 },
      { month: "2026-03", actual: 150 },
    ];
    const stats = computeBudgetStats(monthlyTotals, 120, now);
    expect(stats.ytdActual).toBe(450);
    expect(stats.ytdBudget).toBe(360); // 120 * 3 months (Jan-Mar)
    expect(stats.avgMonthlyActual).toBeCloseTo(150);
    expect(stats.avgMonthlyBudget).toBe(120);
  });

  it("excludes prior-year months from YTD but includes them in the average", () => {
    const now = new Date(2026, 1, 1);
    const monthlyTotals = [
      { month: "2025-12", actual: 300 },
      { month: "2026-01", actual: 100 },
    ];
    const stats = computeBudgetStats(monthlyTotals, 100, now);
    expect(stats.ytdActual).toBe(100);
    expect(stats.ytdBudget).toBe(200); // 100 * 2 months (Jan-Feb)
    expect(stats.avgMonthlyActual).toBeCloseTo(200);
  });

  it("returns zeros when there is no monthly data", () => {
    const stats = computeBudgetStats([], 500, new Date(2026, 5, 1));
    expect(stats.ytdActual).toBe(0);
    expect(stats.avgMonthlyActual).toBe(0);
    expect(stats.ytdBudget).toBe(3000); // 500 * 6 months
    expect(stats.avgMonthlyBudget).toBe(500);
  });

  it("scopes all four figures to a single selected month, ignoring now", () => {
    const now = new Date(2026, 9, 15); // October — would normally mean 10 months elapsed
    const monthlyTotals = [
      { month: "2026-01", actual: 999 },
      { month: "2026-03", actual: 80 },
      { month: "2026-04", actual: 999 },
    ];
    const stats = computeBudgetStats(monthlyTotals, 100, now, "2026-03");
    expect(stats.ytdActual).toBe(80);
    expect(stats.ytdBudget).toBe(100);
    expect(stats.avgMonthlyActual).toBe(80);
    expect(stats.avgMonthlyBudget).toBe(100);
  });

  it("includes a prior-year selected month, unlike the default YTD path", () => {
    const now = new Date(2026, 9, 15);
    const monthlyTotals = [{ month: "2025-12", actual: 300 }];
    const stats = computeBudgetStats(monthlyTotals, 100, now, "2025-12");
    expect(stats.ytdActual).toBe(300);
    expect(stats.avgMonthlyActual).toBe(300);
  });
});

describe("computeCategoryBudgetVsActual", () => {
  it("scales each category's budget by the number of elapsed months in the year", () => {
    const now = new Date(2026, 2, 15); // March — 3 months elapsed
    const categories = [
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", monthlyAmount: 100 },
      { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", monthlyAmount: 50 },
    ];
    const monthly = [
      { month: "2026-01", categoryId: "c1", categoryName: "Groceries", actual: 90 },
      { month: "2026-02", categoryId: "c1", categoryName: "Groceries", actual: 110 },
      { month: "2026-01", categoryId: "c2", categoryName: "Dining", actual: 40 },
    ];

    const result = computeCategoryBudgetVsActual(categories, monthly, now);

    expect(result).toEqual([
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
      { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 40 },
    ]);
  });

  it("excludes prior-year and future actuals from the category total", () => {
    const now = new Date(2026, 0, 15); // January — 1 month elapsed
    const categories = [
      { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, monthlyAmount: 100 },
    ];
    const monthly = [
      { month: "2025-12", categoryId: "c1", categoryName: "Groceries", actual: 500 },
      { month: "2026-01", categoryId: "c1", categoryName: "Groceries", actual: 80 },
      { month: "2026-02", categoryId: "c1", categoryName: "Groceries", actual: 999 },
    ];

    const result = computeCategoryBudgetVsActual(categories, monthly, now);

    expect(result).toEqual([
      { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, budgeted: 100, actual: 80 },
    ]);
  });

  it("returns an empty array when there are no budgeted categories", () => {
    expect(computeCategoryBudgetVsActual([], [], new Date(2026, 5, 1))).toEqual([]);
  });

  it("scopes budgeted and actual to a single selected month, ignoring now", () => {
    const now = new Date(2026, 9, 15); // October — would normally mean 10 months elapsed
    const categories = [
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", monthlyAmount: 100 },
    ];
    const monthly = [
      { month: "2025-03", categoryId: "c1", categoryName: "Groceries", actual: 999 },
      { month: "2026-03", categoryId: "c1", categoryName: "Groceries", actual: 80 },
      { month: "2026-04", categoryId: "c1", categoryName: "Groceries", actual: 999 },
    ];

    const result = computeCategoryBudgetVsActual(categories, monthly, now, "2026-03");

    expect(result).toEqual([
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 100, actual: 80 },
    ]);
  });

  it("includes a prior-year selected month, unlike the default YTD path", () => {
    const now = new Date(2026, 9, 15);
    const categories = [
      { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, monthlyAmount: 100 },
    ];
    const monthly = [{ month: "2025-12", categoryId: "c1", categoryName: "Groceries", actual: 300 }];

    const result = computeCategoryBudgetVsActual(categories, monthly, now, "2025-12");

    expect(result).toEqual([
      { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, budgeted: 100, actual: 300 },
    ]);
  });
});

describe("groupCategoryBreakdown", () => {
  it("groups child categories under their parent's name, summing totals", () => {
    const data = [
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
      { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 40 },
    ];

    const result = groupCategoryBreakdown(data);

    expect(result).toEqual([
      {
        key: "p1",
        label: "Food",
        budgeted: 450,
        actual: 240,
        children: [
          { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 40 },
          { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
        ],
      },
    ]);
  });

  it("treats a category with no parent as its own single-row group", () => {
    const data = [
      { categoryId: "c1", categoryName: "Rent", parentId: null, parentName: null, budgeted: 2000, actual: 2000 },
    ];

    const result = groupCategoryBreakdown(data);

    expect(result).toEqual([
      {
        key: "c1",
        label: "Rent",
        budgeted: 2000,
        actual: 2000,
        children: [
          { categoryId: "c1", categoryName: "Rent", parentId: null, parentName: null, budgeted: 2000, actual: 2000 },
        ],
      },
    ]);
  });

  it("merges a directly-budgeted parent with its budgeted children into one group", () => {
    const data = [
      { categoryId: "p1", categoryName: "Food", parentId: null, parentName: null, budgeted: 100, actual: 80 },
      { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
    ];

    const result = groupCategoryBreakdown(data);

    expect(result).toHaveLength(1);
    expect(result[0].key).toBe("p1");
    expect(result[0].budgeted).toBe(400);
    expect(result[0].actual).toBe(280);
    expect(result[0].children).toHaveLength(2);
  });

  it("sorts groups alphabetically by label", () => {
    const data = [
      { categoryId: "c2", categoryName: "Transit", parentId: null, parentName: null, budgeted: 50, actual: 10 },
      { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, budgeted: 300, actual: 200 },
    ];

    const result = groupCategoryBreakdown(data);

    expect(result.map((g) => g.label)).toEqual(["Groceries", "Transit"]);
  });

  it("returns an empty array for no input", () => {
    expect(groupCategoryBreakdown([])).toEqual([]);
  });
});
