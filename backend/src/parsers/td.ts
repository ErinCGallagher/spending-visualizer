/** Parser for TD credit card CSV statement exports (no header row). */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseAmountSafe } from "./utils";
import { isBankPayment } from "./bankKeywords";

function parseTDDate(raw: string | undefined | null): Date {
  if (!raw || typeof raw !== "string") return new Date(NaN);
  const parts = raw.split("/");
  if (parts.length !== 3) return new Date(NaN);
  const [month, day, year] = parts.map(Number);
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
      const description = row.description?.trim() || "";

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
        const creditAmount = parseAmountSafe(credit);
        if (creditAmount === null) {
          errors.push({ row: i, field: "credit", message: `Invalid amount "${credit}"` });
          continue;
        }
        transactions.push(
          buildCreditCardTransaction({
            date,
            description,
            amount: -creditAmount,
            paymentMethod: "TD Visa",
            sourceFormat: "td",
            raw: row,
          })
        );
      } else if (debit) {
        const debitAmount = parseAmountSafe(debit);
        if (debitAmount === null) {
          errors.push({ row: i, field: "debit", message: `Invalid amount "${debit}"` });
          continue;
        }
        transactions.push(
          buildCreditCardTransaction({
            date,
            description,
            amount: debitAmount,
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
