/** Parser for Rogers Bank Mastercard credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction, ParseError } from "./types";
import { buildCreditCardTransaction, calculateDateRange, parseDateSafe, parseAmountSafe } from "./utils";

export class RogersParser implements CsvParser {
  name = "Rogers Bank Mastercard";

  fixedFields = [
    "Date",
    "Posted Date",
    "Reference Number",
    "Activity Type",
    "Activity Status",
    "Card Number",
    "Merchant Category Description",
    "Merchant Name",
    "Merchant City",
    "Merchant State or Province",
    "Merchant Country Code",
    "Merchant Postal Code",
    "Amount",
    "Rewards",
    "Name on Card",
  ];

  parse(rows: Record<string, string>[], _uploadId: string, _userId: string): ParseResult {
    const transactions: ParsedTransaction[] = [];
    const errors: ParseError[] = [];
    let skippedPayments = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const description = row["Merchant Name"]?.trim() || "";

      if (description === "PAYMENT THANK YOU") {
        skippedPayments++;
        continue;
      }

      const date = parseDateSafe(row.Date);
      if (!date) {
        errors.push({ row: i + 1, field: "Date", message: `Invalid date "${row.Date ?? ""}"` });
        continue;
      }

      const amount = parseAmountSafe(row.Amount?.replace(/\$/g, ""));
      if (amount === null) {
        errors.push({ row: i + 1, field: "Amount", message: `Invalid amount "${row.Amount ?? ""}"` });
        continue;
      }

      transactions.push(
        buildCreditCardTransaction({
          date,
          description,
          amount,
          paymentMethod: "Rogers Mastercard",
          sourceFormat: "rogers",
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
