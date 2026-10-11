import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import SpendingByCategoryChart from "./SpendingByCategoryChart";

const data = [
  { categoryId: "c1", categoryName: "Groceries", parentId: null, parentName: null, budgeted: 1500, actual: 1250 },
  { categoryId: "c2", categoryName: "Rent", parentId: null, parentName: null, budgeted: 2000, actual: 2000 },
];

describe("SpendingByCategoryChart", () => {
  it("shows the empty state when there is no data", () => {
    render(<SpendingByCategoryChart data={[]} currency="CAD" />);
    expect(screen.getByText("No data")).toBeInTheDocument();
  });

  it("renders a legend button per category", () => {
    render(<SpendingByCategoryChart data={data} currency="CAD" />);
    expect(screen.getByRole("button", { name: "Groceries" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rent" })).toBeInTheDocument();
  });

  it("toggles a category's pressed state when clicked", () => {
    render(<SpendingByCategoryChart data={data} currency="CAD" />);
    const rentButton = screen.getByRole("button", { name: "Rent" });
    expect(rentButton).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(rentButton);
    expect(rentButton).toHaveAttribute("aria-pressed", "false");
  });
});
