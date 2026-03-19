/** Shared types for CSV parsers. */

export interface ParsedTransaction {
  date: Date;
  description: string;
  amountHome: number;
  amountLocal: number | null;
  localCurrency: string | null;
  category: string | null;
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
  errors: ParseError[];
  homeCurrency: string;
  dateRange: { from: Date; to: Date };
}

export interface CsvParser {
  name: string;
  fixedFields: string[];
  parse(rows: Record<string, string>[], uploadId: string, userId: string): ParseResult;
}
