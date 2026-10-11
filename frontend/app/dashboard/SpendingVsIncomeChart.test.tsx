import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SpendingVsIncomeChart from "./SpendingVsIncomeChart";

describe("SpendingVsIncomeChart", () => {
  it("shows the empty state when there is no income or spending", () => {
    render(<SpendingVsIncomeChart income={0} spendingGroups={[]} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders without crashing given income and spending", () => {
    const { container } = render(
      <SpendingVsIncomeChart
        income={10400}
        spendingGroups={[{ key: "p1", label: "Food", budgeted: 500, actual: 450, children: [] }]}
        currency="CAD"
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
