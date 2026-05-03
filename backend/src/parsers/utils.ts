/** Utility functions for CSV parsers. */

import type { ParsedTransaction } from "./types";

/**
 * Calculates the min and max date from a list of transactions.
 */
export function calculateDateRange(transactions: { date: Date }[]) {
  const dates = transactions.map((tx) => tx.date.getTime());
  const from = dates.length > 0 ? new Date(Math.min(...dates)) : new Date(0);
  const to = dates.length > 0 ? new Date(Math.max(...dates)) : new Date(0);
  return { from, to };
}

/**
 * Common builder for credit card transactions which often have simplified fields.
 */
export function buildCreditCardTransaction(params: {
  date: Date;
  description: string;
  amount: number;
  paymentMethod: string;
  sourceFormat: string;
  raw: Record<string, string>;
}): ParsedTransaction {
  return {
    date: params.date,
    description: params.description.trim(),
    amountHome: params.amount,
    amountLocal: null,
    localCurrency: null,
    categoryName: null,
    categorySource: null,
    paymentMethod: params.paymentMethod,
    country: null,
    payer: null,
    sourceFormat: params.sourceFormat,
    raw: params.raw,
    splits: [],
  };
}
