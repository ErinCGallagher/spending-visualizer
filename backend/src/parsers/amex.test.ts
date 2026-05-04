/** Unit tests for the American Express CSV parser. */

import { describe, it, expect } from "vitest";
import { AmexParser } from "./amex";

const rows = [
  { Date: "01 Feb 2024", Description: "STARBUCKS", Amount: "10.50", "Account #": "-42006" },
  { Date: "05 Feb 2024", Description: "AMAZON.CA", Amount: "45.99", "Account #": "-61005" },
  { Date: "10 Feb 2024", Description: "PAYMENT RECEIVED - THANK YOU", Amount: "-100.00", "Account #": "-42006" },
  { Date: "15 Feb 2024", Description: "UBER", Amount: "25.00", "Account #": "-12345" },
];

const parser = new AmexParser({
  "42006": "Amex Gold",
  "61005": "Amex Cobalt",
});

describe("AmexParser", () => {
  describe("fixedFields", () => {
    it("includes all Amex column names", () => {
      expect(parser.fixedFields).toEqual(["Date", "Description", "Amount", "Account #"]);
    });
  });

  describe("field mapping", () => {
    it("maps Date to date", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("01 Feb 2024"));
    });

    it("maps Description to description", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("STARBUCKS");
    });

    it("maps Amount to amountHome as a float", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(10.50);
      expect(result.transactions[1].amountHome).toBe(45.99);
    });

    it("maps Account # to paymentMethod (known cards)", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Amex Gold");
      expect(result.transactions[1].paymentMethod).toBe("Amex Cobalt");
    });

    it("defaults unknown Account # to Amex with suffix", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      // Index 2 is UBER because the payment was skipped
      expect(result.transactions[2].paymentMethod).toBe("Amex (...12345)");
    });

    it("sets sourceFormat to amex", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("amex");
    });
  });

  describe("payment filtering", () => {
    it("excludes 'PAYMENT RECEIVED' rows", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(3);
      expect(result.transactions.every(tx => !tx.description.includes("PAYMENT RECEIVED"))).toBe(true);
    });

    it("counts skipped payments", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(1);
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const badRows = [
        { Date: "not-a-date", Description: "STARBUCKS", Amount: "10.50", "Account #": "-42006" },
        rows[0],
      ];
      const result = parser.parse(badRows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "Date" });
      expect(result.errors[0].message).toContain("not-a-date");
    });
  });

  describe("dateRange", () => {
    it("reflects min and max dates", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.dateRange.from).toEqual(new Date("01 Feb 2024"));
      expect(result.dateRange.to).toEqual(new Date("15 Feb 2024"));
    });
  });

  describe("homeCurrency", () => {
    it("defaults to CAD", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });
  });
});
