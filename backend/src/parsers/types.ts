/** Shared types for CSV parsers. */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amountHome: number;
  amountLocal: number | null;
  localCurrency: string | null;
  /** Raw category name from the CSV. Resolved to a category_id after the user completes the category organisation step. */
  categoryName: string | null;
  categorySource: "csv" | "ai" | "user" | null;
  paymentMethod: string | null;
  country: string | null;
  payer: string | null;
  sourceFormat: string;
  raw: Record<string, string>;
  splits: ParsedSplit[];
}

export interface ParsedSplit {
  travellerName: string;
  amountHome: number;
}

export interface ParseError {
  row: number;
  field: string;
  message: string;
}

export interface ParseResult {
  transactions: ParsedTransaction[];
  travellers: string[];
  /** Distinct category names found in the CSV, for the category organisation step. */
  categories: string[];
  errors: ParseError[];
  homeCurrency: string;
  dateRange: { from: Date; to: Date };
}

export interface CsvParser {
  name: string;
  fixedFields: string[];
  parse(rows: Record<string, string>[], uploadId: string, userId: string): ParseResult;
}
