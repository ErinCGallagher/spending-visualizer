import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BudgetCategoryTable from "./BudgetCategoryTable";

describe("BudgetCategoryTable", () => {
  it("shows the empty state when there is no data", () => {
    render(<BudgetCategoryTable data={[]} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders a single row for a group with no children", () => {
    render(
      <BudgetCategoryTable
        data={[{ key: "c1", label: "Rent", budgeted: 2000, actual: 2000, children: [] }]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("renders a parent subtotal row with indented child rows", () => {
    render(
      <BudgetCategoryTable
        data={[
          {
            key: "p1",
            label: "Food",
            budgeted: 450,
            actual: 240,
            children: [
              { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 40 },
              { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
            ],
          },
        ]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    const foodRow = screen.getByText("Food").closest("tr");
    expect(foodRow).toHaveTextContent("$450");
    expect(foodRow).toHaveTextContent("$240");
  });

  it("renders a Not in budget row with no children as a single line", () => {
    render(
      <BudgetCategoryTable
        data={[{ key: "not-in-budget", label: "Not in budget", budgeted: 0, actual: 50, children: [] }]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Not in budget")).toBeInTheDocument();
  });

  it("renders a Total footer row summing budgeted and actual across all groups", () => {
    render(
      <BudgetCategoryTable
        data={[
          { key: "p1", label: "Food", budgeted: 400, actual: 240, children: [] },
          { key: "not-in-budget", label: "Not in budget", budgeted: 0, actual: 50, children: [] },
        ]}
        currency="CAD"
      />
    );

    const totalLabel = screen.getByText("Total");
    const footerRow = totalLabel.closest("tr");
    expect(footerRow).toHaveTextContent("$400");
    expect(footerRow).toHaveTextContent("$290");
  });

  describe("over/under budget column", () => {
    /** The Over / Under cell of every body and footer row, in order. */
    function overUnderCells() {
      return screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.lastElementChild as HTMLElement);
    }

    it("highlights a cell red when actual is over budget", () => {
      render(
        <BudgetCategoryTable
          data={[{ key: "c1", label: "Rent", budgeted: 2000, actual: 2100, children: [] }]}
          currency="CAD"
        />
      );

      overUnderCells().forEach((cell) => {
        expect(cell).toHaveTextContent(/^\$100$/);
        expect(cell).toHaveClass("bg-red-50");
      });
    });

    it("highlights a cell green when actual is under budget", () => {
      render(
        <BudgetCategoryTable
          data={[{ key: "c1", label: "Rent", budgeted: 2000, actual: 1900, children: [] }]}
          currency="CAD"
        />
      );

      overUnderCells().forEach((cell) => {
        expect(cell).toHaveTextContent(/^\$100$/);
        expect(cell).toHaveClass("bg-green-50");
      });
    });

    it("leaves the cell unhighlighted when exactly on budget", () => {
      render(
        <BudgetCategoryTable
          data={[{ key: "c1", label: "Rent", budgeted: 2000, actual: 2000, children: [] }]}
          currency="CAD"
        />
      );

      overUnderCells().forEach((cell) => {
        expect(cell).not.toHaveClass("bg-red-50");
        expect(cell).not.toHaveClass("bg-green-50");
      });
    });

    it("never spells out over or under in the cell", () => {
      render(
        <BudgetCategoryTable
          data={[{ key: "c1", label: "Rent", budgeted: 2000, actual: 2100, children: [] }]}
          currency="CAD"
        />
      );

      overUnderCells().forEach((cell) => expect(cell).not.toHaveTextContent(/over|under/i));
    });

    it("calculates child rows, parent subtotals and the total", () => {
      render(
        <BudgetCategoryTable
          data={[
            {
              key: "p1",
              label: "Food",
              budgeted: 450,
              actual: 240,
              children: [
                { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 190 },
                { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 50 },
              ],
            },
          ]}
          currency="CAD"
        />
      );

      const [parent, dining, groceries, total] = overUnderCells();
      expect(parent).toHaveTextContent("$210");
      expect(parent).toHaveClass("bg-green-50");
      expect(dining).toHaveTextContent("$40");
      expect(dining).toHaveClass("bg-red-50");
      expect(groceries).toHaveTextContent("$250");
      expect(groceries).toHaveClass("bg-green-50");
      expect(total).toHaveTextContent("$210");
    });
  });
});
