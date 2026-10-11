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
  {
    id: "c3",
    name: "Rent",
    parentId: null,
    children: [],
  },
  {
    id: "inc",
    name: "Income",
    parentId: null,
    children: [],
  },
];

const defaultIncome = { parent: { id: "inc", name: "Income" }, children: [] };

function mockInitialFetch(
  budgets: { categoryId: string; monthlyAmount: number }[] = [],
  income: { parent: { id: string; name: string }; children: { id: string; name: string }[] } = defaultIncome
) {
  (global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ ok: true, json: async () => categories })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets }) })
    .mockResolvedValueOnce({ ok: true, json: async () => income });
}

describe("BudgetSetupPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("starts with an empty table and an Add button", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);

    expect(await screen.findByText(/no budget rows yet/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add Spending Category" })).toBeInTheDocument();
  });

  it("adding a row for a childless category shows a single editable row", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c3" } });

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
  });

  it("adding a row for a category with children expands child rows with a read-only parent total", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c1" } });

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();

    const childInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    fireEvent.change(childInput, { target: { value: "25" } });

    expect(screen.getByText("$25.00")).toBeInTheDocument();
  });

  it("prefills groups and rows from existing budgets, including the derived parent total", async () => {
    mockInitialFetch([{ categoryId: "c2", monthlyAmount: 25 }]);
    render(<BudgetSetupPage />);

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
    expect(screen.getByText("$25.00")).toBeInTheDocument();
    const input = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it("deleting a child row removes it and updates the parent total, without removing the group", async () => {
    mockInitialFetch([{ categoryId: "c2", monthlyAmount: 25 }]);
    render(<BudgetSetupPage />);
    await screen.findByText("Snacks");

    fireEvent.click(screen.getByRole("button", { name: /delete snacks/i }));

    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
  });

  it("deleting a childless row removes it entirely", async () => {
    mockInitialFetch([{ categoryId: "c3", monthlyAmount: 100 }]);
    render(<BudgetSetupPage />);
    await screen.findByText("Rent");

    fireEvent.click(screen.getByRole("button", { name: /delete rent/i }));

    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(await screen.findByText(/no budget rows yet/i)).toBeInTheDocument();
  });

  it("saves edited amounts via POST and deletes removed rows via DELETE", async () => {
    mockInitialFetch([
      { categoryId: "c2", monthlyAmount: 25 },
      { categoryId: "c3", monthlyAmount: 100 },
    ]);
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true }) // DELETE /api/budgets/c3
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) }); // POST /api/budgets

    render(<BudgetSetupPage />);
    await screen.findByText("Rent");

    fireEvent.click(screen.getByRole("button", { name: /delete rent/i }));

    const childInput = screen.getByPlaceholderText("0.00") as HTMLInputElement;
    fireEvent.change(childInput, { target: { value: "30" } });

    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    await waitFor(() => {
      expect(screen.getByText(/budget saved/i)).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/budgets/c3",
      expect.objectContaining({ method: "DELETE" })
    );
    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/budgets",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ budgets: [{ categoryId: "c2", monthlyAmount: 30 }] }),
      })
    );
  });

  it("shows a message when there are no categories yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => defaultIncome });

    render(<BudgetSetupPage />);

    expect(await screen.findByText(/no categories yet/i)).toBeInTheDocument();
  });

  it("renders distinct Budget and Income sections, excluding Income from the Budget dropdown", async () => {
    mockInitialFetch([], {
      parent: { id: "inc", name: "Income" },
      children: [{ id: "inc-salary", name: "Salary" }],
    });
    render(<BudgetSetupPage />);

    expect(await screen.findByRole("heading", { name: "Spending Budget" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Income" })).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    const optionLabels = screen.getAllByRole("option").map((o) => o.textContent);
    expect(optionLabels).not.toContain("Income");
  });

  it("shows the Income section subtitle and lists existing income categories", async () => {
    mockInitialFetch([], {
      parent: { id: "inc", name: "Income" },
      children: [{ id: "inc-salary", name: "Salary" }],
    });
    render(<BudgetSetupPage />);

    expect(await screen.findByText("Create a list of income sub categories")).toBeInTheDocument();
    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("adding an income category posts to /api/categories with the income parentId", async () => {
    mockInitialFetch();

    render(<BudgetSetupPage />);
    await screen.findByRole("heading", { name: "Income" });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: "inc-bonus", name: "Bonus", parentId: "inc" }),
    });

    fireEvent.click(screen.getByRole("button", { name: /add income category/i }));
    fireEvent.change(screen.getByPlaceholderText("Income Category Name"), {
      target: { value: "Bonus" },
    });
    fireEvent.keyDown(screen.getByPlaceholderText("Income Category Name"), { key: "Enter" });

    await waitFor(() => {
      expect(screen.getByText("Bonus")).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      "/api/categories",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ name: "Bonus", parentId: "inc" }),
      })
    );
  });

  it("shows a $ prefix on amount inputs", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "c3" } });

    const input = screen.getByPlaceholderText("0.00");
    expect(input.parentElement).toHaveTextContent("$");
  });
});
