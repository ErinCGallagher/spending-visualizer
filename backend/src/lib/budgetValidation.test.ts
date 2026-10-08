/** Unit tests for the budget-settings and budgets request body validators. */

import { describe, it, expect } from "vitest";
import { parseBudgetSettingsBody, parseBudgetsBody } from "./budgetValidation";

const UUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
const UUID_2 = "b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22";

describe("parseBudgetSettingsBody", () => {
  it("accepts a valid groupId", () => {
    const { groupId, errors } = parseBudgetSettingsBody({ groupId: UUID });
    expect(errors).toHaveLength(0);
    expect(groupId).toBe(UUID);
  });

  it("rejects a missing groupId", () => {
    const { groupId, errors } = parseBudgetSettingsBody({});
    expect(groupId).toBeUndefined();
    expect(errors.some((e) => e.field === "groupId")).toBe(true);
  });

  it("rejects a non-UUID groupId", () => {
    const { errors } = parseBudgetSettingsBody({ groupId: "not-a-uuid" });
    expect(errors.some((e) => e.field === "groupId")).toBe(true);
  });
});

describe("parseBudgetsBody", () => {
  it("accepts a valid list of budgets", () => {
    const { budgets, errors } = parseBudgetsBody({
      budgets: [
        { categoryId: UUID, monthlyAmount: 200 },
        { categoryId: UUID_2, monthlyAmount: 0 },
      ],
    });
    expect(errors).toHaveLength(0);
    expect(budgets).toEqual([
      { categoryId: UUID, monthlyAmount: 200 },
      { categoryId: UUID_2, monthlyAmount: 0 },
    ]);
  });

  it("rejects a missing budgets array", () => {
    const { budgets, errors } = parseBudgetsBody({});
    expect(budgets).toHaveLength(0);
    expect(errors.some((e) => e.field === "budgets")).toBe(true);
  });

  it("rejects an empty budgets array", () => {
    const { errors } = parseBudgetsBody({ budgets: [] });
    expect(errors.some((e) => e.field === "budgets")).toBe(true);
  });

  it("rejects a non-UUID categoryId", () => {
    const { errors } = parseBudgetsBody({ budgets: [{ categoryId: "nope", monthlyAmount: 100 }] });
    expect(errors.some((e) => e.field === "budgets[0].categoryId")).toBe(true);
  });

  it("rejects a negative monthlyAmount", () => {
    const { errors } = parseBudgetsBody({ budgets: [{ categoryId: UUID, monthlyAmount: -5 }] });
    expect(errors.some((e) => e.field === "budgets[0].monthlyAmount")).toBe(true);
  });

  it("rejects a non-numeric monthlyAmount", () => {
    const { errors } = parseBudgetsBody({ budgets: [{ categoryId: UUID, monthlyAmount: "200" }] });
    expect(errors.some((e) => e.field === "budgets[0].monthlyAmount")).toBe(true);
  });
});
