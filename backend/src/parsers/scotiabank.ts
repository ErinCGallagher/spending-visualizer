/** Parser for Scotiabank credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe } from "./utils";
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

  parse(
    rows: Record<string, string>[],
    _uploadId: string,
    _userId: string,
  ): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const type = row["Type of Transaction"];

      if (type === "Credit") {
        if (isBankPayment(row.Description)) {
          skippedPayments++;
          continue;
        }
      }

      const date = parseDateSafe(row.Date);
      if (!date) {
        errors.push({ row: i + 1, field: "Date", message: `Invalid date "${row.Date ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description: row.Description,
          amount: parseFloat(row.Amount),
          paymentMethod: "Scotiabank Visa",
          sourceFormat: "scotiabank",
          raw: row,
        }),
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
