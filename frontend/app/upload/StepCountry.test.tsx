import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import StepCountry from "./StepCountry";
import type { ParsedTransaction } from "./types";

const mockTransactions: ParsedTransaction[] = [
  {
    id: "1",
    date: "2024-01-01",
    description: "Lunch",
    amount: 15,
    currency: "CAD",
    category: "Food",
    country: "Canada",
  },
  {
    id: "2",
    date: "2024-01-02",
    description: "Bus",
    amount: 3,
    currency: "CAD",
    category: "Transport",
    country: "USA",
  },
];

describe("StepCountry", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  it("renders correctly with detected countries", () => {
    render(
      <StepCountry
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText("Canada")).toBeInTheDocument();
    expect(screen.getByText("USA")).toBeInTheDocument();
    expect(screen.getByText("Keep as uploaded")).toBeInTheDocument();
  });

  it("calls onContinue with original transactions when no override is set", () => {
    render(
      <StepCountry
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByText("Keep as uploaded"));
    expect(mockOnContinue).toHaveBeenCalledWith(mockTransactions);
  });

  it("updates override when a detected country button is clicked", () => {
    render(
      <StepCountry
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByText("Canada"));
    const input = screen.getByPlaceholderText(/e.g. Canada/i) as HTMLInputElement;
    expect(input.value).toBe("Canada");
  });

  it("calls onContinue with updated transactions when override is set", () => {
    render(
      <StepCountry
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    const input = screen.getByPlaceholderText(/e.g. Canada/i);
    fireEvent.change(input, { target: { value: "Peru" } });

    fireEvent.click(screen.getByText("Override & Continue"));

    const expected = mockTransactions.map(t => ({ ...t, country: "Peru" }));
    expect(mockOnContinue).toHaveBeenCalledWith(expected);
  });

  it("calls onBack when back button is clicked", () => {
    render(
      <StepCountry
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByText("Back"));
    expect(mockOnBack).toHaveBeenCalled();
  });
});
