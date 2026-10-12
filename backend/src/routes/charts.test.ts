/** Unit tests for the charts route row mapper functions. */

import { describe, it, expect } from "vitest";
import { mapCountryTotalRow, excludeIncomeRows, extractIncomeTotal, INCOME_CATEGORY } from "./charts";

describe("extractIncomeTotal", () => {
  it("negates the stored-negative income total into a positive amount", () => {
    const rows = [
      { category: "Groceries", total: 500 },
      { category: INCOME_CATEGORY, total: -70061.05 },
    ];
    expect(extractIncomeTotal(rows)).toBeCloseTo(70061.05);
  });

  it("returns 0 when there is no income row", () => {
    expect(extractIncomeTotal([{ category: "Groceries", total: 500 }])).toBe(0);
  });
});

describe("excludeIncomeRows", () => {
  it("removes the Income category so it is not counted as spending", () => {
    const rows = [
      { category: "Groceries", total: 500 },
      { category: INCOME_CATEGORY, total: -67554 },
      { category: "Rent", total: 2000 },
    ];
    const result = excludeIncomeRows(rows);
    expect(result).toEqual([
      { category: "Groceries", total: 500 },
      { category: "Rent", total: 2000 },
    ]);
  });

  it("returns all rows unchanged when there is no Income row", () => {
    const rows = [{ category: "Groceries", total: 500 }];
    expect(excludeIncomeRows(rows)).toEqual(rows);
  });

  it("handles an empty array", () => {
    expect(excludeIncomeRows([])).toEqual([]);
  });
});

describe("mapCountryTotalRow", () => {
  it("maps all fields correctly", () => {
    const row = { country: "Canada", total: "1234.56", days: "10", per_day: "123.456" };
    const result = mapCountryTotalRow(row);
    expect(result.country).toBe("Canada");
    expect(result.total).toBeCloseTo(1234.56);
    expect(result.days).toBe(10);
    expect(result.perDay).toBeCloseTo(123.456);
  });

  it("handles zero days (perDay should be 0 when days is '0')", () => {
    const row = { country: "Japan", total: "500.00", days: "0", per_day: null };
    const result = mapCountryTotalRow(row);
    expect(result.days).toBe(0);
    expect(result.perDay).toBe(0);
  });

  it("handles null per_day (perDay = 0)", () => {
    const row = { country: "France", total: "999.99", days: "5", per_day: null };
    const result = mapCountryTotalRow(row);
    expect(result.perDay).toBe(0);
  });
});
