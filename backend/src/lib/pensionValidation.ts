/** Pure validation for the POST /api/pension request body. */

export interface ParamError {
  field: string;
  message: string;
}

export interface PensionContributionInput {
  month: number;
  amount: number;
}

/** Validates the body of POST /api/pension — a bulk upsert of per-month pension amounts for a year. */
export function parsePensionBody(raw: unknown): {
  year: number | undefined;
  contributions: PensionContributionInput[];
  errors: ParamError[];
} {
  const errors: ParamError[] = [];
  const body = (raw ?? {}) as Record<string, unknown>;

  const year = body.year;
  if (typeof year !== "number" || !Number.isInteger(year)) {
    errors.push({ field: "year", message: "Must be an integer" });
    return { year: undefined, contributions: [], errors };
  }

  const contributions = body.contributions;
  if (!Array.isArray(contributions)) {
    errors.push({ field: "contributions", message: "Must be an array" });
    return { year, contributions: [], errors };
  }

  const parsed: PensionContributionInput[] = [];
  contributions.forEach((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const month = e.month;
    const amount = e.amount;

    if (typeof month !== "number" || !Number.isInteger(month) || month < 1 || month > 12) {
      errors.push({ field: `contributions[${i}].month`, message: "Must be an integer between 1 and 12" });
      return;
    }
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      errors.push({ field: `contributions[${i}].amount`, message: "Must be a non-negative number" });
      return;
    }
    parsed.push({ month, amount });
  });

  return { year, contributions: parsed, errors };
}
