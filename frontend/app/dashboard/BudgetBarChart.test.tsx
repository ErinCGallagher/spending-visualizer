import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BudgetBarChart from "./BudgetBarChart";

describe("BudgetBarChart", () => {
  it("shows the empty state when there is no data", () => {
    render(<BudgetBarChart data={[]} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders without crashing given data", () => {
    const { container } = render(
      <BudgetBarChart
        data={[
          { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, budgeted: 1500, actual: 1250 },
          { categoryId: "c2", categoryName: "Dining", parentId: null, parentName: null, budgeted: 600, actual: 720 },
        ]}
        currency="CAD"
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
