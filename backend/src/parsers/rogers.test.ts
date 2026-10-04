/** Unit tests for the Rogers Bank Mastercard CSV parser. */

import { describe, it, expect } from "vitest";
import { RogersParser } from "./rogers";

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    Date: "2026-01-15",
    "Posted Date": "2026-01-15",
    "Reference Number": "00000000000000000000000",
    "Activity Type": "TRANS",
    "Activity Status": "APPROVED",
    "Card Number": "************0000",
    "Merchant Category Description": "Charitable and Social Service Organizations",
    "Merchant Name": "SICKKIDS FDN",
    "Merchant City": "DOWNTOWN TORO",
    "Merchant State or Province": "ON",
    "Merchant Country Code": "CAN",
    "Merchant Postal Code": "M5G2L3",
    Amount: "$40.00",
    Rewards: "",
    "Name on Card": "JANE A DOE",
    ...overrides,
  };
}

const parser = new RogersParser();

describe("RogersParser", () => {
  describe("fixedFields", () => {
    it("includes all Rogers column names", () => {
      expect(parser.fixedFields).toEqual([
        "Date",
        "Posted Date",
        "Reference Number",
        "Activity Type",
        "Activity Status",
        "Card Number",
        "Merchant Category Description",
        "Merchant Name",
        "Merchant City",
        "Merchant State or Province",
        "Merchant Country Code",
        "Merchant Postal Code",
        "Amount",
        "Rewards",
        "Name on Card",
      ]);
    });
  });

  describe("field mapping", () => {
    it("maps Date to date", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("2026-01-15"));
    });

    it("maps Merchant Name (trimmed) to description", () => {
      const result = parser.parse([row({ "Merchant Name": "  SICKKIDS FDN  " })], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("SICKKIDS FDN");
    });

    it("maps a dollar-signed Amount to a positive float", () => {
      const result = parser.parse([row({ Amount: "$40.00" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(40);
    });

    it("maps a comma-separated Amount to a float", () => {
      const result = parser.parse([row({ Amount: "$1,392.10" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(1392.1);
    });

    it("sets paymentMethod to Rogers Mastercard", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Rogers Mastercard");
    });

    it("sets sourceFormat to rogers", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("rogers");
    });

    it("preserves the raw row", () => {
      const r = row();
      const result = parser.parse([r], "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(r);
    });
  });

  describe("payment filtering", () => {
    it("excludes PAYMENT THANK YOU rows with a negative dollar-signed amount", () => {
      const rows = [row({ "Merchant Name": "PAYMENT THANK YOU", "Merchant Category Description": "", Amount: "-$436.61" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => tx.description !== "PAYMENT THANK YOU")).toBe(true);
    });

    it("counts skipped PAYMENT THANK YOU rows in skippedPayments", () => {
      const rows = [row({ "Merchant Name": "PAYMENT THANK YOU", Amount: "-$436.61" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(1);
    });

    it("omits skippedPayments when there are no payment rows", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.skippedPayments).toBeUndefined();
    });
  });

  describe("invalid amount", () => {
    it("skips the row and records an error for a non-numeric amount", () => {
      const rows = [row({ Amount: "N/A" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "Amount" });
      expect(result.errors[0].message).toContain("N/A");
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const rows = [row({ Date: "not-a-date" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "Date" });
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
