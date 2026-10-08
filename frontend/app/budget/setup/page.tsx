/** Budget creation screen — select categories and set a monthly amount for each. */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Category } from "@/app/upload/types";

interface ExistingBudget {
  categoryId: string;
  monthlyAmount: number;
}

export default function BudgetSetupPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/budgets", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(([categoryData, budgetData]: [Category[], { budgets: ExistingBudget[] }]) => {
        setCategories(categoryData);
        const initial: Record<string, string> = {};
        for (const b of budgetData.budgets) {
          initial[b.categoryId] = String(b.monthlyAmount);
        }
        setAmounts(initial);
      })
      .catch(() => setError("Failed to load categories or budgets."))
      .finally(() => setLoading(false));
  }, []);

  function handleAmountChange(categoryId: string, value: string) {
    setAmounts((prev) => ({ ...prev, [categoryId]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const budgets = Object.entries(amounts)
      .filter(([, value]) => value.trim() !== "")
      .map(([categoryId, value]) => ({ categoryId, monthlyAmount: Number(value) }))
      .filter((b) => Number.isFinite(b.monthlyAmount) && b.monthlyAmount >= 0);

    if (budgets.length === 0) {
      setError("Set at least one monthly amount");
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);
    try {
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
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

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
            <div className="space-y-6">
              {categories.map((parent) => (
                <div key={parent.id}>
                  <h2 className="text-sm font-semibold text-gray-900 mb-2">{parent.name}</h2>
                  <ul className="space-y-2">
                    <li className="flex items-center justify-between gap-4">
                      <span className="text-sm text-gray-700">{parent.name}</span>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={amounts[parent.id] ?? ""}
                        onChange={(e) => handleAmountChange(parent.id, e.target.value)}
                        placeholder="0.00"
                        className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-800"
                      />
                    </li>
                    {parent.children.map((child) => (
                      <li key={child.id} className="flex items-center justify-between gap-4 pl-4">
                        <span className="text-sm text-gray-500">{child.name}</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={amounts[child.id] ?? ""}
                          onChange={(e) => handleAmountChange(child.id, e.target.value)}
                          placeholder="0.00"
                          className="w-32 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
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
