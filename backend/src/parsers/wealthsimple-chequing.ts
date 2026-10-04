/** Parser for Wealthsimple chequing account activity CSV exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

export class WealthsimpleChequingParser implements CsvParser {
  name = "Wealthsimple Chequing";

  fixedFields = [
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
  ];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Online bill payments and credit card payments are excluded: the former
      // aren't discretionary spend to track here, and the latter are already
      // counted as spend by the Wealthsimple Visa parser.
      if (row.activity_sub_type === "OBP_OUT" || (row.activity_sub_type === "TRANSFER" && row.description === "Credit card payment")) {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row.effective_date);
      if (!date) {
        errors.push({ row: i + 1, field: "effective_date", message: `Invalid date "${row.effective_date ?? ""}"` });
        continue;
      }

      const netCashAmount = parseAmountSafe(row.net_cash_amount);
      if (netCashAmount === null) {
        errors.push({ row: i + 1, field: "net_cash_amount", message: `Invalid amount "${row.net_cash_amount ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description: row.description,
          amount: -netCashAmount,
          paymentMethod: "Wealthsimple Chequing",
          sourceFormat: "wealthsimple-chequing",
          raw: row,
        })
      );
    }

    const homeCurrency = rows[0]?.currency ?? "CAD";

    return {
      transactions,
      travellers: [],
      categories: [],
      errors,
      homeCurrency,
      dateRange: calculateDateRange(transactions),
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
