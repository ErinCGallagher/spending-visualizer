import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import IncomeBreakdownTable from "./IncomeBreakdownTable";

describe("IncomeBreakdownTable", () => {
  it("shows the empty state when there is no income or pension data", () => {
    render(<IncomeBreakdownTable data={[]} pensionTotal={0} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders income categories and a pension row", () => {
    render(
      <IncomeBreakdownTable
        data={[{ categoryId: "i1", categoryName: "Salary", amount: 5000 }]}
        pensionTotal={200}
        currency="CAD"
      />
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("Pension")).toBeInTheDocument();
  });

  it("omits the pension row when pensionTotal is zero", () => {
    render(
      <IncomeBreakdownTable
        data={[{ categoryId: "i1", categoryName: "Salary", amount: 5000 }]}
        pensionTotal={0}
        currency="CAD"
      />
    );
    expect(screen.queryByText("Pension")).not.toBeInTheDocument();
  });

  it("renders a Total footer row summing income categories and pension", () => {
    render(
      <IncomeBreakdownTable
        data={[{ categoryId: "i1", categoryName: "Salary", amount: 5000 }]}
        pensionTotal={200}
        currency="CAD"
      />
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("$5,200")).toBeInTheDocument();
  });
});
