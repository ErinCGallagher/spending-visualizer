/** Unit tests for the RBC Avion Visa CSV parser. */

import { describe, it, expect } from "vitest";
import { RBCAvionParser } from "./rbc-avion";

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    "Account Type": "Visa",
    "Account Number": "4000000000000000",
    "Transaction Date": "6/15/2026",
    "Cheque Number": "",
    "Description 1": "ARITZIA.COM 855-274-8942",
    "Description 2": "",
    "CAD$": "-198.88",
    "USD$": "",
    ...overrides,
  };
}

const parser = new RBCAvionParser();

describe("RBCAvionParser", () => {
  describe("fixedFields", () => {
    it("includes all RBC Avion column names", () => {
      expect(parser.fixedFields).toEqual([
        "Account Type",
        "Account Number",
        "Transaction Date",
        "Cheque Number",
        "Description 1",
        "Description 2",
        "CAD$",
        "USD$",
      ]);
    });
  });

  describe("field mapping", () => {
    it("maps Transaction Date to date", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("6/15/2026"));
    });

    it("maps Description 1 (trimmed) to description", () => {
      const result = parser.parse([row({ "Description 1": "  ARITZIA.COM 855-274-8942  " })], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("ARITZIA.COM 855-274-8942");
    });

    it("flips a negative CAD$ (purchase) to a positive spend", () => {
      const result = parser.parse([row({ "CAD$": "-198.88" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(198.88);
    });

    it("flips a positive CAD$ (merchant credit/refund) to a negative amount", () => {
      const result = parser.parse([row({ "Description 1": "La Maison Simons Quebec", "CAD$": "141.14" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(-141.14);
    });

    it("sets paymentMethod to RBC Avion Visa", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("RBC Avion Visa");
    });

    it("sets sourceFormat to rbc-avion", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("rbc-avion");
    });

    it("preserves the raw row", () => {
      const r = row();
      const result = parser.parse([r], "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(r);
    });
  });

  describe("payment filtering", () => {
    it("excludes PAYMENT - THANK YOU / PAI EMENT - MERCI rows", () => {
      const rows = [row({ "Description 1": "PAYMENT - THANK YOU / PAI EMENT - MERCI", "CAD$": "266.52" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => !tx.description.includes("THANK YOU"))).toBe(true);
    });

    it("excludes AUTOMATIC PAYMENT -THANK YOU rows", () => {
      const rows = [row({ "Description 1": "AUTOMATIC PAYMENT -THANK YOU", "CAD$": "9.73" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => !tx.description.includes("THANK YOU"))).toBe(true);
    });

    it("counts skipped payment rows in skippedPayments", () => {
      const rows = [
        row({ "Description 1": "PAYMENT - THANK YOU / PAI EMENT - MERCI", "CAD$": "266.52" }),
        row({ "Description 1": "AUTOMATIC PAYMENT -THANK YOU", "CAD$": "9.73" }),
        row(),
      ];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(2);
    });

    it("omits skippedPayments when there are no payment rows", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.skippedPayments).toBeUndefined();
    });
  });

  describe("invalid amount", () => {
    it("skips the row and records an error for a non-numeric CAD$", () => {
      const rows = [row({ "CAD$": "N/A" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "CAD$" });
      expect(result.errors[0].message).toContain("N/A");
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const rows = [row({ "Transaction Date": "not-a-date" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "Transaction Date" });
      expect(result.errors[0].message).toContain("not-a-date");
    });
  });

  describe("homeCurrency", () => {
    it("is always CAD", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });

    it("defaults to CAD when input is empty", () => {
      const result = parser.parse([], "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });
  });

  describe("empty input", () => {
    it("returns a valid empty ParseResult", () => {
      const result = parser.parse([], "upload-1", "user-1");
      expect(result.transactions).toEqual([]);
      expect(result.travellers).toEqual([]);
      expect(result.categories).toEqual([]);
      expect(result.errors).toEqual([]);
      expect(result.homeCurrency).toBe("CAD");
      expect(result.dateRange).toEqual({ from: expect.any(Date), to: expect.any(Date) });
    });
  });
});
