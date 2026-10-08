import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BudgetSetupPage from "./page";

const categories = [
  {
    id: "c1",
    name: "Groceries",
    parentId: null,
    children: [{ id: "c2", name: "Snacks" }],
  },
];

describe("BudgetSetupPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("renders categories with amount inputs, prefilled from existing budgets", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ budgets: [{ categoryId: "c1", monthlyAmount: 200 }] }),
      });

    render(<BudgetSetupPage />);

    expect(await screen.findByText("Snacks")).toBeInTheDocument();
    const inputs = screen.getAllByPlaceholderText("0.00") as HTMLInputElement[];
    expect(inputs.some((i) => i.value === "200")).toBe(true);
  });

  it("saves entered amounts as a bulk POST to /api/budgets", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => categories })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) });

    render(<BudgetSetupPage />);

    await screen.findByText("Snacks");

    const inputs = screen.getAllByPlaceholderText("0.00");
    fireEvent.change(inputs[0], { target: { value: "150" } });
    fireEvent.change(inputs[1], { target: { value: "25" } });

    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    await waitFor(() => {
      expect(screen.getByText(/budget saved/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/budgets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          budgets: [
            { categoryId: "c1", monthlyAmount: 150 },
            { categoryId: "c2", monthlyAmount: 25 },
          ],
        }),
      })
    );
  });

  it("shows a message when there are no categories yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) });

    render(<BudgetSetupPage />);

    expect(await screen.findByText(/no categories yet/i)).toBeInTheDocument();
  });
});
