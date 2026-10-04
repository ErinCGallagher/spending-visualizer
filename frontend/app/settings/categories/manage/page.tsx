/**
 * Manage categories page — view the full nested category taxonomy and
 * create or delete categories (top-level or nested one level under a parent).
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import NavBar from "@/app/components/NavBar";
import { Category } from "@/app/upload/types";

export default function CategoriesManagePage() {
  const [taxonomy, setTaxonomy] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newParentId, setNewParentId] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<{ id: string; message: string } | null>(null);

  async function fetchTaxonomy() {
    const res = await fetch("/api/categories", { credentials: "include" });
    const data = await res.json();
    setTaxonomy(data);
  }

  useEffect(() => {
    fetchTaxonomy().finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;

    setCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, parentId: newParentId || null }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Failed to create category.");
        return;
      }

      setNewName("");
      setNewParentId("");
      await fetchTaxonomy();
    } catch {
      setCreateError("An unexpected error occurred.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setConfirmDeleteId(null);
        setDeleteError(null);
        await fetchTaxonomy();
      } else {
        const data = await res.json();
        setDeleteError({ id, message: data.error || "Failed to delete category." });
      }
    } catch {
      setDeleteError({ id, message: "An unexpected error occurred." });
    }
  }

  const topLevel = taxonomy.filter((c) => c.parentId === null);

  return (
    <main className="min-h-screen">
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
        ]}
      />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">Manage Categories</h1>
          <p className="text-emerald-200 text-sm mt-1">
            Create and organize your spending categories.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">Create category</h2>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-[2] min-w-[180px]">
                <label htmlFor="new-category-name" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Category name
                </label>
                <input
                  id="new-category-name"
                  type="text"
                  placeholder="e.g. Accommodation"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="space-y-1.5 flex-1 min-w-[180px]">
                <label htmlFor="new-category-parent" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Parent category
                </label>
                <select
                  id="new-category-parent"
                  value={newParentId}
                  onChange={(e) => setNewParentId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                >
                  <option value="">Top-level category</option>
                  {topLevel.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                aria-label="Create category"
                disabled={creating || !newName.trim()}
                className="bg-emerald-800 hover:bg-emerald-900 text-white p-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            {createError && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {createError}
              </p>
            )}

            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                Your categories
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : topLevel.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No categories yet. Create one above.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {topLevel.map((c) => (
                    <div key={c.id}>
                      <div className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors group">
                        <span className="text-sm font-medium text-gray-900">{c.name}</span>
                        {confirmDeleteId === c.id ? (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500">Delete?</span>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="text-xs font-medium text-red-600 hover:text-red-700"
                            >
                              Yes
                            </button>
                            <button
                              onClick={() => {
                                setConfirmDeleteId(null);
                                setDeleteError(null);
                              }}
                              className="text-xs font-medium text-gray-400 hover:text-gray-600"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(c.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      {deleteError?.id === c.id && (
                        <p className="text-xs text-red-600 bg-red-50 px-3 py-2">
                          {deleteError.message}
                        </p>
                      )}
                      {c.children.map((child) => (
                        <div key={child.id}>
                          <div className="flex items-center justify-between p-3 pl-8 bg-white hover:bg-gray-50 transition-colors group">
                            <span className="text-sm text-gray-700">{child.name}</span>
                            {confirmDeleteId === child.id ? (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Delete?</span>
                                <button
                                  onClick={() => handleDelete(child.id)}
                                  className="text-xs font-medium text-red-600 hover:text-red-700"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => {
                                    setConfirmDeleteId(null);
                                    setDeleteError(null);
                                  }}
                                  className="text-xs font-medium text-gray-400 hover:text-gray-600"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmDeleteId(child.id)}
                                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          {deleteError?.id === child.id && (
                            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 pl-8">
                              {deleteError.message}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
