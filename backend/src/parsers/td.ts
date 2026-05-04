/** Parser for TD credit card CSV statement exports (no header row). */

import type { CsvParser, ParseResult, ParsedTransaction } from "./types";
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
    let skippedPayments = 0;

    for (const row of rows) {
      const debit = row.debit?.trim();
      const credit = row.credit?.trim();

      if (credit && !debit) {
        if (isBankPayment(row.description)) {
          skippedPayments++;
          continue;
        }
        transactions.push(
          buildCreditCardTransaction({
            date: parseTDDate(row.date),
            description: row.description,
            amount: -parseFloat(credit),
            paymentMethod: "TD",
            sourceFormat: "td",
            raw: row,
          })
        );
      } else if (debit) {
        transactions.push(
          buildCreditCardTransaction({
            date: parseTDDate(row.date),
            description: row.description,
            amount: parseFloat(debit),
            paymentMethod: "TD",
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
      errors: [],
      homeCurrency: "CAD",
      dateRange: calculateDateRange(transactions),
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
