/** Unit tests for the Scotiabank credit card CSV parser. */

import { describe, it, expect } from "vitest";
import { ScotiabankParser } from "./scotiabank";

const debitRow = (overrides: Partial<Record<string, string>> = {}): Record<string, string> => ({
  Filter: "",
  Date: "2024-03-15",
  Description: "TIM HORTONS  ",
  "Sub-description": "Toronto ON",
  Status: "posted",
  "Type of Transaction": "Debit",
  Amount: "5.25",
  ...overrides,
});

const creditBankRow = (): Record<string, string> => ({
  Filter: "",
  Date: "2024-03-17",
  Description: "SCOTIABANK PAYMENT THANK YOU",
  "Sub-description": "",
  Status: "posted",
  "Type of Transaction": "Credit",
  Amount: "-200.00",
});

const creditRefundRow = (): Record<string, string> => ({
  Filter: "",
  Date: "2024-03-18",
  Description: "AMAZON REFUND",
  "Sub-description": "",
  Status: "posted",
  "Type of Transaction": "Credit",
  Amount: "-15.00",
});

const parser = new ScotiabankParser();

describe("ScotiabankParser", () => {
  describe("fixedFields", () => {
    it("includes all Scotiabank column names", () => {
      expect(parser.fixedFields).toEqual([
        "Date",
        "Description",
        "Sub-description",
        "Status",
        "Type of Transaction",
        "Amount",
      ]);
    });
  });

  describe("field mapping", () => {
    it("maps Date to date", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("2024-03-15"));
    });

    it("maps Description to description (trimmed)", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("TIM HORTONS");
    });

    it("maps Amount to amountHome as a float", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(5.25);
    });

    it("sets paymentMethod to Scotiabank Visa", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Scotiabank Visa");
    });

    it("sets sourceFormat to scotiabank", () => {
      const result = parser.parse([debitRow()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("scotiabank");
    });
  });

  describe("payment filtering", () => {
    it("skips Credit rows matching the bank keyword list", () => {
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
      const row = creditBankRow();
      row.Description = "td canada trust payment";
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
      expect(result.skippedPayments).toBe(1);
    });
  });

  describe("refund handling", () => {
    it("includes Credit rows NOT matching bank list as negative transactions", () => {
      const result = parser.parse([creditRefundRow()], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].amountHome).toBe(-15);
      expect(result.transactions[0].description).toBe("AMAZON REFUND");
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const rows = [debitRow({ Date: "not-a-date" }), debitRow()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "Date" });
      expect(result.errors[0].message).toContain("not-a-date");
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
        debitRow({ Date: "2024-03-15" }),
        debitRow({ Date: "2024-03-20" }),
        creditBankRow(),
        creditRefundRow(),
      ];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.dateRange.from).toEqual(new Date("2024-03-15"));
      expect(result.dateRange.to).toEqual(new Date("2024-03-20"));
    });
  });
});
