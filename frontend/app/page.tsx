/**
 * Dashboard — the main view showing spending charts with filter controls.
 * Redirects to /upload when no transactions exist.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Filters, { type FilterValues } from "@/app/dashboard/Filters";
import CategoryPieChart, {
  type CategoryTotal,
} from "@/app/dashboard/CategoryPieChart";
import MonthlyBarChart, {
  type MonthlyTotal,
} from "@/app/dashboard/MonthlyBarChart";
import CumulativeLineChart, {
  type CumulativePoint,
  type Granularity,
} from "@/app/dashboard/CumulativeLineChart";

interface Meta {
  dateRange: { from: string; to: string } | null;
}

function buildParams(
  filters: FilterValues,
  extra: Record<string, string> = {}
): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  for (const t of filters.travellers) params.append("traveller", t);
  for (const c of filters.countries) params.append("country", c);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return params.toString();
}

export default function DashboardPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const [filters, setFilters] = useState<FilterValues>({
    from: "",
    to: "",
    travellers: [],
    countries: [],
  });

  const [categoryData, setCategoryData] = useState<CategoryTotal[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTotal[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativePoint[]>([]);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);

  const [monthlyGroupBy, setMonthlyGroupBy] = useState<"category" | "total">(
    "category"
  );
  const [granularity, setGranularity] = useState<Granularity>("month");

  // Determine the home currency from any loaded chart data
  const [currency, setCurrency] = useState("CAD");

  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  useEffect(() => {
    fetch("/api/transactions/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data))
      .catch(() => setMeta({ dateRange: null }))
      .finally(() => setMetaLoading(false));
  }, []);

  const fetchCharts = useCallback(
    async (f: FilterValues, groupBy: "category" | "total", gran: Granularity) => {
      const base = buildParams(f);

      setCategoryLoading(true);
      setMonthlyLoading(true);
      setCumulativeLoading(true);

      const [catRes, monthRes, cumRes] = await Promise.allSettled([
        fetch(`/api/charts/category-totals?${base}`, { credentials: "include" }),
        fetch(`/api/charts/monthly-totals?${buildParams(f, { groupBy })}`, { credentials: "include" }),
        fetch(`/api/charts/cumulative?${buildParams(f, { granularity: gran })}`, { credentials: "include" }),
      ]);

      if (catRes.status === "fulfilled" && catRes.value.ok) {
        const data: CategoryTotal[] = await catRes.value.json();
        setCategoryData(data);
      }
      setCategoryLoading(false);

      if (monthRes.status === "fulfilled" && monthRes.value.ok) {
        const data: MonthlyTotal[] = await monthRes.value.json();
        setMonthlyData(data);
      }
      setMonthlyLoading(false);

      if (cumRes.status === "fulfilled" && cumRes.value.ok) {
        const data: CumulativePoint[] = await cumRes.value.json();
        setCumulativeData(data);
      }
      setCumulativeLoading(false);
    },
    []
  );

  // Re-fetch charts whenever filters, groupBy, or granularity change
  useEffect(() => {
    if (meta?.dateRange !== undefined) {
      fetchCharts(filters, monthlyGroupBy, granularity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, monthlyGroupBy, granularity, meta]);

  const handleFiltersChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  if (metaLoading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (meta?.dateRange === null) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">No transactions yet.</p>
        <Link
          href="/upload"
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Import transactions
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            Spending Visualizer
          </h1>
          <div className="flex items-center gap-2">
            <Link
              href="/transactions"
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Transactions
            </Link>
            <Link
              href="/upload"
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Import
            </Link>
            <Link
              href="/settings"
              className="px-3 py-1.5 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
            >
              Settings
            </Link>
          </div>
        </div>

        <Filters onChange={handleFiltersChange} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Category breakdown */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Spending by category
            </h2>
            <CategoryPieChart
              data={categoryData}
              currency={currency}
              loading={categoryLoading}
            />
          </div>

          {/* Monthly spending */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Monthly spending
            </h2>
            <MonthlyBarChart
              data={monthlyData}
              currency={currency}
              loading={monthlyLoading}
              groupBy={monthlyGroupBy}
              onGroupByChange={setMonthlyGroupBy}
            />
          </div>

          {/* Cumulative spending */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Cumulative spending
            </h2>
            <CumulativeLineChart
              data={cumulativeData}
              currency={currency}
              loading={cumulativeLoading}
              granularity={granularity}
              onGranularityChange={setGranularity}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
