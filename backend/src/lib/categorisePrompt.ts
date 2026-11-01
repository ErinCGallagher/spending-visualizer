/** Pure helpers for building and parsing the AI categorisation prompt. */

export interface TransactionInput {
  description: string;
  country: string | null;
}

export interface CategoryOption {
  name: string;
  parentName: string | null;
}

export interface CategoriseResult {
  parentName: string;
  subName: string | null;
  confidence: number;
  source: "cache" | "ai";
}

/**
 * Builds the prompt for batch category assignment.
 * Returns a structured prompt requesting JSON output.
 */
export function buildCategorisePrompt(
  transactions: TransactionInput[],
  availableCategories: CategoryOption[]
): string {
  const lines = transactions
    .map((t, i) => {
      const country = t.country ? ` (${t.country})` : "";
      return `${i}: ${t.description}${country}`;
    })
    .join("\n");

  const categoryList =
    availableCategories.length > 0
      ? `Available categories (a parent category, optionally followed by "> sub category"):\n${availableCategories
          .map((c) => `- ${c.parentName ? `${c.parentName} > ${c.name}` : c.name}`)
          .join("\n")}`
      : "No predefined categories — infer appropriate category names.";

  return `You are a personal finance assistant. Assign a category and a confidence score (0.0–1.0) to each transaction below.

${categoryList}

Prefer categories from the available list when they fit, using the exact parent and sub category names shown. Set "subName" to null when only a parent category applies. You may suggest a new category only if none of the available categories are a reasonable match.

Transactions (index: description):
${lines}

Respond with a JSON array only — no prose, no markdown fences. Each element must have exactly three keys:
  "parentName": string
  "subName": string or null
  "confidence": number between 0 and 1

Example: [{"parentName":"Travel","subName":"Food","confidence":0.9},{"parentName":"Transport","subName":null,"confidence":0.8}]`;
}

/**
 * Parses the JSON response into structured results.
 * Falls back to confidence-0 entries if the response is unparseable,
 * so callers always get a result of the expected length.
 */
export function parseCategoriseResponse(
  text: string,
  count: number
): CategoriseResult[] {
  const fallback: CategoriseResult[] = Array.from({ length: count }, () => ({
    parentName: "Uncategorized",
    subName: null,
    confidence: 0,
    source: "ai",
  }));

  try {
    // Strip markdown code fences if the model includes them despite instructions
    const cleaned = text.replace(/```[a-z]*\n?/gi, "").trim();
    const parsed = JSON.parse(cleaned);

    if (!Array.isArray(parsed) || parsed.length !== count) {
      return fallback;
    }

    return parsed.map((item) => ({
      parentName: typeof item.parentName === "string" ? item.parentName : "Uncategorized",
      subName: typeof item.subName === "string" ? item.subName : null,
      confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0,
      source: "ai",
    }));
  } catch {
    return fallback;
  }
}
