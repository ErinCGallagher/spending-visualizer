/**
 * Budget tab — first-run group selection, a placeholder until a budget has
 * been created, then the actual-vs-budget chart and YTD/average stats.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Filters, { type FilterValues, type Meta } from "@/app/dashboard/Filters";
import BudgetBarChart from "@/app/dashboard/BudgetBarChart";
import { aggregateMonthlyActuals, computeBudgetStats } from "@/lib/budgetStats";
import { formatAmount } from "@/lib/format";

interface BudgetSettings {
  groupId: string;
  groupName: string;
  groupType: string;
}

interface BudgetSummaryCategory {
  categoryId: string;
  categoryName: string;
  monthlyAmount: number;
}

interface BudgetSummaryMonthly {
  month: string;
  categoryId: string;
  categoryName: string;
  actual: number;
}

interface BudgetSummary {
  groupId: string;
  groupName: string;
  totalMonthlyBudget: number;
  categories: BudgetSummaryCategory[];
  monthly: BudgetSummaryMonthly[];
}

interface Props {
  meta: Meta | null;
}

export default function BudgetTab({ meta }: Props) {
  const groups = meta?.groups ?? [];
  const currency = meta?.homeCurrency ?? "CAD";

  const [settings, setSettings] = useState<BudgetSettings | null | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [summary, setSummary] = useState<BudgetSummary | null | undefined>(undefined);
  const [filters, setFilters] = useState<FilterValues | null>(null);

  useEffect(() => {
    fetch("/api/budget-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data: BudgetSettings | null) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  useEffect(() => {
    if (!settings) return;
    const params = new URLSearchParams();
    if (filters?.from) params.set("from", filters.from);
    if (filters?.to) params.set("to", filters.to);
    const query = params.toString();
    fetch(`/api/budgets/summary${query ? `?${query}` : ""}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: BudgetSummary | null) => setSummary(data))
      .catch(() => setSummary(null));
  }, [settings, filters]);

  const handleFiltersChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  async function handleSelectGroup() {
    if (!selectedGroupId) {
      setError("Select a group");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/budget-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save budget settings");
      }
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSettings({ groupId: group.id, groupName: group.name, groupType: group.groupType });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (settings === undefined) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (settings === null) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Set up your budget</h2>
          <p className="text-sm text-gray-500">
            Choose the group whose spending you want to track against a budget.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No groups yet —{" "}
            <Link href="/upload" className="text-emerald-700 hover:underline">
              import transactions
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="">Select a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSelectGroup}
              disabled={saving}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  if (summary === undefined) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (!summary || summary.categories.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Your budget tracks spending in <span className="font-medium text-gray-700">{settings.groupName}</span>.
        </p>
        <Link
          href="/budget/setup"
          className="inline-block bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          Create your budget
        </Link>
      </div>
    );
  }

  const monthlyTotals = aggregateMonthlyActuals(summary.monthly);
  const stats = computeBudgetStats(monthlyTotals, summary.totalMonthlyBudget);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          Tracking <span className="font-medium text-gray-700">{settings.groupName}</span>
        </p>
        <Link href="/budget/setup" className="text-sm text-emerald-700 hover:underline">
          Edit budget
        </Link>
      </div>

      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <Filters meta={meta} onChange={handleFiltersChange} showTravellers={false} showGroupType={false} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="YTD actual" value={formatAmount(stats.ytdActual, currency)} />
        <StatTile label="YTD budget" value={formatAmount(stats.ytdBudget, currency)} />
        <StatTile label="Avg monthly actual" value={formatAmount(stats.avgMonthlyActual, currency)} />
        <StatTile label="Avg monthly budget" value={formatAmount(stats.avgMonthlyBudget, currency)} />
      </div>

      <BudgetBarChart
        data={summary.monthly}
        totalMonthlyBudget={summary.totalMonthlyBudget}
        currency={currency}
      />
    </div>
  );
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-4">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
      <p className="mt-1 text-lg font-semibold text-gray-900">{value}</p>
    </div>
  );
}
