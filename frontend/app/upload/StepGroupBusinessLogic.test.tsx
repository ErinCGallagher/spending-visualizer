import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepGroup from "./StepGroup";
import type { ParsedTransaction } from "./types";

const mockTransactions: ParsedTransaction[] = [
  {
    description: "Lunch",
    amountHome: 15,
    amountLocal: 15,
    localCurrency: "CAD",
    date: "2024-01-01",
    sourceFormat: "amex",
    raw: {},
  },
];

describe("StepGroup Business Logic", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("defaults to Daily Living for credit card formats", async () => {
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/groups") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            groups: [
              { id: "g1", name: "My Trip", groupType: "trip" },
              { id: "g2", name: "Main Budget", groupType: "daily" }
            ]
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <StepGroup
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    // Wait for groups to load
    await waitFor(() => {
      expect(screen.queryByText("Running AI categorisation…")).not.toBeInTheDocument();
    });

    // Check if "Daily Living" is selected (should have specific classes)
    const dailyButton = screen.getByText("Daily Living");
    expect(dailyButton).toHaveClass("bg-emerald-800", "text-white");

    // Check if the first daily group "Main Budget" is selected in the dropdown
    const select = screen.getByRole("combobox");
    expect(select).toHaveValue("g2");
  });

  it("does not default for non-credit card formats", async () => {
    const travelSpendTx = [{ ...mockTransactions[0], sourceFormat: "travelspend" }];
    
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/groups") {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            groups: [{ id: "g1", name: "My Trip", groupType: "trip" }]
          }),
        });
      }
      return Promise.resolve({ ok: true, json: async () => ({}) });
    });

    render(
      <StepGroup
        transactions={travelSpendTx}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    await waitFor(() => expect(screen.queryByText("Add to existing…")).not.toBeInTheDocument());

    // Group type buttons should not have the selected class
    const buttons = screen.getAllByRole("button");
    const tripButton = buttons.find(b => b.textContent === "Trip");
    const dailyButton = buttons.find(b => b.textContent === "Daily Living");
    
    expect(tripButton).not.toHaveClass("bg-emerald-800");
    expect(dailyButton).not.toHaveClass("bg-emerald-800");
  });
});
