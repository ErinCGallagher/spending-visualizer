import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import IncomeBreakdownChart from "./IncomeBreakdownChart";

describe("IncomeBreakdownChart", () => {
  it("shows the empty state when there is no income or pension data", () => {
    render(<IncomeBreakdownChart data={[]} pensionTotal={0} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders without crashing given income data", () => {
    const { container } = render(
      <IncomeBreakdownChart
        data={[{ categoryId: "i1", categoryName: "Salary", amount: 5000 }]}
        pensionTotal={200}
        currency="CAD"
      />
    );
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });

  it("renders from pension alone when there is no income data", () => {
    const { container } = render(<IncomeBreakdownChart data={[]} pensionTotal={200} currency="CAD" />);
    expect(container.querySelector(".recharts-responsive-container")).toBeTruthy();
  });
});
