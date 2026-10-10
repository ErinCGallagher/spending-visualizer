import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BudgetTab from "./BudgetTab";
import type { Meta } from "./Filters";

const groups = [
  { id: "g1", name: "Daily Living", groupType: "daily" },
  { id: "g2", name: "Japan Trip", groupType: "trip" },
];

function makeMeta(overrides: Partial<Meta> = {}): Meta {
  return {
    categories: [],
    travellers: [],
    paymentMethods: [],
    countries: [],
    dateRange: { from: "2026-01-01", to: "2026-03-01" },
    groups,
    groupTypes: [],
    overviewDefaultFilter: null,
    tripDefaultFilter: null,
    homeCurrency: "CAD",
    ...overrides,
  };
}

describe("BudgetTab", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("shows the group picker on first run (no settings saved)", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<BudgetTab meta={makeMeta()} />);

    expect(await screen.findByText(/set up your budget/i)).toBeInTheDocument();
    expect(screen.getByText("Daily Living")).toBeInTheDocument();
    expect(screen.getByText("Japan Trip")).toBeInTheDocument();
  });

  it("saves the selected group and shows the placeholder", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => null })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ groupId: "g1" }) })
      .mockResolvedValueOnce({ ok: true, json: async () => null });

    render(<BudgetTab meta={makeMeta()} />);

    await screen.findByText(/set up your budget/i);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "g1" } });
    fireEvent.click(screen.getByRole("button", { name: /continue/i }));

    await waitFor(() => {
      expect(screen.getByText(/daily living/i)).toBeInTheDocument();
      expect(screen.getByRole("link", { name: /create your budget/i })).toHaveAttribute(
        "href",
        "/budget/setup"
      );
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      "/api/budget-settings",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ groupId: "g1" }),
      })
    );
  });

  it("shows the existing group placeholder when settings exist but no budget yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groupId: "g1", groupName: "Daily Living", groupType: "daily" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => null });

    render(<BudgetTab meta={makeMeta()} />);

    expect(await screen.findByText(/daily living/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /create your budget/i })).toBeInTheDocument();
  });

  it("prompts to import transactions when there are no groups yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => null,
    });

    render(<BudgetTab meta={makeMeta({ groups: [] })} />);

    expect(await screen.findByText(/no groups yet/i)).toBeInTheDocument();
  });

  it("renders the chart and stats once a budget's summary has data", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ groupId: "g1", groupName: "Daily Living", groupType: "daily" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          groupId: "g1",
          groupName: "Daily Living",
          totalMonthlyBudget: 500,
          categories: [
            { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", monthlyAmount: 500 },
          ],
          monthly: [
            { month: "2026-01", categoryId: "c1", categoryName: "Groceries", actual: 300 },
            { month: "2026-02", categoryId: "c1", categoryName: "Groceries", actual: 450 },
          ],
        }),
      });

    render(<BudgetTab meta={makeMeta()} />);

    expect(await screen.findByText("Actual spending")).toBeInTheDocument();
    expect(screen.getByText("Budget")).toBeInTheDocument();
    expect(screen.getByText("Avg monthly spending")).toBeInTheDocument();
    expect(screen.getByText("Avg monthly budget")).toBeInTheDocument();
    expect(screen.getByText("Food")).toBeInTheDocument();
  });
});
