/**
 * Shared types for the upload wizard — kept here so each step
 * imports from one place rather than redefining the same shapes.
 */

export interface ParseError {
  message: string;
  row?: number;
  field?: string;
}

export interface ParsedTransaction {
  description: string;
  amountHome: number;
  amountLocal: number | null;
  localCurrency: string | null;
  date: string;
  category?: string;
  categoryName?: string;
  categorySource?: "csv" | "ai" | "user" | null;
  country?: string | null;
  traveller?: string;
  paymentMethod?: string;
  groupId?: string;
  sourceFormat: string;
  raw: Record<string, string>;
}

export interface ParsedUploadResult {
  transactions: ParsedTransaction[];
  travellers: string[];
  categories: string[];
  errors: ParseError[];
  homeCurrency: string;
  dateRange: { from: string; to: string };
  overlapWarning: boolean;
  skippedPayments?: number;
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  children: { id: string; name: string }[];
}

/** Assignment a user makes for an unrecognised category in step 3. */
export interface CategoryAssignment {
  categoryName: string;
  /** null means "new standalone main category"; a string is the main category name to nest under */
  parentName: string | null;
}

export type GroupType = "trip" | "daily" | "business";

export interface Group {
  id: string;
  name: string;
  groupType: GroupType;
  createdAt: string;
}

export interface AISuggestion {
  /** Index into the transactions array */
  transactionIndex: number;
  description: string;
  amount: number;
  date: string;
  suggestedCategory: string;
  confidence: number;
  /** The final category chosen by the user (may differ from suggestion) */
  chosenCategory: string | null;
}
