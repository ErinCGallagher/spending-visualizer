import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import BudgetSetupPage from "./page";

let mockSearch = "";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(mockSearch),
}));

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
const currentYear = new Date().getFullYear();

function mockInitialFetch(
  budgets: { categoryId: string; monthlyAmount: number }[] = [],
  income: { parent: { id: string; name: string }; children: { id: string; name: string }[] } = defaultIncome,
  pension: { year: number; contributions: { month: number; amount: number }[] } = {
    year: currentYear,
    contributions: [],
  }
) {
  (global.fetch as ReturnType<typeof vi.fn>)
    .mockResolvedValueOnce({ ok: true, json: async () => categories })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets }) })
    .mockResolvedValueOnce({ ok: true, json: async () => income })
    .mockResolvedValueOnce({ ok: true, json: async () => pension });
}

describe("BudgetSetupPage", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    mockSearch = "";
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
    fireEvent.change(screen.getByRole("combobox", { name: "Choose a category" }), { target: { value: "c3" } });

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
  });

  it("adding a row for a category with children expands child rows with a read-only parent total", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Choose a category" }), { target: { value: "c1" } });

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2); // parent total + table total

    const childInput = screen.getByLabelText("Snacks monthly amount") as HTMLInputElement;
    fireEvent.change(childInput, { target: { value: "25" } });

    expect(screen.getAllByText("$25.00")).toHaveLength(2); // parent total + table total
  });

  it("prefills groups and rows from existing budgets, including the derived parent total", async () => {
    mockInitialFetch([{ categoryId: "c2", monthlyAmount: 25 }]);
    render(<BudgetSetupPage />);

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Snacks")).toBeInTheDocument();
    expect(screen.getAllByText("$25.00")).toHaveLength(2); // parent total + table total
    const input = screen.getByLabelText("Snacks monthly amount") as HTMLInputElement;
    expect(input.value).toBe("25");
  });

  it("deleting a child row removes it and updates the parent total, without removing the group", async () => {
    mockInitialFetch([{ categoryId: "c2", monthlyAmount: 25 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true }); // DELETE /api/budgets/c2
    render(<BudgetSetupPage />);
    await screen.findByText("Snacks");

    fireEvent.click(screen.getByRole("button", { name: /delete snacks/i }));

    expect(screen.queryByText("Snacks")).not.toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getAllByText("$0.00")).toHaveLength(2); // parent total + table total
  });

  it("deleting a childless row removes it entirely", async () => {
    mockInitialFetch([{ categoryId: "c3", monthlyAmount: 100 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true }); // DELETE /api/budgets/c3
    render(<BudgetSetupPage />);
    await screen.findByText("Rent");

    fireEvent.click(screen.getByRole("button", { name: /delete rent/i }));

    expect(screen.queryByText("Rent")).not.toBeInTheDocument();
    expect(await screen.findByText(/no budget rows yet/i)).toBeInTheDocument();
  });

  it("saves an edited amount on blur via POST", async () => {
    mockInitialFetch([{ categoryId: "c2", monthlyAmount: 25 }]);
    render(<BudgetSetupPage />);
    await screen.findByText("Snacks");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ budgets: [] }),
    });

    const childInput = screen.getByLabelText("Snacks monthly amount") as HTMLInputElement;
    fireEvent.change(childInput, { target: { value: "30" } });
    fireEvent.blur(childInput);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/budgets",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ budgets: [{ categoryId: "c2", monthlyAmount: 30 }] }),
        })
      );
    });
  });

  it("does not POST on blur when the amount is left empty", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    fireEvent.click(screen.getByRole("button", { name: "Add Spending Category" }));
    fireEvent.change(screen.getByRole("combobox", { name: "Choose a category" }), { target: { value: "c3" } });

    const input = screen.getByLabelText("Rent monthly amount") as HTMLInputElement;
    fireEvent.blur(input);

    expect(global.fetch).not.toHaveBeenCalledWith("/api/budgets", expect.objectContaining({ method: "POST" }));
  });

  it("deletes a removed row immediately via DELETE", async () => {
    mockInitialFetch([{ categoryId: "c3", monthlyAmount: 100 }]);
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ ok: true }); // DELETE /api/budgets/c3
    render(<BudgetSetupPage />);
    await screen.findByText("Rent");

    fireEvent.click(screen.getByRole("button", { name: /delete rent/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/budgets/c3",
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  it("shows a message when there are no categories yet", async () => {
    (global.fetch as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ ok: true, json: async () => [] })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ budgets: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => defaultIncome })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ year: currentYear, contributions: [] }) });

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
    fireEvent.change(screen.getByRole("combobox", { name: "Choose a category" }), { target: { value: "c3" } });

    const input = screen.getByLabelText("Rent monthly amount");
    expect(input.parentElement).toHaveTextContent("$");
  });

  it("shows a Total row summing all spending budget amounts", async () => {
    mockInitialFetch([
      { categoryId: "c2", monthlyAmount: 25 },
      { categoryId: "c3", monthlyAmount: 100 },
    ]);
    render(<BudgetSetupPage />);

    await screen.findByText("Rent");

    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$125.00")).toBeInTheDocument();
  });

  it("prefills the pension section for the current year and switching years refetches it", async () => {
    mockInitialFetch([], defaultIncome, {
      year: currentYear,
      contributions: [{ month: 1, amount: 200 }],
    });
    render(<BudgetSetupPage />);

    await screen.findByRole("heading", { name: "Pension contributions" });
    const janInput = (await screen.findByLabelText("January pension amount")) as HTMLInputElement;
    expect(janInput.value).toBe("200");

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ year: currentYear - 1, contributions: [{ month: 6, amount: 50 }] }),
    });

    fireEvent.change(screen.getByLabelText("Pension year"), {
      target: { value: String(currentYear - 1) },
    });

    expect(global.fetch).toHaveBeenLastCalledWith(
      `/api/pension?year=${currentYear - 1}`,
      expect.objectContaining({ credentials: "include" })
    );

    const juneInput = (await screen.findByLabelText("June pension amount")) as HTMLInputElement;
    await waitFor(() => expect(juneInput.value).toBe("50"));
    expect((screen.getByLabelText("January pension amount") as HTMLInputElement).value).toBe("");
  });

  it("saves a pension amount on blur via POST", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByRole("heading", { name: "Pension contributions" });

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ year: currentYear, contributions: [{ month: 1, amount: 150 }] }),
    });

    const janInput = screen.getByLabelText("January pension amount");
    fireEvent.change(janInput, { target: { value: "150" } });
    fireEvent.blur(janInput);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenLastCalledWith(
        "/api/pension",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({ year: currentYear, contributions: [{ month: 1, amount: 150 }] }),
        })
      );
    });
  });

  it("defaults the back link to the dashboard budget tab", async () => {
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    expect(screen.getByRole("link", { name: /back to dashboard/i })).toHaveAttribute(
      "href",
      "/dashboard?tab=budget"
    );
  });

  it("points the back link to settings when entered from settings", async () => {
    mockSearch = "from=settings";
    mockInitialFetch();
    render(<BudgetSetupPage />);
    await screen.findByText(/no budget rows yet/i);

    expect(screen.getByRole("link", { name: /back to settings/i })).toHaveAttribute(
      "href",
      "/settings"
    );
  });
});
