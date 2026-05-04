/** Unit tests for the TravelSpend CSV parser. */

import { describe, it, expect } from "vitest";
import { TravelSpendParser } from "./travelspend";

// Minimal valid row matching the real CSV format
const BASE_ROW: Record<string, string> = {
  amount: "20.00",
  amountInHomeCurrency: " 7.91",
  category: "Groceries",
  conversionRate: "2.529",
  country: "Peru",
  countryCode: "PE",
  datePaid: "2026-03-09",
  homeCurrency: "CAD",
  localCurrency: "PEN",
  notes: "Snacks",
  paidBy: "kristianallin",
  paidFor: "kristianallin,egal",
  kristianallin: " 3.96",
  egal: " 3.95",
  paymentMethod: "Cash",
  photo: "",
  place: "",
  latitude: "",
  longitude: "",
  type: "Expense",
  numberOfDays: "1",
  excludeFromAvg: "false",
  addToBudget: "false",
  categoryId: "shopping_cart-false-abc",
  categoryIcon: "shopping_cart",
  categoryColor: "#039BE5",
  paymentMethodId: "payments-abc",
  paymentMethodIcon: "payments",
  paymentMethodColor: "#039BE5",
  paidById: "id-kristian",
  paidToId: "",
  splitObjects: "[{\"share\":10000,\"shareInHomeCurrency\":3960,\"forTravelerId\":\"id-kristian\"},{\"share\":10000,\"shareInHomeCurrency\":3950,\"forTravelerId\":\"id-egal\"}]",
};

const parser = new TravelSpendParser();

