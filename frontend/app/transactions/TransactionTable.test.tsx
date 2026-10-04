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
  it("calls onDelete with the transaction id when the delete button is clicked", () => {
    const onDelete = vi.fn();
    render(
      <TransactionTable
        data={mockData}
        loading={false}
        page={1}
        totalPages={1}
        onPageChange={vi.fn()}
        onDelete={onDelete}
      />
    );

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));

    expect(onDelete).toHaveBeenCalledWith("tx-1");
  });
});
