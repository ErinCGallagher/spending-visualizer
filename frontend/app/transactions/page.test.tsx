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

  describe("category filter", () => {
    const hierarchicalMeta = {
      ...mockMeta,
      // Sorted by name, as the meta endpoint returns them
      categories: [
        { id: "cat-flights", name: "Flights", parentId: "cat-travel" },
        { id: "cat-food", name: "Food", parentId: null },
        { id: "cat-travel-food", name: "Food", parentId: "cat-travel" },
        { id: "cat-travel", name: "Travel", parentId: null },
      ],
    };

    beforeEach(() => {
      global.fetch = vi.fn().mockImplementation((url: string) => {
        if (typeof url === "string" && url.startsWith("/api/transactions/meta")) {
          return Promise.resolve({ ok: true, json: async () => hierarchicalMeta });
        }
        return Promise.resolve({ ok: true, json: async () => mockTransactionsResponse });
      });
    });

    async function categorySelect() {
      render(<TransactionsPage />);
      await waitFor(() => expect(screen.getByText("Coffee shop")).toBeInTheDocument());
      fireEvent.click(screen.getByRole("button", { name: /filters/i }));
      return (await screen.findByDisplayValue("All categories")) as HTMLSelectElement;
    }

    it("lists each parent followed by its indented children", async () => {
      const select = await categorySelect();
      const labels = [...select.options].map((o) => o.textContent);

      expect(labels).toEqual([
        "All categories",
        "Food",
        "Travel",
        "\u00A0\u00A0\u00A0Flights",
        "\u00A0\u00A0\u00A0Food",
      ]);
    });

    it("filters by a parent's id", async () => {
      const select = await categorySelect();
      fireEvent.change(select, { target: { value: "cat-travel" } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("category=cat-travel"),
          expect.anything()
        );
      });
    });

    it("filters by a child's id even when a parent shares its name", async () => {
      const select = await categorySelect();
      fireEvent.change(select, { target: { value: "cat-travel-food" } });

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining("category=cat-travel-food"),
          expect.anything()
        );
      });
    });
  });

  describe("bulk delete", () => {
    function mockBulk({ total, bulkOk = true }: { total: number; bulkOk?: boolean }) {
      global.fetch = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
        if (typeof url === "string" && url.startsWith("/api/transactions/meta")) {
          return Promise.resolve({ ok: true, json: async () => mockMeta });
        }
        if (url === "/api/transactions/bulk" && init?.method === "DELETE") {
          return Promise.resolve({ ok: bulkOk, json: async () => ({ deleted: total }) });
        }
        if (typeof url === "string" && url.startsWith("/api/transactions")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ ...mockTransactionsResponse, total }),
          });
        }
        return Promise.reject(new Error(`Unexpected fetch: ${url}`));
      });
    }

    async function selectRow() {
      render(<TransactionsPage />);
      await waitFor(() => expect(screen.getByText("Coffee shop")).toBeInTheDocument());
      fireEvent.click(screen.getByLabelText("Select transaction Coffee shop"));
    }

    it("shows Delete beside Edit when every transaction is selected", async () => {
      mockBulk({ total: 1 });
      await selectRow();

      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
    });

    it("hides Delete while only some transactions are selected", async () => {
      mockBulk({ total: 2 });
      await selectRow();

      expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /delete selected/i })).not.toBeInTheDocument();
    });

    it("shows Delete once all matching transactions are selected", async () => {
      mockBulk({ total: 2 });
      await selectRow();

      fireEvent.click(screen.getByText(/select all 2 matching/i));

      expect(screen.getByRole("button", { name: /delete selected/i })).toBeInTheDocument();
    });

    it("deletes the selected ids after confirming and clears the selection", async () => {
      mockBulk({ total: 1 });
      await selectRow();

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      expect(screen.getByText(/delete 1 transaction\b/i)).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/transactions/bulk",
          expect.objectContaining({
            method: "DELETE",
            body: JSON.stringify({ ids: ["tx-1"] }),
          })
        );
      });
      await waitFor(() => expect(screen.queryByText(/1 selected/)).not.toBeInTheDocument());
    });

    it("deletes by filter when all matching transactions are selected", async () => {
      mockBulk({ total: 2 });
      await selectRow();
      fireEvent.click(screen.getByText(/select all 2 matching/i));

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          "/api/transactions/bulk",
          expect.objectContaining({ body: JSON.stringify({ filter: {} }) })
        );
      });
    });

    it("keeps the modal open with an error when the request fails", async () => {
      mockBulk({ total: 1, bulkOk: false });
      await selectRow();

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      fireEvent.click(screen.getByRole("button", { name: /^delete$/i }));

      expect(await screen.findByText(/failed to delete transactions/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^delete$/i })).toBeInTheDocument();
    });

    it("does not delete when cancelled", async () => {
      mockBulk({ total: 1 });
      await selectRow();

      fireEvent.click(screen.getByRole("button", { name: /delete selected/i }));
      fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

      expect(global.fetch).not.toHaveBeenCalledWith(
        "/api/transactions/bulk",
        expect.anything()
      );
    });
  });
});
