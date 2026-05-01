/** Parser for Wealthsimple Visa credit card CSV statement exports. */

import type { CsvParser, ParseResult, ParsedTransaction } from "./types";

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

      transactions.push({
        date: new Date(row.transaction_date),
        description: row.details.trim(),
        amountHome: parseFloat(row.amount),
        amountLocal: null,
        localCurrency: null,
        categoryName: null,
        categorySource: null,
        paymentMethod: "Wealthsimple Visa",
        country: null,
        payer: null,
        sourceFormat: "wealthsimple",
        raw: row,
        splits: [],
      });
    }

    const dates = transactions.map((tx) => tx.date.getTime());
    const from = dates.length > 0 ? new Date(Math.min(...dates)) : new Date(0);
    const to = dates.length > 0 ? new Date(Math.max(...dates)) : new Date(0);

    const homeCurrency = rows[0]?.currency ?? "CAD";

    return {
      transactions,
      travellers: [],
      categories: [],
      errors: [],
      homeCurrency,
      dateRange: { from, to },
      ...(skippedPayments > 0 ? { skippedPayments } : {}),
    };
  }
}
