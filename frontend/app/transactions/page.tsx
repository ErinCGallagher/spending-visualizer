/**
 * Transactions page — paginated, filterable list of all transactions with
 * a bulk-delete section at the bottom for removing transactions by date range.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import NavBar from "@/app/components/NavBar";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amountHome: number;
  localCurrency: string | null;
  categoryName: string | null;
  paymentMethod: string | null;
  payer: string | null;
}

interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  dateRange: { from: string; to: string } | null;
}

const PAGE_LIMIT = 50;

function formatDate(iso: string) {
  // Display dates in a readable format without importing a library
  const [year, month, day] = iso.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);

  // Filter state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("");

  // Pagination state
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // Delete section state
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/transactions/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((d: Meta) => setMeta(d))
      .catch(() => setMeta(null));
  }, []);

  const fetchTransactions = useCallback(
    (currentPage: number, filterFrom: string, filterTo: string, filterCategory: string) => {
      setLoading(true);
      setDeleteResult(null);

      const params = new URLSearchParams();
      if (filterFrom) params.set("from", filterFrom);
      if (filterTo) params.set("to", filterTo);
      if (filterCategory) params.set("category", filterCategory);
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_LIMIT));

      fetch(`/api/transactions?${params.toString()}`, { credentials: "include" })
        .then((r) => r.json())
        .then((d: TransactionsResponse) => setData(d))
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    },
    []
  );

  // Re-fetch whenever filters or page change
  useEffect(() => {
    fetchTransactions(page, from, to, category);
  }, [page, from, to, category, fetchTransactions]);

  // Reset to page 1 when filters change
  function handleFilterChange(
    newFrom: string,
    newTo: string,
    newCategory: string
  ) {
    setPage(1);
    setFrom(newFrom);
    setTo(newTo);
    setCategory(newCategory);
  }

  function handleDeleteConfirm() {
    setDeleteLoading(true);
    fetch("/api/transactions", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: deleteFrom, to: deleteTo }),
    })
      .then((r) => r.json())
      .then((d: { deleted: number }) => {
        setDeleteResult(d.deleted);
        setShowDeleteModal(false);
        // Refetch from page 1
        setPage(1);
        fetchTransactions(1, from, to, category);
      })
      .catch(() => {
        setShowDeleteModal(false);
      })
      .finally(() => setDeleteLoading(false));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  return (
    <main className="min-h-screen">
      <NavBar links={[{ label: "Dashboards", href: "/" }, { label: "Transactions", href: "/transactions" }]}>
        {/* Hero content */}
        <div className="py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">Transactions</h1>
            <p className="mt-1 text-emerald-200 text-sm">
              All your recorded transactions.
            </p>
          </div>
          <Link
            href="/upload"
            className="bg-white text-emerald-800 hover:bg-emerald-50 px-5 py-2.5 rounded-lg font-medium text-sm"
          >
            Import transactions
          </Link>
        </div>
      </NavBar>

      {/* Content pulled up to overlap the green header */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 pb-8 space-y-4">
        {/* Filters + Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => handleFilterChange(e.target.value, to, category)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => handleFilterChange(from, e.target.value, category)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                />
              </div>

              <select
                value={category}
                onChange={(e) => handleFilterChange(from, to, e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">All categories</option>
                {(meta?.categories ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">Loading…</p>
            </div>
          ) : !data || data.transactions.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-sm text-gray-400">No transactions found.</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left">
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Description</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Category</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">Amount</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Payment Method</th>
                      <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">Payer</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.transactions.map((t) => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                          {formatDate(t.date)}
                        </td>
                        <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                          {t.description}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {t.categoryName ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-900 text-right whitespace-nowrap font-medium">
                          {formatAmount(t.amountHome)}
                          {t.localCurrency && (
                            <span className="ml-1 text-gray-400 text-xs font-normal">
                              {t.localCurrency}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {t.paymentMethod ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {t.payer ?? <span className="text-gray-300">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                <p className="text-sm text-gray-500">
                  {data.total.toLocaleString()} transaction{data.total !== 1 ? "s" : ""}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Delete section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Delete transactions</h2>

          {deleteResult !== null && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              {deleteResult} transaction{deleteResult !== 1 ? "s" : ""} deleted.
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">From</label>
              <input
                type="date"
                value={deleteFrom}
                onChange={(e) => setDeleteFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">To</label>
              <input
                type="date"
                value={deleteTo}
                onChange={(e) => setDeleteTo(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              disabled={!deleteFrom || !deleteTo}
              className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Delete transactions
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">Delete transactions</h3>
            <p className="text-sm text-gray-600">
              Are you sure? This will delete all transactions from{" "}
              <strong>{deleteFrom}</strong> to <strong>{deleteTo}</strong>. This
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleteLoading}
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40"
              >
                {deleteLoading ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
