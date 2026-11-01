import { render, screen, within } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import PaymentMethodTable from "./PaymentMethodTable";

const data = [
  { paymentMethod: "Amex", total: 5774.37 },
  { paymentMethod: "Wealthsimple Visa", total: 1592.95 },
];

describe("PaymentMethodTable", () => {
  it("lists each payment method with its total, in the order given", () => {
    render(<PaymentMethodTable data={data} currency="CAD" loading={false} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("Amex")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/5,774\.37/)).toBeInTheDocument();
    expect(within(rows[1]).getByText("Wealthsimple Visa")).toBeInTheDocument();
    expect(within(rows[1]).getByText(/1,592\.95/)).toBeInTheDocument();
  });

  it("shows column headings", () => {
    render(<PaymentMethodTable data={data} currency="CAD" loading={false} />);

    expect(screen.getByText("Payment method")).toBeInTheDocument();
    expect(screen.getByText("Total spent")).toBeInTheDocument();
  });

  it("shows an empty state when there is no data", () => {
    render(<PaymentMethodTable data={[]} currency="CAD" loading={false} />);

    expect(screen.getByText("No data")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
  });

  it("hides rows while loading", () => {
    render(<PaymentMethodTable data={data} currency="CAD" loading />);

    expect(screen.queryByText("Amex")).not.toBeInTheDocument();
  });
});
