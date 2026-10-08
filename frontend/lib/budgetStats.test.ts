import { describe, it, expect } from "vitest";
import { aggregateMonthlyActuals, computeBudgetStats } from "./budgetStats";

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
});
