/** Unit tests for the charts route row mapper functions. */

import { describe, it, expect } from "vitest";
import { mapCountryTotalRow } from "./charts";

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
