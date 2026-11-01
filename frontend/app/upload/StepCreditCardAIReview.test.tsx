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
    const [updated, newCategories] = onContinue.mock.calls[0];
    expect(updated[0].categoryName).toBe("Hobbies");
    expect(updated[0].categoryId).toBeUndefined();
    expect(newCategories).toEqual([{ categoryName: "Hobbies", parentName: null }]);
  });

  it("keeps cache hits' parent and sub without flagging new categories", async () => {
    stubSuggestion("Travel", "Flights", "cache");
    const onContinue = renderStep();
    await screen.findByText(/automatically tagged from history/);

    fireEvent.click(screen.getByText("Continue"));
    const [updated, newCategories] = onContinue.mock.calls[0];
    expect(updated[0].categoryId).toBe("4");
    expect(newCategories).toEqual([]);
  });

  describe("when the AI has no answer", () => {
    it("leaves the category blank and flags the row red instead of offering Uncategorized", async () => {
      stubSuggestion("Uncategorized", null);
      const onContinue = renderStep();

      const [parentSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
      expect(parentSelect.value).toBe("");
      expect(screen.getByText("No suggestion")).toBeInTheDocument();
      expect(parentSelect.closest("tr")).toHaveClass("bg-red-50");
      expect(screen.queryByRole("option", { name: /Uncategorized \(New\)/ })).toBeNull();

      fireEvent.click(screen.getByText("Continue"));
      const [updated, newCategories] = onContinue.mock.calls[0];
      expect(updated[0].categoryName).toBeUndefined();
      expect(newCategories).toEqual([]);
    });

    it("clears the red flag once a category is picked", async () => {
      stubSuggestion("Uncategorized", null);
      renderStep();

      const [parentSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
      fireEvent.change(parentSelect, { target: { value: "Travel" } });

      expect(parentSelect.closest("tr")).not.toHaveClass("bg-red-50");
    });
  });

  describe("when the AI has no answer", () => {
    it("leaves the category blank and flags the row red instead of creating Uncategorized", async () => {
      stubSuggestion("Uncategorized", null);
      const onContinue = renderStep();

      const [parentSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
      expect(parentSelect.value).toBe("");
      expect(screen.getByText("No suggestion")).toBeInTheDocument();
      expect(parentSelect.closest("tr")).toHaveClass("bg-red-50");

      fireEvent.click(screen.getByText("Continue"));
      const [updated, newCategories] = onContinue.mock.calls[0];
      expect(updated[0].categoryName).toBeUndefined();
      expect(newCategories).toEqual([]);
    });

    it("clears the red flag once a category is picked", async () => {
      stubSuggestion("Uncategorized", null);
      renderStep();

      const [parentSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
      fireEvent.change(parentSelect, { target: { value: "Travel" } });

      expect(parentSelect.closest("tr")).not.toHaveClass("bg-red-50");
    });
  });

  it("keeps a suggested sub category that is new under an existing parent", async () => {
    stubSuggestion("Travel", "Hostels");
    const onContinue = renderStep();

    const [parentSelect, subSelect] = (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
    expect(parentSelect.value).toBe("Travel");
    expect(subSelect.value).toBe("Hostels");

    fireEvent.click(screen.getByText("Continue"));
    const [updated, newCategories] = onContinue.mock.calls[0];
    expect(updated[0].categoryName).toBe("Hostels");
    expect(newCategories).toEqual([{ categoryName: "Hostels", parentName: "Travel" }]);
  });

  describe("creating categories inline", () => {
    async function selects() {
      return (await screen.findAllByRole("combobox")) as HTMLSelectElement[];
    }

    function addName(placeholder: string, name: string) {
      fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value: name } });
      fireEvent.click(screen.getByText("Add"));
    }

    it("creates a new parent and clears the sub category", async () => {
      const onContinue = renderStep();
      const [parentSelect] = await selects();

      fireEvent.change(parentSelect, { target: { value: "__new__" } });
      addName("New parent name…", "Hobbies");

      const [newParentSelect, newSubSelect] = await selects();
      expect(newParentSelect.value).toBe("Hobbies");
      expect(newSubSelect.value).toBe("");

      fireEvent.click(screen.getByText("Continue"));
      const [updated, newCategories] = onContinue.mock.calls[0];
      expect(updated[0].categoryName).toBe("Hobbies");
      expect(newCategories).toEqual([{ categoryName: "Hobbies", parentName: null }]);
    });

    it("creates a new sub category under an existing parent", async () => {
      const onContinue = renderStep();
      const [, subSelect] = await selects();

      fireEvent.change(subSelect, { target: { value: "__new__" } });
      addName("New sub category name…", "Hostels");

      const [, newSubSelect] = await selects();
      expect(newSubSelect.value).toBe("Hostels");

      fireEvent.click(screen.getByText("Continue"));
      const [updated, newCategories] = onContinue.mock.calls[0];
      expect(updated[0].categoryName).toBe("Hostels");
      expect(updated[0].categoryId).toBeUndefined();
      expect(newCategories).toEqual([{ categoryName: "Hostels", parentName: "Travel" }]);
    });

    it("creates a new sub category under a new parent", async () => {
      const onContinue = renderStep();
      const [parentSelect] = await selects();

      fireEvent.change(parentSelect, { target: { value: "__new__" } });
      addName("New parent name…", "Hobbies");
      const [, subSelect] = await selects();
      fireEvent.change(subSelect, { target: { value: "__new__" } });
      addName("New sub category name…", "Climbing");

      fireEvent.click(screen.getByText("Continue"));
      const [updated, newCategories] = onContinue.mock.calls[0];
      expect(updated[0].categoryName).toBe("Climbing");
      expect(newCategories).toEqual([
        { categoryName: "Hobbies", parentName: null },
        { categoryName: "Climbing", parentName: "Hobbies" },
      ]);
    });

    it("rejects a name that already exists in the taxonomy", async () => {
      renderStep();
      const [, subSelect] = await selects();

      fireEvent.change(subSelect, { target: { value: "__new__" } });
      addName("New sub category name…", "Flights");

      expect(screen.getByText(/already exists/)).toBeInTheDocument();
      expect(screen.getByPlaceholderText("New sub category name…")).toBeInTheDocument();
    });

    it("cancels without changing the selection", async () => {
      renderStep();
      const [parentSelect] = await selects();

      fireEvent.change(parentSelect, { target: { value: "__new__" } });
      fireEvent.click(screen.getByText("Cancel"));

      const [restoredParent, restoredSub] = await selects();
      expect(restoredParent.value).toBe("Travel");
      expect(restoredSub.value).toBe("Food");
    });
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
