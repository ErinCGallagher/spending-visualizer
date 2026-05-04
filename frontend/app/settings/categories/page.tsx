/**
 * Credit card category mappings page — shows how merchant names are
 * automatically mapped to categories, with search, category filters, and pagination.
 */

"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Filter, Search, X } from "lucide-react";
import { useFetch } from "@/app/hooks/useFetch";
import NavBar from "@/app/components/NavBar";
import type { Category } from "@/app/upload/types";

interface Mapping {
  merchant_key: string;
  category_id: string;
  category_name: string;
  parent_id: string | null;
  parent_name: string | null;
}

interface MappingsResponse {
  mappings: Mapping[];
  total: number;
  page: number;
  limit: number;
}

interface FilterState {
  search: string;
  parentId: string;
  subId: string;
}

const PAGE_LIMIT = 25;

export default function CategoryMappingsPage() {
  const [data, setData] = useState<MappingsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  const { data: taxonomy } = useFetch<Category[]>("/api/categories", []);

  const [filters, setFilters] = useState<FilterState>({ search: "", parentId: "", subId: "" });
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const hasActiveFilters = filters.parentId !== "" || filters.subId !== "" || debouncedSearch !== "";

  const parentCategories = useMemo(
    () => (taxonomy ?? []).filter((c) => c.parentId === null),
    [taxonomy]
  );

  const filterParentCategory = useMemo(
    () => parentCategories.find((c) => c.id === filters.parentId),
    [parentCategories, filters.parentId]
  );

  const fetchMappings = useCallback((currentPage: number, f: FilterState, search: string) => {
    setLoading(true);
    setFetchError(false);

    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (f.subId) params.set("subId", f.subId);
    else if (f.parentId) params.set("parentId", f.parentId);
    params.set("page", String(currentPage));
    params.set("limit", String(PAGE_LIMIT));

    fetch(`/api/categories/mappings?${params.toString()}`, { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Request failed");
        return r.json() as Promise<MappingsResponse>;
      })
      .then((d) => {
        setData(d);
        setFetchError(false);
      })
      .catch(() => {
        setData(null);
        setFetchError(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filters.search);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    fetchMappings(page, filters, debouncedSearch);
  }, [page, filters.parentId, filters.subId, debouncedSearch, fetchMappings]);

  function handleParentFilterChange(parentId: string) {
    setFilters((prev) => ({ ...prev, parentId, subId: "" }));
    setPage(1);
  }

  function handleSubFilterChange(subId: string) {
    setFilters((prev) => ({ ...prev, subId }));
    setPage(1);
  }

  function resetFilters() {
    setFilters({ search: "", parentId: "", subId: "" });
    setDebouncedSearch("");
    setPage(1);
  }

  const handleEdit = (mapping: Mapping) => {
    setEditingKey(mapping.merchant_key);
    if (mapping.parent_id) {
      setSelectedParentId(mapping.parent_id);
      setSelectedSubId(mapping.category_id);
    } else {
      setSelectedParentId(mapping.category_id);
      setSelectedSubId("");
    }
    setSaveError(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setSaveError(null);
  };

  const handleSave = async (merchantKey: string) => {
    setSaving(true);
    setSaveError(null);

    const categoryId = selectedSubId || selectedParentId;

    try {
      const res = await fetch("/api/categories/mappings", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantKey, categoryId }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update mapping");
      }

      fetchMappings(page, filters, debouncedSearch);
      setEditingKey(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const currentParent = taxonomy?.find((c) => c.id === selectedParentId);
  const totalPages = data ? Math.max(1, Math.ceil(data.total / PAGE_LIMIT)) : 1;

  return (
    <main className="min-h-screen">
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "Settings", href: "/settings" },
        ]}
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="space-y-2">
          <Link
            href="/settings"
            className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            Back to settings
          </Link>
          <h1 className="text-2xl font-bold text-white">Credit card categories</h1>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/30">
            <p className="text-gray-600 text-sm leading-relaxed">
              These mappings are created when you upload credit card statements. They help automatically categorise future transactions from the same merchants.
            </p>
          </div>

          {/* Filter bar */}
          <div className="p-4 border-b border-gray-100">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search merchants..."
                    value={filters.search}
                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-900"
                  />
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all ${
                    showFilters || hasActiveFilters
                      ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <Filter className="w-4 h-4" />
                  Filters
                  {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-brand-primary" />}
                </button>
              </div>

              {showFilters && (
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Parent Category
                    </label>
                    <select
                      value={filters.parentId}
                      onChange={(e) => handleParentFilterChange(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                    >
                      <option value="">All categories</option>
                      {parentCategories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                      Sub Category
                    </label>
                    <div className="flex items-center gap-2">
                      <select
                        value={filters.subId}
                        onChange={(e) => handleSubFilterChange(e.target.value)}
                        disabled={!filterParentCategory || filterParentCategory.children.length === 0}
                        className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:bg-gray-50 disabled:text-gray-400"
                      >
                        <option value="">All sub-categories</option>
                        {filterParentCategory?.children.map((c) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                      {hasActiveFilters && (
                        <button
                          onClick={resetFilters}
                          className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          title="Reset filters"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Loading mappings…</p>
              </div>
            ) : fetchError ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-500">Failed to load mappings.</p>
              </div>
            ) : !data || data.mappings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">
                  {hasActiveFilters
                    ? "No mappings match your filters."
                    : "No mappings found yet. They will appear here after you upload and categorise credit card transactions."}
                </p>
              </div>
            ) : (
              <>
                <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-100 bg-slate-50/50">
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Merchant / Keyword</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Parent Category</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Sub Category (optional)</th>
                        <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {data.mappings.map((mapping) => {
                        const isEditing = editingKey === mapping.merchant_key;
                        const hasParent = mapping.parent_name !== null;
                        const parentDisplay = mapping.parent_name ?? mapping.category_name;
                        const subDisplay = hasParent ? mapping.category_name : null;

                        return (
                          <tr key={mapping.merchant_key} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-100">
                              {mapping.merchant_key}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">
                              {isEditing ? (
                                <select
                                  className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                  value={selectedParentId}
                                  onChange={(e) => {
                                    setSelectedParentId(e.target.value);
                                    setSelectedSubId("");
                                  }}
                                >
                                  {taxonomy?.map((cat) => (
                                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                                  ))}
                                </select>
                              ) : (
                                parentDisplay
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">
                              {isEditing ? (
                                <select
                                  className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                                  value={selectedSubId}
                                  onChange={(e) => setSelectedSubId(e.target.value)}
                                  disabled={!currentParent || currentParent.children.length === 0}
                                >
                                  <option value="">None</option>
                                  {currentParent?.children.map((child) => (
                                    <option key={child.id} value={child.id}>{child.name}</option>
                                  ))}
                                </select>
                              ) : (
                                subDisplay ?? <span className="text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSave(mapping.merchant_key)}
                                    disabled={saving}
                                    className="text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-50"
                                  >
                                    {saving ? "..." : "Save"}
                                  </button>
                                  <button
                                    onClick={handleCancel}
                                    disabled={saving}
                                    className="text-gray-400 hover:text-gray-600"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => handleEdit(mapping)}
                                  className="text-emerald-600 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 flex items-center gap-2 font-medium"
                                >
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="w-4 h-4"
                                  >
                                    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                  </svg>
                                  <span>Edit</span>
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-gray-500">
                    {data.total.toLocaleString()} mapping{data.total !== 1 ? "s" : ""}
                  </p>
                  {totalPages > 1 && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {page} of {totalPages}
                      </span>
                      <button
                        onClick={() => setPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
            {saveError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
