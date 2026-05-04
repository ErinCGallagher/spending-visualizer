/** Parser for American Express credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

export class AmexParser implements CsvParser {
  name = "American Express";

  fixedFields = ["Date", "Description", "Amount", "Account #"];

  constructor(private cardMapping: Record<string, string> = {}) {}

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip payments
      if (row.Description?.includes("PAYMENT RECEIVED")) {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row.Date);
      if (!date) {
        errors.push({ row: i + 1, field: "Date", message: `Invalid date "${row.Date ?? ""}"` });
        continue;
      }

      const amount = parseAmountSafe(row.Amount);
      if (amount === null) {
        errors.push({ row: i + 1, field: "Amount", message: `Invalid amount "${row.Amount ?? ""}"` });
        continue;
      }

      const accountNum = row["Account #"] || "";
      const normalizedAccount = accountNum.replace(/[^0-9]/g, "");
      const paymentMethod =
        this.cardMapping[normalizedAccount] ||
        (normalizedAccount ? `Amex (...${normalizedAccount.slice(-5)})` : "Amex");

      transactions.push(
        buildCreditCardTransaction({
          date,
          description: row.Description,
          amount,
          paymentMethod,
          sourceFormat: "amex",
          raw: row,
        })
      );
    }

    return {
      transactions,
      travellers: [],
      categories: [],
      errors,
      homeCurrency: "CAD",
      dateRange: calculateDateRange(transactions),
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
