/** Parser for Wealthsimple Visa credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

export class WealthsimpleParser implements CsvParser {
  name = "Wealthsimple";

  fixedFields = ["transaction_date", "post_date", "type", "details", "amount", "currency"];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (row.type !== "Purchase") {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row.transaction_date);
      if (!date) {
        errors.push({ row: i + 1, field: "transaction_date", message: `Invalid date "${row.transaction_date ?? ""}"` });
        continue;
      }

      const amount = parseAmountSafe(row.amount);
      if (amount === null) {
        errors.push({ row: i + 1, field: "amount", message: `Invalid amount "${row.amount ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description: row.details,
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
