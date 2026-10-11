/** Unit tests for the pension contributions request body validator. */

import { describe, it, expect } from "vitest";
import { parsePensionBody } from "./pensionValidation";

describe("parsePensionBody", () => {
  it("accepts a valid payload", () => {
    const { year, contributions, errors } = parsePensionBody({
      year: 2026,
      contributions: [
        { month: 1, amount: 200 },
        { month: 2, amount: 0 },
      ],
    });
    expect(errors).toHaveLength(0);
    expect(year).toBe(2026);
    expect(contributions).toEqual([
      { month: 1, amount: 200 },
      { month: 2, amount: 0 },
    ]);
  });

  it("rejects a missing year", () => {
    const { errors } = parsePensionBody({ contributions: [{ month: 1, amount: 100 }] });
    expect(errors.some((e) => e.field === "year")).toBe(true);
  });

  it("rejects a non-integer year", () => {
    const { errors } = parsePensionBody({ year: 2026.5, contributions: [] });
    expect(errors.some((e) => e.field === "year")).toBe(true);
  });

  it("rejects a missing contributions array", () => {
    const { contributions, errors } = parsePensionBody({ year: 2026 });
    expect(contributions).toHaveLength(0);
    expect(errors.some((e) => e.field === "contributions")).toBe(true);
  });

  it("accepts an empty contributions array", () => {
    const { errors } = parsePensionBody({ year: 2026, contributions: [] });
    expect(errors).toHaveLength(0);
  });

  it("rejects a month out of range", () => {
    const { errors } = parsePensionBody({ year: 2026, contributions: [{ month: 13, amount: 100 }] });
    expect(errors.some((e) => e.field === "contributions[0].month")).toBe(true);
  });

  it("rejects a month of zero", () => {
    const { errors } = parsePensionBody({ year: 2026, contributions: [{ month: 0, amount: 100 }] });
    expect(errors.some((e) => e.field === "contributions[0].month")).toBe(true);
  });

  it("rejects a negative amount", () => {
    const { errors } = parsePensionBody({ year: 2026, contributions: [{ month: 1, amount: -5 }] });
    expect(errors.some((e) => e.field === "contributions[0].amount")).toBe(true);
  });

  it("rejects a non-numeric amount", () => {
    const { errors } = parsePensionBody({ year: 2026, contributions: [{ month: 1, amount: "100" }] });
    expect(errors.some((e) => e.field === "contributions[0].amount")).toBe(true);
  });
});
