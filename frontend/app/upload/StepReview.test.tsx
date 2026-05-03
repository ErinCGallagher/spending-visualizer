import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepReview from "./StepReview";
import type { Category, ParsedTransaction } from "./types";

const mockTransactions: ParsedTransaction[] = [
  {
    id: "1",
    date: "2024-01-01",
    description: "Uber",
    amount: 15,
    amountHome: 15,
    currency: "CAD",
    category: "", // Uncategorized
    country: "Canada",
  },
  {
    id: "2",
    date: "2024-01-02",
    description: "Starbucks",
    amount: 5,
    amountHome: 5,
    currency: "CAD",
    category: "Coffee", // Already categorized
    categoryName: "Coffee",
    country: "Canada",
  },
];

const mockTaxonomy: Category[] = [
  { name: "Dining Out", children: [{ name: "Coffee" }, { name: "Restaurant" }] },
  { name: "Transport", children: [{ name: "Taxi" }] },
];

describe("StepReview", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { categoryName: "Taxi", confidence: 0.9 }, // High confidence for Uber
        ],
      }),
    });
  });

  it("renders loading state then accepted suggestions", async () => {
    render(
      <StepReview
        transactions={mockTransactions}
        taxonomy={mockTaxonomy}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText(/Running AI categorisation…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/accepted automatically/i)).toBeInTheDocument();
      expect(screen.getByText(/1 of 1/i)).toBeInTheDocument();
      expect(screen.getByText(/All suggestions were high-confidence/i)).toBeInTheDocument();
    });
  });

  it("surfaces low-confidence suggestions for review", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        results: [
          { categoryName: "Taxi", confidence: 0.6 }, // Low confidence
        ],
      }),
    });

    render(
      <StepReview
        transactions={mockTransactions}
        taxonomy={mockTaxonomy}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Review 1 low-confidence suggestion/i)).toBeInTheDocument();
      expect(screen.getByText("Taxi (60%)")).toBeInTheDocument();
    });

    // Check that we can change the category
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "Restaurant" } });
    expect(select).toHaveValue("Restaurant");
  });

  it("calls onContinue with updated categories", async () => {
    render(
      <StepReview
        transactions={mockTransactions}
        taxonomy={mockTaxonomy}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => screen.getByText("Continue"));
    fireEvent.click(screen.getByText("Continue"));

    expect(mockOnContinue).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ description: "Uber", categoryName: "Taxi" }),
      expect.objectContaining({ description: "Starbucks", categoryName: "Coffee" }),
    ]));
  });

  it("handles errors from categorisation API", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ message: "API Error" }),
    });

    render(
      <StepReview
        transactions={mockTransactions}
        taxonomy={mockTaxonomy}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("API Error")).toBeInTheDocument();
    });
  });
});
