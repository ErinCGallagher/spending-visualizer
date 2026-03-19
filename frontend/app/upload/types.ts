/**
 * Shared types for the upload wizard — kept here so each step
 * imports from one place rather than redefining the same shapes.
 */

export interface ParseError {
  message: string;
  row?: number;
}

export interface ParsedTransaction {
  description: string;
  amount: number;
  currency: string;
  date: string;
  category?: string;
  categoryName?: string;
  country?: string | null;
  traveller?: string;
  paymentMethod?: string;
}

export interface ParsedUploadResult {
  transactions: ParsedTransaction[];
  travellers: string[];
  categories: string[];
  errors: ParseError[];
  homeCurrency: string;
  dateRange: { from: string; to: string };
  overlapWarning: boolean;
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
