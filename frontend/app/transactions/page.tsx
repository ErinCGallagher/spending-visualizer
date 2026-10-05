/**
 * Transactions page — paginated, filterable list of all transactions with
 * a bulk-delete section at the bottom for removing transactions by date range.
 */

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import TransactionTable, {
  type TransactionsResponse,
} from "@/app/transactions/TransactionTable";
import TransactionFilters from "@/app/transactions/TransactionFilters";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import CategoryPickerModal from "@/app/transactions/CategoryPickerModal";
import { useTransactionFilters } from "@/app/hooks/useTransactionFilters";
import { useFetch } from "@/app/hooks/useFetch";
import type { Category } from "@/app/upload/types";

interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  dateRange: { from: string; to: string } | null;
  groups: { id: string; name: string; groupType: string }[];
  overviewDefaultFilter: string | null;
  tripDefaultFilter: string | null;
}

const PAGE_LIMIT = 50;

export default function TransactionsPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [data, setData] = useState<TransactionsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const { filters, page, setPage, handleFilterChange } = useTransactionFilters();
  const { data: taxonomy } = useFetch<Category[]>("/api/categories", []);

  const [debouncedSearch, setDebouncedSearch] = useState(filters.search);

  // Debounce search filter updates to avoid excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      if (debouncedSearch !== filters.search) {
        handleFilterChange(
          filters.from,
          filters.to,
          filters.category,
          filters.group,
          filters.payer,
          filters.paymentMethod,
          debouncedSearch
        );
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [debouncedSearch, filters, handleFilterChange]);

  // Sync debounced search if filters change from elsewhere (e.g. reset)
  useEffect(() => {
    setDebouncedSearch(filters.search);
  }, [filters.search]);

  // Category selection + edit state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectAllMatching, setSelectAllMatching] = useState(false);
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);
  const [editingCategoryTxId, setEditingCategoryTxId] = useState<string | null>(null);
  const [categorySaving, setCategorySaving] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Reset selection whenever the filtered result set changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }, [filters]);

  // Delete section state
  const [deleteFrom, setDeleteFrom] = useState("");
  const [deleteTo, setDeleteTo] = useState("");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteGroupId, setDeleteGroupId] = useState("");
  const [showGroupDeleteModal, setShowGroupDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteResult, setDeleteResult] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fetchMeta = useCallback(() => {
    fetch("/api/transactions/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((d: Meta) => setMeta(d))
      .catch(() => setMeta(null));
  }, []);

  useEffect(() => {
    fetchMeta();
  }, [fetchMeta]);

  const fetchTransactions = useCallback(
    (currentPage: number, f: typeof filters) => {
      setLoading(true);
      setDeleteResult(null);

      const params = new URLSearchParams();
      if (f.from) params.set("from", f.from);
      if (f.to) params.set("to", f.to);
      if (f.category) params.set("category", f.category);
      if (f.group) params.set("groupId", f.group);
      if (f.payer) params.set("traveller", f.payer);
      if (f.paymentMethod) params.set("paymentMethod", f.paymentMethod);
      if (f.search) params.set("search", f.search);
      params.set("page", String(currentPage));
      params.set("limit", String(PAGE_LIMIT));

      fetch(`/api/transactions?${params.toString()}`, { credentials: "include" })
        .then((r) => {
          if (!r.ok) throw new Error("Failed to fetch transactions");
          return r.json();
        })
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

  function findCategorySelection(categoryId: string | null) {
    if (!categoryId || !taxonomy) return { parentId: undefined, subId: undefined };
    for (const parent of taxonomy) {
      if (parent.id === categoryId) return { parentId: parent.id, subId: undefined };
      const child = parent.children.find((c) => c.id === categoryId);
      if (child) return { parentId: parent.id, subId: child.id };
    }
    return { parentId: undefined, subId: undefined };
  }

  function buildFilterPayload(f: typeof filters) {
    const payload: Record<string, string> = {};
    if (f.from) payload.from = f.from;
    if (f.to) payload.to = f.to;
    if (f.category) payload.category = f.category;
    if (f.group) payload.groupId = f.group;
    if (f.payer) payload.traveller = f.payer;
    if (f.paymentMethod) payload.paymentMethod = f.paymentMethod;
    if (f.search) payload.search = f.search;
    return payload;
  }

  function toggleRow(id: string) {
    setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllOnPage() {
    if (!data) return;
    const pageIds = data.transactions.map((t) => t.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectAllMatching(false);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
    setSelectAllMatching(false);
  }

  function handleBulkCategorySave(categoryId: string) {
    setCategorySaving(true);
    setCategoryError(null);
    const body = selectAllMatching
      ? { categoryId, filter: buildFilterPayload(filters) }
      : { categoryId, ids: [...selectedIds] };

    fetch("/api/transactions/category", {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update categories");
        setShowBulkCategoryModal(false);
        clearSelection();
        fetchMeta();
        fetchTransactions(page, filters);
      })
      .catch(() => setCategoryError("Failed to update categories. Please try again."))
      .finally(() => setCategorySaving(false));
  }

  function handleSingleCategorySave(categoryId: string) {
    if (!editingCategoryTxId) return;
    setCategorySaving(true);
    setCategoryError(null);

    fetch(`/api/transactions/${editingCategoryTxId}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categoryId }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to update category");
        setEditingCategoryTxId(null);
        fetchMeta();
        fetchTransactions(page, filters);
      })
      .catch(() => setCategoryError("Failed to update category. Please try again."))
      .finally(() => setCategorySaving(false));
  }

  function handleGroupDeleteConfirm() {
    setDeleteLoading(true);
    fetch("/api/transactions", {
      method: "DELETE",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ groupId: deleteGroupId }),
    })
      .then((r) => r.json())
      .then((d: { deleted: number }) => {
        setDeleteResult(d.deleted);
        setDeleteGroupId("");
        setShowGroupDeleteModal(false);
        setPage(1);
        fetchMeta();
        fetchTransactions(1, filters);
      })
      .catch(() => {
        setShowGroupDeleteModal(false);
      })
      .finally(() => setDeleteLoading(false));
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
        setPage(1);
        fetchTransactions(1, filters);
      })
      .catch(() => {
        setShowDeleteModal(false);
      })
      .finally(() => setDeleteLoading(false));
  }

  function openRowDeleteModal(id: string) {
    setDeleteError(null);
    setDeleteTarget(id);
  }

  function closeRowDeleteModal() {
    setDeleteTarget(null);
    setDeleteError(null);
  }

  function handleRowDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    setDeleteError(null);
    fetch(`/api/transactions/${deleteTarget}`, {
      method: "DELETE",
      credentials: "include",
    })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to delete transaction");
        closeRowDeleteModal();
        fetchMeta();
        fetchTransactions(page, filters);
      })
      .catch(() => setDeleteError("Failed to delete transaction. Please try again."))
      .finally(() => setDeleteLoading(false));
  }

  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;
  const allOnPageSelected =
    !!data && data.transactions.length > 0 && data.transactions.every((t) => selectedIds.has(t.id));
  const selectedCount = selectAllMatching ? (data?.total ?? 0) : selectedIds.size;
  const canSelectAllMatching =
    !selectAllMatching && allOnPageSelected && !!data && data.total > data.transactions.length;
  const editingTx = data?.transactions.find((t) => t.id === editingCategoryTxId) ?? null;
  const editingSelection = findCategorySelection(editingTx?.categoryId ?? null);

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
              payer={filters.payer}
              paymentMethod={filters.paymentMethod}
              search={debouncedSearch}
              onChange={(from, to, category, group, payer, paymentMethod, search) => {
                setDebouncedSearch(search);
                // Immediately apply other filters, but keep search debounced
                handleFilterChange(from, to, category, group, payer, paymentMethod, filters.search);
              }}
            />
          </div>

          {(selectedCount > 0) && (
            <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-t border-b border-gray-100 bg-emerald-50/50 text-sm">
              <span className="font-medium text-gray-700">
                {selectedCount.toLocaleString()} selected
              </span>
              {canSelectAllMatching && (
                <button
                  onClick={() => setSelectAllMatching(true)}
                  className="text-emerald-700 hover:text-emerald-800 font-medium"
                >
                  Select all {data?.total.toLocaleString()} matching
                </button>
              )}
              <button
                onClick={() => setShowBulkCategoryModal(true)}
                className="ml-auto bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-1.5 rounded-lg font-medium text-xs"
              >
                Edit
              </button>
              <button
                onClick={clearSelection}
                className="text-gray-500 hover:text-gray-700 font-medium"
              >
                Clear
              </button>
            </div>
          )}

          <TransactionTable
            data={data}
            loading={loading}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            onDelete={openRowDeleteModal}
            selectedIds={selectedIds}
            allOnPageSelected={allOnPageSelected}
            onToggleRow={toggleRow}
            onToggleAllOnPage={toggleAllOnPage}
            onEditCategory={setEditingCategoryTxId}
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

          <div className="space-y-3">
            <p className="text-xs font-medium text-gray-500">By date range</p>
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

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-500">By group</p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-gray-600">
                  Group
                </label>
                <select
                  value={deleteGroupId}
                  onChange={(e) => setDeleteGroupId(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="">Select a group…</option>
                  {meta?.groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => setShowGroupDeleteModal(true)}
                disabled={!deleteGroupId}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Delete transactions
              </button>
            </div>
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

      {showGroupDeleteModal && (
        <ConfirmModal
          title="Delete transactions"
          description={`Are you sure? This will delete all transactions in the "${meta?.groups.find((g) => g.id === deleteGroupId)?.name}" group. This cannot be undone.`}
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          onConfirm={handleGroupDeleteConfirm}
          onCancel={() => setShowGroupDeleteModal(false)}
          loading={deleteLoading}
          danger
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Delete transaction"
          description="Are you sure you want to delete this transaction? This cannot be undone."
          confirmLabel="Delete"
          loadingLabel="Deleting…"
          onConfirm={handleRowDeleteConfirm}
          onCancel={closeRowDeleteModal}
          loading={deleteLoading}
          error={deleteError ?? undefined}
          danger
        />
      )}

      {showBulkCategoryModal && (
        <CategoryPickerModal
          title="Change category"
          description={`Choose a new category for ${selectedCount.toLocaleString()} transaction${selectedCount !== 1 ? "s" : ""}.`}
          taxonomy={taxonomy ?? []}
          saving={categorySaving}
          error={categoryError ?? undefined}
          onSave={handleBulkCategorySave}
          onCancel={() => {
            setShowBulkCategoryModal(false);
            setCategoryError(null);
          }}
        />
      )}

      {editingTx && (
        <CategoryPickerModal
          title="Edit category"
          description={`Choose a new category for ${editingTx.description}.`}
          taxonomy={taxonomy ?? []}
          initialParentId={editingSelection.parentId}
          initialSubId={editingSelection.subId}
          saving={categorySaving}
          error={categoryError ?? undefined}
          onSave={handleSingleCategorySave}
          onCancel={() => {
            setEditingCategoryTxId(null);
            setCategoryError(null);
          }}
        />
      )}
    </main>
  );
}
