/** TravelSpend CSV parser — maps TravelSpend export columns to canonical transaction fields. */

import { CsvParser, ParsedSplit, ParsedTransaction, ParseError, ParseResult } from "./types";
import { parseDateSafe } from "./utils";

/** Parse a number string that may contain thousand separators (commas). Returns null if not numeric. */
function parseNumber(value: string): number | null {
  const n = parseFloat(value.replace(/,/g, ""));
  return isNaN(n) ? null : n;
}

/** All column names that TravelSpend always exports. Columns not in this list are traveller names. */
const FIXED_FIELDS = [
  "amount",
  "amountInHomeCurrency",
  "category",
  "conversionRate",
  "country",
  "countryCode",
  "datePaid",
  "homeCurrency",
  "localCurrency",
  "notes",
  "paidBy",
  "paidFor",
  "paymentMethod",
  "photo",
  "place",
  "latitude",
  "longitude",
  "type",
  "numberOfDays",
  "excludeFromAvg",
  "addToBudget",
  "categoryId",
  "categoryIcon",
  "categoryColor",
  "paymentMethodId",
  "paymentMethodIcon",
  "paymentMethodColor",
  "paidById",
  "paidToId",
  "splitObjects",
];

export class TravelSpendParser implements CsvParser {
  readonly name = "travelspend";
  readonly fixedFields = FIXED_FIELDS;

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    if (rows.length === 0) {
      return {
        transactions: [],
        travellers: [],
        categories: [],
        errors: [],
        homeCurrency: "",
        dateRange: { from: new Date(), to: new Date() },
      };
    }

    // Infer traveller names from columns not in fixedFields
    const allColumns = Object.keys(rows[0]);
    const travellers = allColumns.filter((col) => !FIXED_FIELDS.includes(col));

    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let homeCurrency = "";

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 1;

      // Skip non-expense rows
      if (row["type"] !== "Expense") {
        continue;
      }

      // Validate required fields
      if (!row["datePaid"]) {
        errors.push({ row: rowNum, field: "datePaid", message: "Missing datePaid" });
        continue;
      }
      if (!row["amountInHomeCurrency"]?.trim()) {
        errors.push({ row: rowNum, field: "amountInHomeCurrency", message: "Missing amountInHomeCurrency" });
        continue;
      }

      const date = parseDateSafe(row["datePaid"]);
      if (!date) {
        errors.push({ row: rowNum, field: "datePaid", message: `Invalid date "${row["datePaid"]}"` });
        continue;
      }
      const amountHome = parseNumber(row["amountInHomeCurrency"].trim());
      if (amountHome === null) {
        errors.push({ row: rowNum, field: "amountInHomeCurrency", message: `Invalid amount "${row["amountInHomeCurrency"]}"` });
        continue;
      }
      const amountLocal = row["amount"] ? parseNumber(row["amount"].trim()) : null;
      const categoryName = row["category"]?.trim() || null;

      if (!homeCurrency && row["homeCurrency"]) {
        homeCurrency = row["homeCurrency"];
      }

      // Build splits from per-traveller columns
      const splits: ParsedSplit[] = travellers
        .map((name) => ({
          travellerName: name,
          amountHome: parseNumber((row[name] ?? "0").trim()) || 0,
        }))
        .filter((s) => s.amountHome > 0);

      transactions.push({
        date,
        description: row["notes"] ?? "",
        amountHome,
        amountLocal,
        localCurrency: row["localCurrency"] || null,
        categoryName,
        categorySource: categoryName ? "csv" : null,
        paymentMethod: row["paymentMethod"] || null,
        country: row["country"] || null,
        payer: row["paidBy"] || null,
        sourceFormat: "travelspend",
        raw: row,
        splits,
      });
    }

    const dates = transactions.map((t) => t.date.getTime());
    const dateRange =
      dates.length > 0
        ? { from: new Date(Math.min(...dates)), to: new Date(Math.max(...dates)) }
        : { from: new Date(), to: new Date() };

    const categories = [...new Set(
      transactions.map((t) => t.categoryName).filter((c): c is string => c !== null)
    )];

    return { transactions, travellers, categories, errors, homeCurrency, dateRange };
  }
}
