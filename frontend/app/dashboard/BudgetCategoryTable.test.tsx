import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BudgetCategoryTable from "./BudgetCategoryTable";

describe("BudgetCategoryTable", () => {
  it("renders nothing when there is no data", () => {
    const { container } = render(<BudgetCategoryTable data={[]} currency="CAD" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a single row for a category with no parent", () => {
    render(
      <BudgetCategoryTable
        data={[
          { categoryId: "c1", categoryName: "Rent", parentId: null, parentName: null, budgeted: 2000, actual: 2000 },
        ]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Rent")).toBeInTheDocument();
  });

  it("renders a parent subtotal row with indented child rows", () => {
    render(
      <BudgetCategoryTable
        data={[
          { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
          { categoryId: "c2", categoryName: "Dining", parentId: "p1", parentName: "Food", budgeted: 150, actual: 40 },
        ]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Dining")).toBeInTheDocument();
    expect(screen.getByText("$450")).toBeInTheDocument();
    expect(screen.getByText("$240")).toBeInTheDocument();
  });

  it("renders a parent header with a single indented child row", () => {
    render(
      <BudgetCategoryTable
        data={[
          { categoryId: "c1", categoryName: "Groceries", parentId: "p1", parentName: "Food", budgeted: 300, actual: 200 },
        ]}
        currency="CAD"
      />
    );

    expect(screen.getByText("Food")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });
});
