import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import TransactionTable, { type TransactionsResponse } from "./TransactionTable";

const mockData: TransactionsResponse = {
  transactions: [
    {
      id: "tx-1",
      date: "2024-05-01",
      description: "Coffee shop",
      amountHome: 4.5,
      localCurrency: "CAD",
      homeCurrency: "CAD",
      categoryId: null,
      parentCategoryName: "Food",
      subCategoryName: "Coffee",
      paymentMethod: "Credit",
      payer: "Erin",
      groupName: null,
      groupType: null,
    },
  ],
  total: 1,
  page: 1,
  limit: 50,
};

describe("TransactionTable", () => {
  it("does not render per-row edit or delete buttons", () => {
    render(
      <TransactionTable
        data={mockData}
        loading={false}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        selectedIds={new Set()}
        allOnPageSelected={false}
        onToggleRow={vi.fn()}
        onToggleAllOnPage={vi.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /edit category/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete transaction/i })).not.toBeInTheDocument();
  });

  it("calls onToggleRow when a row checkbox is clicked", () => {
    const onToggleRow = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        loading={false}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        selectedIds={new Set()}
        allOnPageSelected={false}
        onToggleRow={onToggleRow}
        onToggleAllOnPage={vi.fn()}
      />
    );

    fireEvent.click(screen.getByLabelText(/select transaction coffee shop/i));

    expect(onToggleRow).toHaveBeenCalledWith("tx-1");
  });

  it("calls onToggleAllOnPage when the header checkbox is clicked", () => {
    const onToggleAllOnPage = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        loading={false}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        selectedIds={new Set()}
        allOnPageSelected={false}
        onToggleRow={vi.fn()}
        onToggleAllOnPage={onToggleAllOnPage}
      />
    );

    fireEvent.click(screen.getByLabelText(/select all transactions on this page/i));

    expect(onToggleAllOnPage).toHaveBeenCalled();
  });
});
