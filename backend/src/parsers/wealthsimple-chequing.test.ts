/** Unit tests for the Wealthsimple chequing CSV parser. */

import { describe, it, expect } from "vitest";
import { WealthsimpleChequingParser } from "./wealthsimple-chequing";

function row(overrides: Partial<Record<string, string>> = {}): Record<string, string> {
  return {
    effective_date: "2026-01-02",
    effective_time: "21:36:08",
    settlement_date: "",
    account_id: "WK00000000CAD",
    account_type: "Chequing",
    activity_type: "MoneyMovement",
    activity_sub_type: "P2P",
    description: "Cash sent",
    direction: "",
    symbol: "",
    name: "",
    currency: "CAD",
    quantity: "-150",
    unit_price: "",
    commission: "",
    net_cash_amount: "-150",
    ...overrides,
  };
}

const parser = new WealthsimpleChequingParser();

describe("WealthsimpleChequingParser", () => {
  describe("fixedFields", () => {
    it("includes all Wealthsimple chequing column names", () => {
      expect(parser.fixedFields).toEqual([
        "effective_date",
        "effective_time",
        "settlement_date",
        "account_id",
        "account_type",
        "activity_type",
        "activity_sub_type",
        "description",
        "direction",
        "symbol",
        "name",
        "currency",
        "quantity",
        "unit_price",
        "commission",
        "net_cash_amount",
      ]);
    });
  });

  describe("field mapping", () => {
    it("maps effective_date to date", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("2026-01-02"));
    });

    it("maps description to description", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("Cash sent");
    });

    it("flips a negative net_cash_amount (money out) to a positive spend", () => {
      const result = parser.parse([row({ net_cash_amount: "-150" })], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(150);
    });

    it("flips a positive net_cash_amount (money in) to a negative amount", () => {
      const result = parser.parse(
        [row({ activity_sub_type: "-", description: "Interest received (executed at 2026-01-01)", net_cash_amount: "89.84" })],
        "upload-1",
        "user-1"
      );
      expect(result.transactions[0].amountHome).toBe(-89.84);
    });

    it("sets paymentMethod to Wealthsimple Chequing", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Wealthsimple Chequing");
    });

    it("sets sourceFormat to wealthsimple-chequing", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("wealthsimple-chequing");
    });

    it("preserves the raw row", () => {
      const r = row();
      const result = parser.parse([r], "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(r);
    });
  });

  describe("payment filtering", () => {
    it("excludes OBP_OUT (online bill payment) rows from transactions", () => {
      const rows = [row({ activity_sub_type: "OBP_OUT", description: "Online bill payment (executed at 2026-01-06)", net_cash_amount: "-139.13" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => tx.description !== "Online bill payment (executed at 2026-01-06)")).toBe(true);
    });

    it("excludes TRANSFER rows for credit card payments", () => {
      const rows = [row({ activity_sub_type: "TRANSFER", description: "Credit card payment", net_cash_amount: "-132.88" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.transactions.every((tx) => tx.description !== "Credit card payment")).toBe(true);
    });

    it("does not exclude other TRANSFER rows, like internal transfers", () => {
      const rows = [row({ activity_sub_type: "TRANSFER", description: "Money transfer into the account (executed at 2026-04-28)", net_cash_amount: "500" })];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
    });

    it("counts skipped rows in skippedPayments", () => {
      const rows = [
        row({ activity_sub_type: "OBP_OUT", description: "Online bill payment (executed at 2026-01-06)", net_cash_amount: "-139.13" }),
        row({ activity_sub_type: "TRANSFER", description: "Credit card payment", net_cash_amount: "-132.88" }),
        row(),
      ];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.skippedPayments).toBe(2);
    });

    it("omits skippedPayments when there are no excluded rows", () => {
      const result = parser.parse([row()], "upload-1", "user-1");
      expect(result.skippedPayments).toBeUndefined();
    });
  });

  describe("invalid amount", () => {
    it("skips the row and records an error for a non-numeric net_cash_amount", () => {
      const rows = [row({ net_cash_amount: "N/A" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "net_cash_amount" });
      expect(result.errors[0].message).toContain("N/A");
    });
  });

  describe("invalid date", () => {
    it("skips the row and records an error for a malformed date", () => {
      const rows = [row({ effective_date: "not-a-date" }), row()];
      const result = parser.parse(rows, "upload-1", "user-1");
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ row: 1, field: "effective_date" });
      expect(result.errors[0].message).toContain("not-a-date");
    });
  });

  describe("homeCurrency", () => {
    it("reads homeCurrency from the first row's currency field", () => {
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
