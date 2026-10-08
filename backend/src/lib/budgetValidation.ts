/** Pure validation for the budget-settings and budgets request bodies. */

import { UUID_REGEX } from "./queryParams";

export interface ParamError {
  field: string;
  message: string;
}

/** Validates the body of POST /api/budget-settings — selecting the group that scopes the budget. */
export function parseBudgetSettingsBody(raw: unknown): {
  groupId: string | undefined;
  errors: ParamError[];
} {
  const errors: ParamError[] = [];
  const body = (raw ?? {}) as Record<string, unknown>;

  const groupId = body.groupId;
  if (typeof groupId !== "string" || !UUID_REGEX.test(groupId)) {
    errors.push({ field: "groupId", message: "Must be a valid UUID" });
    return { groupId: undefined, errors };
  }

  return { groupId, errors };
}

export interface BudgetInput {
  categoryId: string;
  monthlyAmount: number;
}

/** Validates the body of POST /api/budgets — a bulk upsert of per-category monthly amounts. */
export function parseBudgetsBody(raw: unknown): {
  budgets: BudgetInput[];
  errors: ParamError[];
} {
  const errors: ParamError[] = [];
  const body = (raw ?? {}) as Record<string, unknown>;
  const budgets = body.budgets;

  if (!Array.isArray(budgets) || budgets.length === 0) {
    errors.push({ field: "budgets", message: "Must be a non-empty array" });
    return { budgets: [], errors };
  }

  const parsed: BudgetInput[] = [];
  budgets.forEach((entry, i) => {
    const e = (entry ?? {}) as Record<string, unknown>;
    const categoryId = e.categoryId;
    const monthlyAmount = e.monthlyAmount;

    if (typeof categoryId !== "string" || !UUID_REGEX.test(categoryId)) {
      errors.push({ field: `budgets[${i}].categoryId`, message: "Must be a valid UUID" });
      return;
    }
    if (typeof monthlyAmount !== "number" || !Number.isFinite(monthlyAmount) || monthlyAmount < 0) {
      errors.push({ field: `budgets[${i}].monthlyAmount`, message: "Must be a non-negative number" });
      return;
    }
    parsed.push({ categoryId, monthlyAmount });
  });

  return { budgets: parsed, errors };
}
