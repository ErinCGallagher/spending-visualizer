/** Unit tests for the TD credit card CSV parser. */

import { describe, it, expect } from "vitest";
import { TDParser } from "./td";

const debitRow = (overrides: Partial<Record<string, string>> = {}): Record<string, string> => ({
  date: "03/15/2024",
  description: "TIM HORTONS",
  debit: "5.25",
  credit: "",
  balance: "1000.00",
  ...overrides,
});

const creditBankRow = (): Record<string, string> => ({
  date: "03/17/2024",
  description: "TD CANADA TRUST PAYMENT",
  debit: "",
  credit: "200.00",
  balance: "1200.00",
});

const creditRefundRow = (): Record<string, string> => ({
  date: "03/18/2024",
  description: "AMAZON REFUND",
  debit: "",
  credit: "15.00",
  balance: "985.00",
});

const parser = new TDParser();

describe("TDParser", () => {
  describe("fixedFields", () => {
    it("includes all TD column names", () => {
      expect(parser.fixedFields).toEqual(["date", "description", "debit", "credit", "balance"]);
    });
  });

  describe("syntheticHeader", () => {
    it("matches fixedFields", () => {
      expect(parser.syntheticHeader).toEqual(["date", "description", "debit", "credit", "balance"]);
    });
  });

  describe("field mapping", () => {
    it("maps date (MM/DD/YYYY) to a Date object", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date(2024, 2, 15));
    });

    it("maps description to description (trimmed)", () => {
      const result = parser.parse([debitRow({ description: "TIM HORTONS  " })], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("TIM HORTONS");
    });

    it("maps debit to amountHome as a positive float", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(5.25);
    });

    it("sets paymentMethod to TD Visa", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("TD Visa");
    });

    it("sets sourceFormat to td", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("td");
    });
  });

  describe("date parsing", () => {
    it("parses MM/DD/YYYY without locale issues", () => {
      const result = parser.parse([debitRow({ date: "12/31/2023" })], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date(2023, 11, 31));
    });

    it("handles single-digit month and day", () => {
      const result = parser.parse([debitRow({ date: "1/5/2024" })], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date(2024, 0, 5));
    });
  });

  describe("payment filtering", () => {
    it("skips credit rows matching the bank keyword list", () => {
      const rows = [debitRow(), creditBankRow()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].description).toBe("TIM HORTONS");
    });

    it("counts skipped bank payment rows", () => {
      const rows = [debitRow(), creditBankRow()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(1);
    });

    it("detects bank keywords case-insensitively", () => {
      const row = { ...creditBankRow(), description: "td canada trust payment" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
      expect(result.skippedPayments).toBe(1);
    });

    it("detects all configured bank keywords", () => {
      const banks = [
        "ROYAL BANK OF CANADA",
        "SCOTIABANK",
        "BANK OF MONTREAL",
        "CIBC",
        "NATIONAL BANK",
        "DESJARDINS",
        "TANGERINE",
        "SIMPLII",
        "MERIDIAN",
        "ATB FINANCIAL",
      ];
      for (const bank of banks) {
        const row = { ...creditBankRow(), description: bank };
        const result = parser.parse([row], "upload-1", "user-1");
        expect(result.transactions).toHaveLength(0);
        expect(result.skippedPayments).toBe(1);
      }
    });
  });

  describe("refund handling", () => {
    it("includes credit rows NOT matching bank list as negative transactions", () => {
      const result = parser.parse([creditRefundRow()], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amountHome).toBe(-15);
      expect(result.transactions[0].description).toBe("AMAZON REFUND");
    });
  });

  describe("empty columns", () => {
    it("skips rows where both debit and credit are empty", () => {
      const row = debitRow({ debit: "", credit: "" });
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
    });
  });

  describe("homeCurrency", () => {
    it("defaults to CAD", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });
  });

  describe("empty input", () => {
    it("returns a valid empty result", () => {
      const result = parser.parse([], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(0);
      expect(result.skippedPayments).toBeUndefined();
    });
  });

  describe("dateRange", () => {
    it("reflects min and max dates across all included transactions", () => {
      const rows = [
        debitRow({ date: "03/15/2024" }),
        debitRow({ date: "03/20/2024" }),
        creditBankRow(),
        creditRefundRow(),
      ];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.dateRange.from).toEqual(new Date(2024, 2, 15));
      expect(result.dateRange.to).toEqual(new Date(2024, 2, 20));
    });
  });
});
