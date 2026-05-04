/** Unit tests for the Wealthsimple CSV parser. */

import { describe, it, expect } from "vitest";
import { WealthsimpleParser } from "./wealthsimple";

const rows = [
  { transaction_date: "2026-02-04", post_date: "2026-02-05", type: "Purchase", details: "IZI*MOUNTAIN VIEW EXPERIE", amount: "182.05", currency: "CAD" },
  { transaction_date: "2026-02-07", post_date: "2026-02-09", type: "Purchase", details: "H&M", amount: "34.3", currency: "CAD" },
  { transaction_date: "2026-02-12", post_date: "2026-02-12", type: "Payment", details: "From chequing account", amount: "-444.15", currency: "CAD" },
];

const parser = new WealthsimpleParser();

describe("WealthsimpleParser", () => {
  describe("fixedFields", () => {
    it("includes all Wealthsimple column names", () => {
      expect(parser.fixedFields).toEqual(["transaction_date", "post_date", "type", "details", "amount", "currency"]);
    });
  });

  describe("field mapping", () => {
    it("maps transaction_date to date", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("2026-02-04"));
    });

    it("maps details to description (trimmed)", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("IZI*MOUNTAIN VIEW EXPERIE");
    });

    it("maps amount to amountHome as a positive float", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(182.05);
      expect(result.transactions[1].amountHome).toBe(34.3);
    });

    it("sets amountLocal to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].amountLocal).toBeNull();
    });

    it("sets localCurrency to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].localCurrency).toBeNull();
    });

    it("sets categoryName to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].categoryName).toBeNull();
    });

    it("sets categorySource to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].categorySource).toBeNull();
    });

    it("sets paymentMethod to Wealthsimple Visa", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Wealthsimple Visa");
    });

    it("sets country to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].country).toBeNull();
    });

    it("sets payer to null", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].payer).toBeNull();
    });

    it("sets sourceFormat to wealthsimple", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("wealthsimple");
    });

    it("sets splits to empty array", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].splits).toEqual([]);
    });

    it("preserves the raw row", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(rows[0]);
    });
  });

  describe("payment filtering", () => {
    it("excludes Payment rows from transactions", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((tx) => tx.description !== "From chequing account")).toBe(true);
    });

    it("counts skipped Payment rows in skippedPayments", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(1);
    });

    it("omits skippedPayments when there are no payment rows", () => {
      const purchasesOnly = rows.filter((r) => r.type === "Purchase");
      const result = parser.parse(purchasesOnly, "upload-1", "user-1");
      expect(result.skippedPayments).toBeUndefined();
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const badRows = [
        { ...rows[0], transaction_date: "not-a-date" },
        rows[1],
      ];
      const result = parser.parse(badRows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "transaction_date" });
      expect(result.errors[0].message).toContain("not-a-date");
    });
  });

  describe("homeCurrency", () => {
    it("reads homeCurrency from the first row's currency field", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });

    it("defaults to CAD when input is empty", () => {
      const result = parser.parse([], "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });
  });

  describe("ParseResult shape", () => {
    it("returns empty travellers array", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.travellers).toEqual([]);
    });

    it("returns empty categories array", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.categories).toEqual([]);
    });

    it("returns empty errors array", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.errors).toEqual([]);
    });
  });

  describe("dateRange", () => {
    it("reflects min and max dates from Purchase rows only", () => {
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.dateRange.from).toEqual(new Date("2026-02-04"));
      expect(result.dateRange.to).toEqual(new Date("2026-02-07"));
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
