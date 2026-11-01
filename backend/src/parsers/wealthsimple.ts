/**
 * Parser for Wealthsimple Visa credit card CSV exports: both the statement
 * format (type/details) and the activities format (transaction_type/merchant).
 */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

// The activities export lists purchases as negative amounts, the statement
// export as positive; spend is stored positive.
function normalizeRow(row: Record<string, string>): { type: string; description: string; amount: string } {
  if (row.transaction_type === undefined) {
    return { type: row.type, description: row.details, amount: row.amount };
  }
  const parsed = parseAmountSafe(row.amount);
  return {
    type: row.transaction_type,
    description: row.merchant,
    amount: parsed === null ? row.amount : String(-parsed),
  };
}

export class WealthsimpleParser implements CsvParser {
  name = "Wealthsimple";

  fixedFields = ["transaction_date", "post_date", "type", "details", "amount", "currency"];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { type, description, amount: rawAmount } = normalizeRow(row);

      // Only bill payments are excluded (they are not spend). Refund and dispute
      // rows are kept — they balance out across their initiated/settled pairs.
      if (type === "Payment") {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row.transaction_date);
      if (!date) {
        errors.push({ row: i + 1, field: "transaction_date", message: `Invalid date "${row.transaction_date ?? ""}"` });
        continue;
      }

      const amount = parseAmountSafe(rawAmount);
      if (amount === null) {
        errors.push({ row: i + 1, field: "amount", message: `Invalid amount "${row.amount ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description,
          amount,
          paymentMethod: "Wealthsimple Visa",
          sourceFormat: "wealthsimple",
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
