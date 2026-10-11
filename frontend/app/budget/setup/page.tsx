/** Budget creation screen — build a table of per-category monthly budgets and income. */

"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import type { Category } from "@/app/upload/types";
import { formatAmount } from "@/lib/format";

interface ExistingBudget {
  categoryId: string;
  monthlyAmount: number;
}

interface IncomeCategory {
  id: string;
  name: string;
}

interface IncomeData {
  parent: IncomeCategory;
  children: IncomeCategory[];
}

interface PensionContribution {
  month: number;
  amount: number;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/** Sum of a parent's child budget amounts, used for its read-only total. */
function childTotal(parent: Category, amounts: Record<string, string>): number {
  return parent.children.reduce((sum, child) => sum + (Number(amounts[child.id]) || 0), 0);
}

/** Monthly-amount input with a $ prefix, shared by the Budget and Income sections. */
function AmountInput({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="relative inline-block">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">
        $
      </span>
      <input
        type="number"
        aria-label={label}
        min={0}
        step="0.01"
        value={value}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        onWheel={(e) => e.currentTarget.blur()}
        disabled={disabled}
        placeholder="0.00"
        className={`w-32 border rounded-lg pl-6 pr-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-800 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
          disabled ? "border-gray-100 text-gray-300" : "border-gray-200"
        }`}
      />
    </div>
  );
}

export default function BudgetSetupPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedParentIds, setSelectedParentIds] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [pendingRows, setPendingRows] = useState<string[]>([]);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
  const [incomeParent, setIncomeParent] = useState<IncomeCategory | null>(null);
  const [incomeChildren, setIncomeChildren] = useState<IncomeCategory[]>([]);
  const [pendingIncomeRows, setPendingIncomeRows] = useState<string[]>([]);
  const [incomeRowNames, setIncomeRowNames] = useState<Record<string, string>>({});
  const [submittingIncomeRows, setSubmittingIncomeRows] = useState<string[]>([]);
  const [pensionYear, setPensionYear] = useState(() => new Date().getFullYear());
  const [pensionAmounts, setPensionAmounts] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const nextRowKey = useRef(0);
  const nextIncomeRowKey = useRef(0);

  useEffect(() => {
    Promise.all([
      fetch("/api/categories", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/budgets", { credentials: "include" }).then((r) => r.json()),
      fetch("/api/income", { credentials: "include" }).then((r) => r.json()),
    ])
      .then(
        ([categoryData, budgetData, incomeData]: [
          Category[],
          { budgets: ExistingBudget[] },
          IncomeData
        ]) => {
          setCategories(categoryData);
          setIncomeParent(incomeData.parent);
          setIncomeChildren(incomeData.children);

          const savedAmounts: Record<string, string> = {};
          for (const b of budgetData.budgets) savedAmounts[b.categoryId] = String(b.monthlyAmount);

          const parentIds: string[] = [];
          const initialAmounts: Record<string, string> = {};
          for (const b of budgetData.budgets) {
            const topLevel = categoryData.find(
              (c) => c.id === b.categoryId || c.children.some((child) => child.id === b.categoryId)
            );
            if (!topLevel || topLevel.id === incomeData.parent.id || parentIds.includes(topLevel.id)) {
              continue;
            }
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
        }
      )
      .catch(() => setError("Failed to load categories or budgets."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetch(`/api/pension?year=${pensionYear}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data: { year: number; contributions: PensionContribution[] }) => {
        const next: Record<number, string> = {};
        for (const c of data.contributions) next[c.month] = String(c.amount);
        setPensionAmounts(next);
      })
      .catch(() => setError("Failed to load pension contributions."));
  }, [pensionYear]);

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

  function handleAddIncomeRow() {
    setPendingIncomeRows((prev) => [...prev, `income-pending-${nextIncomeRowKey.current++}`]);
  }

  function handleCancelIncomeRow(rowKey: string) {
    setPendingIncomeRows((prev) => prev.filter((k) => k !== rowKey));
    setIncomeRowNames((prev) => {
      const next = { ...prev };
      delete next[rowKey];
      return next;
    });
  }

  function handleIncomeRowNameChange(rowKey: string, value: string) {
    setIncomeRowNames((prev) => ({ ...prev, [rowKey]: value }));
  }

  async function handleConfirmIncomeRow(rowKey: string) {
    const name = (incomeRowNames[rowKey] ?? "").trim();
    if (!name || !incomeParent) return;

    setSubmittingIncomeRows((prev) => [...prev, rowKey]);
    setError(null);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, parentId: incomeParent.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to add income category");
      }
      const created = await res.json();
      setIncomeChildren((prev) => [...prev, { id: created.id, name: created.name }]);
      handleCancelIncomeRow(rowKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSubmittingIncomeRows((prev) => prev.filter((k) => k !== rowKey));
    }
  }

  function handlePensionAmountChange(month: number, value: string) {
    setPensionAmounts((prev) => ({ ...prev, [month]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const budgets = Object.entries(amounts)
      .filter(([, value]) => value.trim() !== "")
      .map(([categoryId, value]) => ({ categoryId, monthlyAmount: Number(value) }))
      .filter((b) => Number.isFinite(b.monthlyAmount) && b.monthlyAmount >= 0);

    const pensionContributions: PensionContribution[] = Object.entries(pensionAmounts)
      .filter(([, value]) => value.trim() !== "")
      .map(([month, value]) => ({ month: Number(month), amount: Number(value) }))
      .filter((c) => Number.isFinite(c.amount) && c.amount >= 0)
      .sort((a, b) => a.month - b.month);

    if (budgets.length === 0 && pendingDeleteIds.length === 0 && pensionContributions.length === 0) {
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

      if (pensionContributions.length > 0) {
        const res = await fetch("/api/pension", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ year: pensionYear, contributions: pensionContributions }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error ?? "Failed to save pension contributions");
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

  const availableParents = categories.filter(
    (c) => !selectedParentIds.includes(c.id) && c.id !== incomeParent?.id
  );
  const isEmpty = selectedParentIds.length === 0 && pendingRows.length === 0;
  const totalSpendingBudget = selectedParentIds.reduce((sum, parentId) => {
    const parent = categories.find((c) => c.id === parentId);
    if (!parent) return sum;
    return sum + (parent.children.length === 0 ? Number(amounts[parent.id]) || 0 : childTotal(parent, amounts));
  }, 0);
  const currentCalendarYear = new Date().getFullYear();
  const pensionYearOptions = Array.from({ length: 5 }, (_, i) => currentCalendarYear - 3 + i);

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
        <h1 className="text-2xl font-bold text-white">Create your monthly budget</h1>
        <p className="mt-1 text-emerald-200 text-sm">
          Setup your monthly budget for spending, define income categories and pension
          contributions.
        </p>
      </div>

      <div className="max-w-3xl mx-auto px-6 pb-8">
        <div className="bg-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden p-8 space-y-8">
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Spending Budget</h2>
              <p className="mt-1 text-sm text-gray-500">
                Set monthly spending targets for all budget categories.
              </p>
            </div>
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
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 divide-x divide-gray-200">
                      <th className="py-2 px-3">Parent Category</th>
                      <th className="py-2 px-3">Child Category</th>
                      <th className="py-2 px-3 text-right">Budget</th>
                      <th className="py-2 px-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {selectedParentIds.map((parentId) => {
                      const parent = categories.find((c) => c.id === parentId);
                      if (!parent) return null;

                      if (parent.children.length === 0) {
                        return (
                          <tr key={parent.id} className="border-t border-gray-200 divide-x divide-gray-200">
                            <td className="py-2 px-3 text-gray-900">{parent.name}</td>
                            <td className="py-2 px-3 text-gray-400">—</td>
                            <td className="py-2 px-3 text-right">
                              <AmountInput
                                label={`${parent.name} monthly amount`}
                                value={amounts[parent.id] ?? ""}
                                onChange={(value) => handleAmountChange(parent.id, value)}
                              />
                            </td>
                            <td className="py-2 pl-2 pr-3 text-center">
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
                          <tr className="border-t border-gray-200 divide-x divide-gray-200">
                            <td className="py-2 px-3 font-semibold text-gray-900">{parent.name}</td>
                            <td className="py-2 px-3 text-gray-400">—</td>
                            <td className="py-2 px-3 text-right font-semibold text-gray-700">
                              ${childTotal(parent, amounts).toFixed(2)}
                            </td>
                            <td className="py-2 pl-2 pr-3 text-center">
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
                              <tr key={child.id} className="border-t border-gray-100 divide-x divide-gray-200">
                                <td className="py-2 px-3" />
                                <td className="py-2 pl-4 pr-3 text-gray-500">{child.name}</td>
                                <td className="py-2 px-3 text-right">
                                  <AmountInput
                                    label={`${child.name} monthly amount`}
                                    value={amounts[child.id] ?? ""}
                                    onChange={(value) => handleAmountChange(child.id, value)}
                                  />
                                </td>
                                <td className="py-2 pl-2 pr-3 text-center">
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
                      <tr key={rowKey} className="border-t border-gray-200 divide-x divide-gray-200">
                        <td className="py-2 px-3" colSpan={2}>
                          <select
                            aria-label="Choose a category"
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
                        <td className="py-2 px-3 text-right">
                          <AmountInput label="New category monthly amount" value="" disabled />
                        </td>
                        <td className="py-2 pl-2 pr-3 text-center">
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
                        <td colSpan={4} className="py-4 px-3 text-center text-sm text-gray-400">
                          No budget rows yet — click Add to create one.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {!isEmpty && (
                    <tfoot>
                      <tr className="border-t border-gray-300 divide-x divide-gray-200">
                        <td className="py-2 px-3 font-semibold text-gray-900" colSpan={2}>
                          Total
                        </td>
                        <td className="py-2 px-3 text-right font-semibold text-gray-900">
                          {formatAmount(totalSpendingBudget, "CAD", 2)}
                        </td>
                        <td className="py-2 pl-2 pr-3" />
                      </tr>
                    </tfoot>
                  )}
                </table>
                </div>

                <button
                  type="button"
                  onClick={handleAddRow}
                  disabled={availableParents.length === 0}
                  className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg font-medium text-xs disabled:opacity-50"
                >
                  Add Spending Category
                </button>
              </div>
            )}
          </div>

          {incomeParent && (
            <div className="space-y-4 pt-6 border-t border-gray-100">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Income</h2>
                <p className="mt-1 text-sm text-gray-500">Create a list of income sub categories</p>
              </div>

              {(incomeChildren.length > 0 || pendingIncomeRows.length > 0) && (
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <table className="w-full text-sm border-collapse">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 divide-x divide-gray-200">
                        <th className="py-2 px-3">Category</th>
                        <th className="py-2 px-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {incomeChildren.map((child) => (
                        <tr key={child.id} className="border-t border-gray-200 divide-x divide-gray-200">
                          <td className="py-2 px-3 text-gray-900">{child.name}</td>
                          <td className="py-2 px-3" />
                        </tr>
                      ))}
                      {pendingIncomeRows.map((rowKey) => (
                        <tr key={rowKey} className="border-t border-gray-200 divide-x divide-gray-200">
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              aria-label="Income Category Name"
                              placeholder="Income Category Name"
                              value={incomeRowNames[rowKey] ?? ""}
                              onChange={(e) => handleIncomeRowNameChange(rowKey, e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleConfirmIncomeRow(rowKey);
                              }}
                              disabled={submittingIncomeRows.includes(rowKey)}
                              autoFocus
                              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                            />
                          </td>
                          <td className="py-2 pl-2 pr-3 text-center">
                            <button
                              type="button"
                              aria-label="Cancel row"
                              onClick={() => handleCancelIncomeRow(rowKey)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <button
                type="button"
                onClick={handleAddIncomeRow}
                className="bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2 rounded-lg font-medium text-xs disabled:opacity-50"
              >
                Add Income Category
              </button>

              <div className="pt-6 border-t border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Pension contributions</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Input the amount you contributed to you pension for each month of the year.
                    </p>
                  </div>
                  <select
                    aria-label="Pension year"
                    value={pensionYear}
                    onChange={(e) => setPensionYear(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  >
                    {pensionYearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {MONTH_NAMES.map((name, i) => {
                    const month = i + 1;
                    return (
                      <div key={month} className="flex items-center justify-between gap-2">
                        <span className="text-sm text-gray-500">{name}</span>
                        <AmountInput
                          label={`${name} pension amount`}
                          value={pensionAmounts[month] ?? ""}
                          onChange={(value) => handlePensionAmountChange(month, value)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
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
