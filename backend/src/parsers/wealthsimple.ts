/** Parser for Wealthsimple Visa credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction } from "./types";
import { buildCreditCardTransaction, calculateDateRange } from "./utils";

export class WealthsimpleParser implements CsvParser {
  name = "Wealthsimple";

  fixedFields = ["transaction_date", "post_date", "type", "details", "amount", "currency"];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    let skippedPayments = 0;

    for (const row of rows) {
      if (row.type !== "Purchase") {
        skippedPayments++;
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date: new Date(row.transaction_date),
          description: row.details,
          amount: parseFloat(row.amount),
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
      errors: [],
      homeCurrency,
      dateRange: calculateDateRange(transactions),
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
