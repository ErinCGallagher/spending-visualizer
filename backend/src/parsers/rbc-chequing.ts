/** Parser for RBC chequing account activity CSV exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

function isExcludedDescription(description: string): boolean {
  return (
    description.startsWith("ONLINE BANKING PAYMENT") ||
    description.startsWith("ONLINE BANKING TRANSFER") ||
    description.startsWith("INVESTMENT WS INVESTMENTS") ||
    description === "MISC PAYMENT RBC CREDIT CARD"
  );
}

export class RBCChequingParser implements CsvParser {
  name = "RBC Chequing";

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

      // ONLINE BANKING PAYMENT rows are bill payments (RBC's equivalent of
      // Wealthsimple's OBP_OUT); ONLINE BANKING TRANSFER and INVESTMENT WS
      // INVESTMENTS are transfers between the user's own accounts; MISC
      // PAYMENT RBC CREDIT CARD is a credit card payment already counted as
      // spend by the credit card parser. None of these are chequing spend.
      if (isExcludedDescription(description)) {
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
          paymentMethod: "RBC Chequing",
          sourceFormat: "rbc-chequing",
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
