import { describe, it, expect } from "vitest";
import { formatAmount, formatCurrency, formatDate } from "./format";

describe("Format Utilities", () => {
  describe("formatAmount", () => {
    it("formats with currency narrow symbol", () => {
      expect(formatAmount(1234.56, "CAD")).toBe("$1,235");
    });

    it("formats with decimals", () => {
      expect(formatAmount(1234.56, "CAD", 2)).toBe("$1,234.56");
    });

    it("formats without currency", () => {
      expect(formatAmount(1234.56)).toBe("1,235");
    });
  });

  describe("formatCurrency", () => {
    it("formats with currency code at the end", () => {
      expect(formatCurrency(1234.56, "CAD", 2)).toBe("1,234.56 CAD");
    });
  });

  describe("formatDate", () => {
    it("formats ISO date to human readable", () => {
      expect(formatDate("2024-05-03")).toBe("May 3, 2024");
    });

    it("handles single digit days/months", () => {
      expect(formatDate("2024-01-01")).toBe("Jan 1, 2024");
    });
  });
});
