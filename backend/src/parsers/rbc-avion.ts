/** Parser for RBC Avion Visa credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

export class RBCAvionParser implements CsvParser {
  name = "RBC Avion Visa";

  fixedFields = [
    "Account Type",
    "Account Number",
    "Transaction Date",
    "Cheque Number",
    "Description 1",
    "Description 2",
    "CAD$",
    "USD$",
  ];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const description = row["Description 1"]?.trim() || "";

      if (description.toUpperCase().includes("THANK YOU")) {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row["Transaction Date"]);
      if (!date) {
        errors.push({ row: i + 1, field: "Transaction Date", message: `Invalid date "${row["Transaction Date"] ?? ""}"` });
        continue;
      }

      const cadAmount = parseAmountSafe(row["CAD$"]);
      if (cadAmount === null) {
        errors.push({ row: i + 1, field: "CAD$", message: `Invalid amount "${row["CAD$"] ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description,
          amount: -cadAmount,
          paymentMethod: "RBC Avion Visa",
          sourceFormat: "rbc-avion",
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
