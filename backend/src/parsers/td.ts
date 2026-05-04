/** Parser for TD credit card CSV statement exports (no header row). */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange } from "./utils";
import { isBankPayment } from "./bankKeywords";

function parseTDDate(raw: string): Date {
  const [month, day, year] = raw.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export class TDParser implements CsvParser {
  name = "TD";

  fixedFields = ["date", "description", "debit", "credit", "balance"];

  syntheticHeader = ["date", "description", "debit", "credit", "balance"];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const debit = row.debit?.trim();
      const credit = row.credit?.trim();
      const description = row.description?.trim();

      const date = parseTDDate(row.date);
      if (isNaN(date.getTime())) {
        errors.push({ row: i, field: "date", message: `Invalid date "${row.date ?? ""}"` });
        continue;
      }

      if (credit && !debit) {
        if (isBankPayment(description)) {
          skippedPayments++;
          continue;
        }
        transactions.push(
          buildCreditCardTransaction({
            date,
            description,
            amount: -parseFloat(credit),
            paymentMethod: "TD Visa",
            sourceFormat: "td",
            raw: row,
          })
        );
      } else if (debit) {
        transactions.push(
          buildCreditCardTransaction({
            date,
            description,
            amount: parseFloat(debit),
            paymentMethod: "TD Visa",
            sourceFormat: "td",
            raw: row,
          })
        );
      }
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
