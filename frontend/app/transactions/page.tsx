/**
 * Transactions page — paginated, filterable list of all transactions with
 * a bulk-delete section at the bottom for removing transactions by date range.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import TransactionTable, {
  type TransactionsResponse,
} from "@/app/transactions/TransactionTable";
import TransactionFilters from "@/app/transactions/TransactionFilters";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import { useTransactionFilters } from "@/app/hooks/useTransactionFilters";

interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  dateRange: { from: string; to: string } | null;
  groups: { id: string; name: string; groupType: string }[];
}

const PAGE_LIMIT = 50;

export default function TransactionsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { filters, page, setPage, handleFilterChange } = useTransactionFilters();

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
    (currentPage: number, f: typeof filters) => {
      setLoading(true);
      setDeleteResult(null);

      const params = new URLSearchParams();
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);
      if (f.category) params.set("category", f.category);
      if (f.group) params.set("groupId", f.group);
      if (f.groupTypeFilter) params.set("groupType", f.groupTypeFilter);
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
    fetchTransactions(page, filters);
  }, [page, filters, fetchTransactions]);

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
        setPage(1);
        fetchTransactions(1, filters);
      })
      .catch(() => {
        setShowDeleteModal(false);
      })
      .finally(() => setDeleteLoading(false));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  return (
    <main className="min-h-screen animate-fade-in">
      {/* Hero */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white">Transactions</h1>
        <p className="mt-1 text-emerald-200 text-sm">
          All your recorded transactions.
        </p>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pb-8 space-y-4">
        {/* Filters + Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4">
            <TransactionFilters
              meta={meta}
              from={filters.from}
              to={filters.to}
              category={filters.category}
              group={filters.group}
              groupType={filters.groupTypeFilter}
              onChange={handleFilterChange}
            />
          </div>
          <TransactionTable
            data={data}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        </div>

        {/* Delete section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">
            Delete transactions
          </h2>

          {deleteResult !== null && (
            <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
              {deleteResult} transaction{deleteResult !== 1 ? "s" : ""} deleted.
            </div>
          )}

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                From
              </label>
              <input
                type="date"
                value={deleteFrom}
                onChange={(e) => setDeleteFrom(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-600">
                To
              </label>
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

      {showDeleteModal && (
        <ConfirmModal
          title="Delete transactions"
          description={`Are you sure? This will delete all transactions from ${deleteFrom} to ${deleteTo}. This cannot be undone.`}
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteModal(false)}
          loading={deleteLoading}
          danger
        />
      )}
    </main>
  );
}
