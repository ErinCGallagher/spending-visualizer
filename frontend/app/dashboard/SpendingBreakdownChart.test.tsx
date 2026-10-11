import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SpendingBreakdownChart from "./SpendingBreakdownChart";

describe("SpendingBreakdownChart", () => {
  it("shows the empty state when there is no data", () => {
    render(<SpendingBreakdownChart data={[]} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders without crashing given data", () => {
    const { container } = render(
      <SpendingBreakdownChart
        data={[
          { key: "p1", label: "Food", budgeted: 500, actual: 450, children: [] },
          { key: "not-in-budget", label: "Not in budget", budgeted: 0, actual: 120, children: [] },
        ]}
        currency="CAD"
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
