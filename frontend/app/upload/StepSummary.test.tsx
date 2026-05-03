import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StepSummary from "./StepSummary";
import type { ParsedUploadResult } from "./types";

const mockResult: ParsedUploadResult = {
  transactions: [
    {
      id: "1",
      date: "2024-01-01",
      description: "Lunch",
      amount: 15,
      amountHome: 15,
      currency: "CAD",
      category: "Food",
      country: "Canada",
    },
  ],
  dateRange: { from: "2024-01-01", to: "2024-01-01" },
  homeCurrency: "CAD",
  travellers: ["Erin"],
  errors: [],
};

describe("StepSummary", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  it("renders summary correctly", () => {
    render(
      <StepSummary
        result={mockResult}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText("Review your upload")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument(); // Transaction count
    expect(screen.getByText("CAD")).toBeInTheDocument();
    expect(screen.getByText("Erin")).toBeInTheDocument();
  });

  it("shows overlap warning when present", () => {
    const resultWithWarning = { ...mockResult, overlapWarning: true };
    render(
      <StepSummary
        result={resultWithWarning}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText(/Some of these dates overlap/i)).toBeInTheDocument();
  });

  it("disables continue button when there are errors", () => {
    const resultWithErrors: ParsedUploadResult = {
      ...mockResult,
      errors: [{ message: "Missing date", row: 2 }],
    };
    render(
      <StepSummary
        result={resultWithErrors}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
    expect(screen.getByText(/1 row could not be imported/i)).toBeInTheDocument();
  });

  it("disables continue button when there are no transactions", () => {
    const resultNoTransactions: ParsedUploadResult = {
      ...mockResult,
      transactions: [],
    };
    render(
      <StepSummary
        result={resultNoTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    const continueButton = screen.getByRole("button", { name: /Continue/i });
    expect(continueButton).toBeDisabled();
    expect(screen.getByText(/No valid transactions found/i)).toBeInTheDocument();
  });

  it("calls onContinue when continue button is clicked", () => {
    render(
      <StepSummary
        result={mockResult}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(mockOnContinue).toHaveBeenCalled();
  });
});
