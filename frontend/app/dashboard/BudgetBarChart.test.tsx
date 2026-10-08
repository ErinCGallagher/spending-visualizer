import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import BudgetBarChart from "./BudgetBarChart";

describe("BudgetBarChart", () => {
  it("shows the empty state when there is no data", () => {
    render(<BudgetBarChart data={[]} totalMonthlyBudget={500} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders without crashing given data", () => {
    const { container } = render(
      <BudgetBarChart
        data={[
          { month: "2026-01", categoryName: "Groceries", actual: 300 },
          { month: "2026-02", categoryName: "Groceries", actual: 250 },
        ]}
        totalMonthlyBudget={500}
        currency="CAD"
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
