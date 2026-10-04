import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import TransactionsPage from "./page";

const mockMeta = {
  categories: [],
  travellers: [],
  paymentMethods: [],
  dateRange: null,
  groups: [],
  overviewDefaultFilter: null,
  tripDefaultFilter: null,
};

const mockTransactionsResponse = {
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

describe("TransactionsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/api/transactions/meta")) {
        return Promise.resolve({ ok: true, json: async () => mockMeta });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions/tx-1") && init?.method === "DELETE") {
        return Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions")) {
        return Promise.resolve({ ok: true, json: async () => mockTransactionsResponse });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });
  });

  it("deletes a transaction after confirming in the modal", async () => {
    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coffee shop")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));

    expect(screen.getByText("Delete transaction")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/transactions/tx-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete transaction")).not.toBeInTheDocument();
    });
  });

  it("closes the modal without deleting when cancel is clicked", async () => {
    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coffee shop")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));
    expect(screen.getByText("Delete transaction")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(screen.queryByText("Delete transaction")).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalledWith(
      "/api/transactions/tx-1",
      expect.objectContaining({ method: "DELETE" })
    );
  });

  it("shows an error and keeps the modal open when the delete request fails", async () => {
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/api/transactions/meta")) {
        return Promise.resolve({ ok: true, json: async () => mockMeta });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions/tx-1") && init?.method === "DELETE") {
        return Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "Internal server error" }) });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions")) {
        return Promise.resolve({ ok: true, json: async () => mockTransactionsResponse });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coffee shop")).toBeInTheDocument();
    });

    const listCallsBefore = (global.fetch as any).mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].startsWith("/api/transactions?")
    ).length;

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/transactions/tx-1",
        expect.objectContaining({ method: "DELETE" })
      );
    });

    await waitFor(() => {
      expect(
        screen.getByText("Failed to delete transaction. Please try again.")
      ).toBeInTheDocument();
    });

    // The modal should stay open so the user can retry or cancel.
    expect(screen.getByText("Delete transaction")).toBeInTheDocument();

    // A failed delete should not trigger a refetch of the transaction list.
    const listCallsAfter = (global.fetch as any).mock.calls.filter(
      (call: any[]) => typeof call[0] === "string" && call[0].startsWith("/api/transactions?")
    ).length;
    expect(listCallsAfter).toBe(listCallsBefore);

    expect(screen.getByText("Coffee shop")).toBeInTheDocument();
  });

  it("clears a previous delete error when the modal is reopened", async () => {
    let shouldFail = true;
    global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (typeof url === "string" && url.startsWith("/api/transactions/meta")) {
        return Promise.resolve({ ok: true, json: async () => mockMeta });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions/tx-1") && init?.method === "DELETE") {
        return shouldFail
          ? Promise.resolve({ ok: false, status: 500, json: async () => ({ error: "Internal server error" }) })
          : Promise.resolve({ ok: true, json: async () => ({ ok: true }) });
      }
      if (typeof url === "string" && url.startsWith("/api/transactions")) {
        return Promise.resolve({ ok: true, json: async () => mockTransactionsResponse });
      }
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    render(<TransactionsPage />);

    await waitFor(() => {
      expect(screen.getByText("Coffee shop")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Failed to delete transaction. Please try again.")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));
    shouldFail = false;

    fireEvent.click(screen.getByLabelText(/delete transaction coffee shop/i));

    expect(
      screen.queryByText("Failed to delete transaction. Please try again.")
    ).not.toBeInTheDocument();
  });
});
