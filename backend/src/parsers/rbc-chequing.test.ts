/** Unit tests for the RBC chequing CSV parser. */

import { describe, it, expect } from "vitest";
import { RBCChequingParser } from "./rbc-chequing";

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    "Account Type": "Chequing",
    "Account Number": "00000-0000000",
    "Transaction Date": "1/5/2026",
    "Cheque Number": "",
    "Description 1": "MORTGAGE PAYMENT",
    "Description 2": "",
    "CAD$": "-473.73",
    "USD$": "",
    ...overrides,
  };
}

const parser = new RBCChequingParser();

describe("RBCChequingParser", () => {
  describe("fixedFields", () => {
    it("includes all RBC chequing column names", () => {
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
      expect(result.transactions[0].date).toEqual(new Date("1/5/2026"));
    });

    it("maps Description 1 (trimmed) to description", () => {
      const result = parser.parse([row({ "Description 1": "  MORTGAGE PAYMENT  " })], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("MORTGAGE PAYMENT");
    });

    it("flips a negative CAD$ (money out) to a positive spend", () => {
      const result = parser.parse([row({ "CAD$": "-473.73" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(473.73);
    });

    it("flips a positive CAD$ (money in) to a negative amount", () => {
      const result = parser.parse([row({ "Description 1": "E-TRANSFER - AUTODEPOSIT KRISTEN C1A8HM63AJCB", "CAD$": "1081" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(-1081);
    });

    it("sets paymentMethod to RBC Chequing", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("RBC Chequing");
    });

    it("sets sourceFormat to rbc-chequing", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("rbc-chequing");
    });

    it("preserves the raw row", () => {
      const r = row();
      const result = parser.parse([r], "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(r);
    });
  });

  describe("payment filtering", () => {
    it("excludes ONLINE BANKING PAYMENT rows (bill payments)", () => {
      const rows = [row({ "Description 1": "ONLINE BANKING PAYMENT - 3174 ROGERS BANK", "CAD$": "-4.51" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => !tx.description.startsWith("ONLINE BANKING PAYMENT"))).toBe(true);
    });

    it("excludes ONLINE BANKING TRANSFER rows", () => {
      const rows = [row({ "Description 1": "ONLINE BANKING TRANSFER - 8546", "CAD$": "-266.52" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => !tx.description.startsWith("ONLINE BANKING TRANSFER"))).toBe(true);
    });

    it("excludes INVESTMENT WS INVESTMENTS rows", () => {
      const rows = [row({ "Description 1": "INVESTMENT WS INVESTMENTS", "CAD$": "40000" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => tx.description !== "INVESTMENT WS INVESTMENTS")).toBe(true);
    });

    it("excludes MISC PAYMENT RBC CREDIT CARD rows", () => {
      const rows = [row({ "Description 1": "MISC PAYMENT RBC CREDIT CARD", "CAD$": "-9.73" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => tx.description !== "MISC PAYMENT RBC CREDIT CARD")).toBe(true);
    });

    it("includes CASH WITHDRAWAL BR TO BR rows as spend", () => {
      const rows = [row({ "Description 1": "CASH WITHDRAWAL BR TO BR - 6702", "CAD$": "-8709.95" })];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amountHome).toBe(8709.95);
    });

    it("does not exclude other MISC PAYMENT rows, like condo fees or utilities", () => {
      const rows = [row({ "Description 1": "MISC PAYMENT TSCC . 1950", "CAD$": "-625.13" })];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
    });

    it("counts skipped rows in skippedPayments", () => {
      const rows = [
        row({ "Description 1": "ONLINE BANKING PAYMENT - 3174 ROGERS BANK", "CAD$": "-4.51" }),
        row({ "Description 1": "ONLINE BANKING TRANSFER - 8546", "CAD$": "-266.52" }),
        row({ "Description 1": "INVESTMENT WS INVESTMENTS", "CAD$": "40000" }),
        row({ "Description 1": "MISC PAYMENT RBC CREDIT CARD", "CAD$": "-9.73" }),
        row(),
      ];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(4);
    });

    it("omits skippedPayments when there are no excluded rows", () => {
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
