/**
 * Tests for the AI categorisation step, focusing on the user-defined category flow.
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepCreditCardAIReview from "./StepCreditCardAIReview";
import type { Category, ParsedTransaction } from "./types";

const mockTransaction: ParsedTransaction = {
  description: "Coffee Shop",
  amountHome: 5.0,
  amountLocal: null,
  localCurrency: null,
  date: "2024-01-01",
  sourceFormat: "wealthsimple",
  raw: {},
};

const mockTaxonomy: Category[] = [
  {
    id: "1",
    name: "Food",
    parentId: null,
    children: [{ id: "2", name: "Groceries" }],
  },
];

function makeFetchMock(
  results: { categoryName: string; confidence: number; source: "cache" | "ai" }[]
) {
  return vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ results }),
  });
}

async function renderAndWaitForLoad(props?: Partial<Parameters<typeof StepCreditCardAIReview>[0]>) {
  global.fetch = makeFetchMock([
    { categoryName: "Dining", confidence: 0.9, source: "ai" },
  ]);

  const onContinue = vi.fn();
  const onBack = vi.fn();

  render(
    <StepCreditCardAIReview
      transactions={[mockTransaction]}
      existingTaxonomy={mockTaxonomy}
      onBack={onBack}
      onContinue={onContinue}
      {...props}
    />
  );

  await waitFor(() => {
    expect(screen.queryByText(/Running AI categorisation/i)).not.toBeInTheDocument();
  });

  return { onContinue, onBack };
}

describe("StepCreditCardAIReview — API error banner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the aiError banner when Gemini fails but still renders the UI", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [{ categoryName: "Uncategorized", confidence: 0, source: "ai" }],
        aiError: "AI categorisation is temporarily unavailable. You can still categorise transactions manually below.",
      }),
    });

    render(
      <StepCreditCardAIReview
        transactions={[mockTransaction]}
        existingTaxonomy={mockTaxonomy}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/AI categorisation is temporarily unavailable/)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeInTheDocument();
  });

  it("shows the error message as a banner when the API itself returns an error status", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ message: "Server error." }),
    });

    render(
      <StepCreditCardAIReview
        transactions={[mockTransaction]}
        existingTaxonomy={mockTaxonomy}
        onBack={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Server error.")).toBeInTheDocument();
    });
  });
});

describe("StepCreditCardAIReview — add category input", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the category input and button", async () => {
    await renderAndWaitForLoad();
    expect(screen.getByPlaceholderText("New category name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Category" })).toBeInTheDocument();
  });

  it("adds a valid category as a chip and clears the input", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByRole("button", { name: "Remove Entertainment" })).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe("");
  });

  it("adds a category when Enter is pressed", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Travel" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(screen.getByRole("button", { name: "Remove Travel" })).toBeInTheDocument();
  });

  it("does nothing when input is empty", async () => {
    await renderAndWaitForLoad();
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.queryByRole("button", { name: /Remove/i })).not.toBeInTheDocument();
  });

  it("shows error when name exceeds 50 characters", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "A".repeat(51) } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText(/50 characters or fewer/i)).toBeInTheDocument();
  });

  it("shows error when name contains numbers", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Category1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText(/must not contain numbers/i)).toBeInTheDocument();
  });

  it("shows error when name already exists in taxonomy", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Food" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText(/"Food" already exists/)).toBeInTheDocument();
  });

  it("shows error when name is a duplicate user-added category", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText(/"Entertainment" already exists/)).toBeInTheDocument();
  });

  it("clears error message when input changes", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Category1" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    expect(screen.getByText(/must not contain numbers/i)).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "Entertainment" } });
    expect(screen.queryByText(/must not contain numbers/i)).not.toBeInTheDocument();
  });

  it("removes a chip when × is clicked", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Entertainment" }));
    expect(screen.queryByText(/Entertainment/)).not.toBeInTheDocument();
  });
});

describe("StepCreditCardAIReview — category dropdown integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("user-added category appears as an option in the parent dropdown", async () => {
    await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));

    const parentSelect = screen.getAllByRole("combobox")[0];
    const options = Array.from((parentSelect as HTMLSelectElement).options).map((o) => o.text);
    expect(options.some((o) => o.includes("Entertainment"))).toBe(true);
  });

  it("user-added category not assigned to any transaction is excluded from newCategoryNames", async () => {
    const { onContinue } = await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));

    // Do not change any dropdown — "Entertainment" is unassigned
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledOnce();
    const [, newCategoryNames] = onContinue.mock.calls[0];
    expect(newCategoryNames).not.toContain("Entertainment");
  });

  it("user-added category assigned to a transaction is included in newCategoryNames", async () => {
    const { onContinue } = await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));

    // Select "Entertainment" as the parent category for the transaction
    const parentSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(parentSelect, { target: { value: "Entertainment" } });

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledOnce();
    const [, newCategoryNames] = onContinue.mock.calls[0];
    expect(newCategoryNames).toContain("Entertainment");
  });

  it("removing a user-added category that was selected resets the transaction to the AI suggestion", async () => {
    const { onContinue } = await renderAndWaitForLoad();
    const input = screen.getByPlaceholderText("New category name");
    fireEvent.change(input, { target: { value: "Entertainment" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Category" }));

    const parentSelect = screen.getAllByRole("combobox")[0];
    fireEvent.change(parentSelect, { target: { value: "Entertainment" } });

    // Remove the chip — choices should reset to the AI suggestion "Dining"
    fireEvent.click(screen.getByRole("button", { name: "Remove Entertainment" }));

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(onContinue).toHaveBeenCalledOnce();
    const [updatedTransactions, newCategoryNames] = onContinue.mock.calls[0];
    expect(updatedTransactions[0].categoryName).toBe("Dining");
    // "Dining" is not in taxonomy, so it appears as a new category
    expect(newCategoryNames).toContain("Dining");
    expect(newCategoryNames).not.toContain("Entertainment");
  });
});