describe("TravelSpendParser", () => {
  describe("fixedFields", () => {
    it("includes all known TravelSpend column names", () => {
      expect(parser.fixedFields).toContain("amount");
      expect(parser.fixedFields).toContain("amountInHomeCurrency");
      expect(parser.fixedFields).toContain("datePaid");
      expect(parser.fixedFields).toContain("splitObjects");
    });
  });

  describe("traveller detection", () => {
    it("infers traveller names from columns not in fixedFields", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.travellers).toContain("kristianallin");
      expect(result.travellers).toContain("egal");
    });

    it("does not include fixed fields as travellers", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.travellers).not.toContain("amount");
      expect(result.travellers).not.toContain("category");
    });
  });

  describe("categories", () => {
    it("returns distinct category names found in the CSV", () => {
      const row2 = { ...BASE_ROW, category: "Restaurants" };
      const result = parser.parse([BASE_ROW, row2], "upload-1", "user-1");
      expect(result.categories).toContain("Groceries");
      expect(result.categories).toContain("Restaurants");
    });

    it("deduplicates repeated category names", () => {
      const result = parser.parse([BASE_ROW, BASE_ROW], "upload-1", "user-1");
      expect(result.categories.filter((c) => c === "Groceries")).toHaveLength(1);
    });

    it("excludes null categories from the list", () => {
      const row = { ...BASE_ROW, category: "" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.categories).toHaveLength(0);
    });
  });

  describe("field mapping", () => {
    it("maps datePaid to date", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].date).toEqual(new Date("2026-03-09"));
    });

    it("maps notes to description", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].description).toBe("Snacks");
    });

    it("maps amountInHomeCurrency to amountHome (trimmed)", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(7.91);
    });

    it("parses amounts with thousand separators (commas)", () => {
      const row = { ...BASE_ROW, amountInHomeCurrency: "1,040.49", amount: "2,630.00" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions[0].amountHome).toBe(1040.49);
      expect(result.transactions[0].amountLocal).toBe(2630.0);
    });

    it("maps amount to amountLocal", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].amountLocal).toBe(20.0);
    });

    it("maps localCurrency", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].localCurrency).toBe("PEN");
    });

    it("maps category with source=csv when present", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].categoryName).toBe("Groceries");
      expect(result.transactions[0].categorySource).toBe("csv");
    });

    it("sets categoryName to null when category is empty", () => {
      const row = { ...BASE_ROW, category: "" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions[0].categoryName).toBeNull();
      expect(result.transactions[0].categorySource).toBeNull();
    });

    it("maps paidBy to payer", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].payer).toBe("kristianallin");
    });

    it("maps paymentMethod", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].paymentMethod).toBe("Cash");
    });

    it("maps country", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].country).toBe("Peru");
    });

    it("sets sourceFormat to travelspend", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].sourceFormat).toBe("travelspend");
    });

    it("preserves the raw row", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.transactions[0].raw).toEqual(BASE_ROW);
    });
  });

  describe("homeCurrency", () => {
    it("reads homeCurrency from the first row", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      expect(result.homeCurrency).toBe("CAD");
    });
  });

  describe("dateRange", () => {
    it("returns the min and max date across all rows", () => {
      const row2 = { ...BASE_ROW, datePaid: "2026-03-15" };
      const result = parser.parse([BASE_ROW, row2], "upload-1", "user-1");
      expect(result.dateRange.from).toEqual(new Date("2026-03-09"));
      expect(result.dateRange.to).toEqual(new Date("2026-03-15"));
    });
  });

  describe("splits", () => {
    it("parses traveller splits from per-traveller amount columns", () => {
      const result = parser.parse([BASE_ROW], "upload-1", "user-1");
      const splits = result.transactions[0].splits;
      expect(splits).toHaveLength(2);
      const kristian = splits.find((s) => s.travellerName === "kristianallin");
      const egal = splits.find((s) => s.travellerName === "egal");
      expect(kristian?.amountHome).toBeCloseTo(3.96);
      expect(egal?.amountHome).toBeCloseTo(3.95);
    });

    it("omits splits with zero or empty amounts", () => {
      const row = { ...BASE_ROW, susannaallin04: " 0.00" };
      const result = parser.parse([row], "upload-1", "user-1");
      const splits = result.transactions[0].splits;
      expect(splits.every((s) => s.travellerName !== "susannaallin04")).toBe(true);
    });

    it("parses split amounts with thousand separators (commas)", () => {
      const row = { ...BASE_ROW, kristianallin: "1,020.25", egal: "520.24" };
      const result = parser.parse([row], "upload-1", "user-1");
      const splits = result.transactions[0].splits;
      const kristian = splits.find((s) => s.travellerName === "kristianallin");
      const egal = splits.find((s) => s.travellerName === "egal");
      expect(kristian?.amountHome).toBeCloseTo(1020.25);
      expect(egal?.amountHome).toBeCloseTo(520.24);
    });
  });

  describe("error handling", () => {
    it("records an error for rows missing datePaid", () => {
      const row = { ...BASE_ROW, datePaid: "" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("datePaid");
    });

    it("records an error for rows missing amountInHomeCurrency", () => {
      const row = { ...BASE_ROW, amountInHomeCurrency: "" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].field).toBe("amountInHomeCurrency");
    });

    it("skips rows with errors rather than including them in transactions", () => {
      const row = { ...BASE_ROW, datePaid: "" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
    });

    it("continues parsing valid rows even when one row has an error", () => {
      const badRow = { ...BASE_ROW, datePaid: "" };
      const result = parser.parse([badRow, BASE_ROW], "upload-1", "user-1");
      expect(result.errors).toHaveLength(1);
      expect(result.transactions).toHaveLength(1);
    });

    it("records an error for rows with a non-numeric amountInHomeCurrency", () => {
      const row = { ...BASE_ROW, amountInHomeCurrency: "N/A" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ field: "amountInHomeCurrency" });
      expect(result.errors[0].message).toContain("N/A");
    });

    it("records an error for rows with a malformed datePaid", () => {
      const row = { ...BASE_ROW, datePaid: "not-a-date" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({ field: "datePaid" });
      expect(result.errors[0].message).toContain("not-a-date");
    });

    it("skips rows where type is not Expense", () => {
      const row = { ...BASE_ROW, type: "Transfer" };
      const result = parser.parse([row], "upload-1", "user-1");
      expect(result.transactions).toHaveLength(0);
    });
  });
});
