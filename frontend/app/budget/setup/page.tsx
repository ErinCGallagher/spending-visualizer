/** Budget creation screen — build a table of per-category monthly budgets. */

"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Category } from "@/app/upload/types";

interface ExistingBudget {
  categoryId: string;
  monthlyAmount: number;
}

/** Sum of a parent's child budget amounts, used for its read-only total. */
function childTotal(parent: Category, amounts: Record<string, string>): number {
  return parent.children.reduce((sum, child) => sum + (Number(amounts[child.id]) || 0), 0);
}

export default function BudgetSetupPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [pendingRows, setPendingRows] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const nextRowKey = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/budgets", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([categoryData, budgetData]: [Category[], { budgets: ExistingBudget[] }]) => {
        setCategories(categoryData);

        const savedAmounts: Record<string, string> = {};
        for (const b of budgetData.budgets) savedAmounts[b.categoryId] = String(b.monthlyAmount);

        const parentIds: string[] = [];
        const initialAmounts: Record<string, string> = {};
        for (const b of budgetData.budgets) {
          const topLevel = categoryData.find(
            (c) => c.id === b.categoryId || c.children.some((child) => child.id === b.categoryId)
          );
          if (!topLevel || parentIds.includes(topLevel.id)) continue;
          parentIds.push(topLevel.id);

          if (topLevel.children.length === 0) {
            initialAmounts[topLevel.id] = savedAmounts[topLevel.id] ?? "";
          } else {
            for (const child of topLevel.children) {
              initialAmounts[child.id] = savedAmounts[child.id] ?? "";
            }
          }
        }
        setSelectedParentIds(parentIds);
        setAmounts(initialAmounts);
      })
      .catch(() => setError("Failed to load categories or budgets."))
      .finally(() => setLoading(false));
  }, []);

  function handleAmountChange(categoryId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [categoryId]: value }));
    setSaved(false);
  }

  function handleAddRow() {
    setPendingRows((prev) => [...prev, `pending-${nextRowKey.current++}`]);
    setSaved(false);
  }

  function handleCancelPendingRow(rowKey: string) {
    setPendingRows((prev) => prev.filter((k) => k !== rowKey));
  }

  function handlePickParent(rowKey: string, parentId: string) {
    const parent = categories.find((c) => c.id === parentId);
    if (!parent) return;

    setPendingRows((prev) => prev.filter((k) => k !== rowKey));
    setSelectedParentIds((prev) => [...prev, parentId]);
    setAmounts((prev) => {
      const next = { ...prev };
      if (parent.children.length === 0) {
        next[parent.id] = "";
      } else {
        for (const child of parent.children) next[child.id] = "";
      }
      return next;
    });
    setSaved(false);
  }

  function handleDeleteStandaloneRow(parent: Category) {
    setSelectedParentIds((prev) => prev.filter((id) => id !== parent.id));
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[parent.id];
      return next;
    });
    setPendingDeleteIds((prev) => [...prev, parent.id]);
    setSaved(false);
  }

  function handleDeleteGroup(parent: Category) {
    setSelectedParentIds((prev) => prev.filter((id) => id !== parent.id));
    setAmounts((prev) => {
      const next = { ...prev };
      for (const child of parent.children) delete next[child.id];
      return next;
    });
    setPendingDeleteIds((prev) => [...prev, parent.id, ...parent.children.map((c) => c.id)]);
    setSaved(false);
  }

  function handleDeleteChildRow(childId: string) {
    setAmounts((prev) => {
      const next = { ...prev };
      delete next[childId];
      return next;
    });
    setPendingDeleteIds((prev) => [...prev, childId]);
    setSaved(false);
  }

  async function handleSave() {
    const budgets = Object.entries(amounts)
      .filter(([, value]) => value.trim() !== "")
      .map(([categoryId, value]) => ({ categoryId, monthlyAmount: Number(value) }))
      .filter((b) => Number.isFinite(b.monthlyAmount) && b.monthlyAmount >= 0);

    if (budgets.length === 0 && pendingDeleteIds.length === 0) {
      setError("Set at least one monthly amount");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await Promise.all(
        pendingDeleteIds.map((categoryId) =>
          fetch(`/api/budgets/${categoryId}`, { method: "DELETE", credentials: "include" })
        )
      );

      if (budgets.length > 0) {
        const res = await fetch("/api/budgets", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ budgets }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to save budget");
        }
      }

      setPendingDeleteIds([]);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const availableParents = categories.filter((c) => !selectedParentIds.includes(c.id));
  const isEmpty = selectedParentIds.length === 0 && pendingRows.length === 0;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen animate-fade-in">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-white">Create your budget</h1>
        <p className="mt-1 text-emerald-200 text-sm">
          Set a monthly amount for the categories you want to track.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-8 space-y-6">
          {categories.length === 0 ? (
            <p className="text-sm text-gray-500">
              No categories yet —{" "}
              <Link href="/upload" className="text-emerald-700 hover:underline">
                import transactions
              </Link>{" "}
              to create some.
            </p>
          ) : (
            <div className="space-y-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    <th className="pb-2">Parent Category</th>
                    <th className="pb-2">Child Category</th>
                    <th className="pb-2 text-right">Budget</th>
                    <th className="pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {selectedParentIds.map((parentId) => {
                    const parent = categories.find((c) => c.id === parentId);
                    if (!parent) return null;

                    if (parent.children.length === 0) {
                      return (
                        <tr key={parent.id} className="border-t border-gray-100">
                          <td className="py-2 text-gray-900">{parent.name}</td>
                          <td className="py-2 text-gray-400">—</td>
                          <td className="py-2 text-right">
                            <input
                              type="number"
                              min={0}
                              step="0.01"
                              value={amounts[parent.id] ?? ""}
                              onChange={(e) => handleAmountChange(parent.id, e.target.value)}
                              placeholder="0.00"
                              className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-800"
                            />
                          </td>
                          <td className="py-2 pl-2">
                            <button
                              type="button"
                              aria-label={`Delete ${parent.name}`}
                              onClick={() => handleDeleteStandaloneRow(parent)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <Fragment key={parent.id}>
                        <tr className="border-t border-gray-100">
                          <td className="py-2 font-semibold text-gray-900">{parent.name}</td>
                          <td className="py-2 text-gray-400">—</td>
                          <td className="py-2 text-right font-semibold text-gray-700">
                            {childTotal(parent, amounts).toFixed(2)}
                          </td>
                          <td className="py-2 pl-2">
                            <button
                              type="button"
                              aria-label={`Delete ${parent.name}`}
                              onClick={() => handleDeleteGroup(parent)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                        {parent.children
                          .filter((child) => child.id in amounts)
                          .map((child) => (
                            <tr key={child.id} className="border-t border-gray-50">
                              <td className="py-2" />
                              <td className="py-2 pl-4 text-gray-500">{child.name}</td>
                              <td className="py-2 text-right">
                                <input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={amounts[child.id] ?? ""}
                                  onChange={(e) => handleAmountChange(child.id, e.target.value)}
                                  placeholder="0.00"
                                  className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-800"
                                />
                              </td>
                              <td className="py-2 pl-2">
                                <button
                                  type="button"
                                  aria-label={`Delete ${child.name}`}
                                  onClick={() => handleDeleteChildRow(child.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                      </Fragment>
                    );
                  })}

                  {pendingRows.map((rowKey) => (
                    <tr key={rowKey} className="border-t border-gray-100">
                      <td className="py-2" colSpan={2}>
                        <select
                          defaultValue=""
                          onChange={(e) => handlePickParent(rowKey, e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        >
                          <option value="" disabled>
                            Choose a category…
                          </option>
                          {availableParents.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 text-right">
                        <input
                          type="number"
                          disabled
                          placeholder="0.00"
                          className="w-32 border border-gray-100 rounded-lg px-3 py-1.5 text-sm text-right text-gray-300"
                        />
                      </td>
                      <td className="py-2 pl-2">
                        <button
                          type="button"
                          aria-label="Cancel row"
                          onClick={() => handleCancelPendingRow(rowKey)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}

                  {isEmpty && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-sm text-gray-400">
                        No budget rows yet — click Add to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              <button
                type="button"
                onClick={handleAddRow}
                disabled={availableParents.length === 0}
                className="text-sm font-medium text-emerald-700 hover:text-emerald-900 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {saved && <p className="text-sm text-emerald-700">Budget saved.</p>}

          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <Link
              href="/dashboard"
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
            >
              Back to dashboard
            </Link>
            <button
              onClick={handleSave}
              disabled={saving || categories.length === 0}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save budget"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
