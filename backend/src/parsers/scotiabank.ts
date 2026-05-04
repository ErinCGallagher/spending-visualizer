/** Parser for Scotiabank credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction } from "./types";
import { buildCreditCardTransaction, calculateDateRange } from "./utils";
import { isBankPayment } from "./bankKeywords";

export class ScotiabankParser implements CsvParser {
  name = "Scotiabank";

  fixedFields = [
    "Date",
    "Description",
    "Sub-description",
    "Status",
    "Type of Transaction",
    "Amount",
  ];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    let skippedPayments = 0;

    for (const row of rows) {
      const type = row["Type of Transaction"];

      if (type === "Credit") {
        if (isBankPayment(row.Description)) {
          skippedPayments++;
          continue;
        }
      }

      transactions.push(
        buildCreditCardTransaction({
          date: new Date(row.Date),
          description: row.Description,
          amount: parseFloat(row.Amount),
          paymentMethod: "Scotiabank",
          sourceFormat: "scotiabank",
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
