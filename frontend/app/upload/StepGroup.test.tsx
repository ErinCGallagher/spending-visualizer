import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import StepGroup from "./StepGroup";
import type { ParsedTransaction } from "./types";

const mockTransactions: ParsedTransaction[] = [
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
  {
    id: "2",
    date: "2024-01-02",
    description: "Bus",
    amount: 3,
    amountHome: 3,
    currency: "CAD",
    category: "Transport",
    country: "Canada",
  },
];

describe("StepGroup", () => {
  const mockOnContinue = vi.fn();
  const mockOnBack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url) => {
      if (url === "/api/groups") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ groups: [{ id: "g1", name: "Existing Trip", groupType: "trip" }] }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ id: "new-id", name: "New Group", groupType: "trip" }),
      });
    });
  });

  it("renders correctly and loads groups", async () => {
    render(
      <StepGroup
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    expect(screen.getByText("Assign to a group")).toBeInTheDocument();
    
    await waitFor(() => {
      fireEvent.click(screen.getByText("Trip"));
      expect(screen.getByText("Existing Trip")).toBeInTheDocument();
    });
  });

  it("validates group selection", async () => {
    render(
      <StepGroup
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Select a group type")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Trip"));
    fireEvent.click(screen.getByText("Continue"));
    expect(screen.getByText("Select an existing group or enter a name for a new one")).toBeInTheDocument();
  });

  it("handles new group creation", async () => {
    render(
      <StepGroup
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    fireEvent.click(screen.getByText("Trip"));
    const input = screen.getByPlaceholderText(/New trip name/i);
    fireEvent.change(input, { target: { value: "My Awesome Trip" } });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/groups", expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "My Awesome Trip", groupType: "trip" }),
      }));
      expect(mockOnContinue).toHaveBeenCalled();
    });
  });

  it("handles secondary group for deselected transactions", async () => {
    render(
      <StepGroup
        transactions={mockTransactions}
        onBack={mockOnBack}
        onContinue={mockOnContinue}
      />
    );

    // Deselect the first transaction
    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]); // Index 0 is "select all", index 1 is first row

    await waitFor(() => {
      expect(screen.getByText(/Assign 1 unchecked transaction to:/i)).toBeInTheDocument();
    });

    // Primary group
    fireEvent.click(screen.getAllByText("Trip")[0]);
    fireEvent.change(screen.getByPlaceholderText(/New trip name/i), { target: { value: "Primary" } });

    // Secondary group
    const secondarySection = screen.getByText(/Assign 1 unchecked transaction to:/i).closest('div');
    const secondaryTripButton = Array.from(secondarySection!.querySelectorAll('button')).find(b => b.textContent === 'Trip');
    fireEvent.click(secondaryTripButton!);
    
    const secondaryInput = secondarySection!.querySelector('input[type="text"]');
    fireEvent.change(secondaryInput!, { target: { value: "Secondary" } });

    fireEvent.click(screen.getByText("Continue"));

    await waitFor(() => {
      // 2 calls to POST /api/groups
      const postCalls = (global.fetch as any).mock.calls.filter((call: any) => call[1]?.method === "POST");
      expect(postCalls).toHaveLength(2);
      expect(mockOnContinue).toHaveBeenCalled();
    });
  });
});
