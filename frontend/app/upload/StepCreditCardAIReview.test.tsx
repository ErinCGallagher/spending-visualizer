import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import StepCreditCardAIReview from "./StepCreditCardAIReview";
import type { Category, ParsedTransaction } from "./types";

// "Food" is both a parent category and a child of "Travel".
const taxonomy: Category[] = [
  { id: "1", name: "Food", parentId: null, children: [] },
  {
    id: "2",
    name: "Travel",
    parentId: null,
    children: [
      { id: "3", name: "Food" },
      { id: "4", name: "Flights" },
    ],
  },
];

const transactions: ParsedTransaction[] = [
  {
    description: "Cafe",
    amountHome: 12,
    amountLocal: null,
    localCurrency: null,
    date: "2024-01-01",
    sourceFormat: "test",
    raw: {},
  },
];

function stubSuggestion(parentName: string, subName: string | null, source = "ai") {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ results: [{ parentName, subName, confidence: 0.5, source }] }),
    })
  );
}

function renderStep(onContinue = vi.fn()) {
  render(
    <StepCreditCardAIReview
      transactions={transactions}
      existingTaxonomy={taxonomy}
      onBack={vi.fn()}
      onContinue={onContinue}
    />
  );
  return onContinue;
}

describe("StepCreditCardAIReview", () => {
  beforeEach(() => {
    stubSuggestion("Travel", "Food");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("lets the user pick the parent category when a child shares its name", async () => {
    const onContinue = renderStep();

    const [parentSelect, subSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];

    fireEvent.change(parentSelect, { target: { value: "Food" } });

    await waitFor(() => expect(parentSelect.value).toBe("Food"));
    expect(subSelect.value).toBe("");

    fireEvent.click(screen.getByText("Continue"));
    const saved = onContinue.mock.calls[0][0][0];
    expect(saved.categoryName).toBe("Food");
    expect(saved.categoryId).toBe("1");
  });

  it("starts with the parent and sub the AI suggested", async () => {
    renderStep();

    const [parentSelect, subSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
    expect(parentSelect.value).toBe("Travel");
    expect(subSelect.value).toBe("Food");
  });

  it("saves the id of the suggested sub category when a parent shares its name", async () => {
    const onContinue = renderStep();
    await screen.findAllByRole("combobox");

    fireEvent.click(screen.getByText("Continue"));
    const saved = onContinue.mock.calls[0][0][0];
    expect(saved.categoryName).toBe("Food");
    expect(saved.categoryId).toBe("3");
  });

  it("reports a suggested parent that is not in the taxonomy as a new category", async () => {
    stubSuggestion("Hobbies", null);
    const onContinue = renderStep();
    await screen.findAllByRole("combobox");

    fireEvent.click(screen.getByText("Continue"));
    const [updated, newCategoryNames] = onContinue.mock.calls[0];
    expect(updated[0].categoryName).toBe("Hobbies");
    expect(updated[0].categoryId).toBeUndefined();
    expect(newCategoryNames).toEqual(["Hobbies"]);
  });

  it("keeps cache hits' parent and sub without flagging new categories", async () => {
    stubSuggestion("Travel", "Flights", "cache");
    const onContinue = renderStep();
    await screen.findByText(/automatically tagged from history/);

    fireEvent.click(screen.getByText("Continue"));
    const [updated, newCategoryNames] = onContinue.mock.calls[0];
    expect(updated[0].categoryId).toBe("4");
    expect(newCategoryNames).toEqual([]);
  });

  it("clears the sub category when the parent changes", async () => {
    renderStep();

    const [parentSelect, subSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];

    fireEvent.change(subSelect, { target: { value: "Flights" } });
    expect(subSelect.value).toBe("Flights");

    fireEvent.change(parentSelect, { target: { value: "Food" } });
    expect(subSelect.value).toBe("");
  });
});
