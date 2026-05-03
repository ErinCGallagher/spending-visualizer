/** Parser for American Express credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction } from "./types";
import { buildCreditCardTransaction, calculateDateRange } from "./utils";

export class AmexParser implements CsvParser {
  name = "American Express";

  fixedFields = ["Date", "Description", "Amount", "Account #"];

  constructor(private cardMapping: Record<string, string> = {}) {}

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    let skippedPayments = 0;

    for (const row of rows) {
      // Skip payments
      if (row.Description.includes("PAYMENT RECEIVED")) {
        skippedPayments++;
        continue;
      }

      const accountNum = row["Account #"] || "";
      const normalizedAccount = accountNum.replace(/[^0-9]/g, "");
      const paymentMethod =
        this.cardMapping[normalizedAccount] ||
        (normalizedAccount ? `Amex (...${normalizedAccount.slice(-5)})` : "Amex");

      transactions.push(
        buildCreditCardTransaction({
          date: new Date(row.Date),
          description: row.Description,
          amount: parseFloat(row.Amount),
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
      errors: [],
      homeCurrency: "CAD",
      dateRange: calculateDateRange(transactions),
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
