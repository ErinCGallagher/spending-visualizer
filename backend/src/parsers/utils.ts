/** Utility functions for CSV parsers. */

import type { ParsedTransaction } from "./types";

/**
 * Parses a date string, returning null if the result is not a valid date.
 * Prefer this over bare `new Date()` to avoid silent Invalid Date propagation.
 */
export function parseDateSafe(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const date = new Date(raw);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Parses a numeric string, returning null if the result is NaN.
 * Prefer this over bare `parseFloat()` to avoid silent NaN propagation.
 */
export function parseAmountSafe(raw: string | undefined | null): number | null {
  if (raw === undefined || raw === null || raw === "") return null;
  const value = parseFloat(String(raw).replace(/,/g, ""));
  return isNaN(value) ? null : value;
}

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
