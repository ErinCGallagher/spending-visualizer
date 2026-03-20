/**
 * Dashboard — the main view showing spending charts with filter controls.
 * Redirects to /upload when no transactions exist.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import NavBar from "@/app/components/NavBar";
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
import CategoryLineChart from "@/app/dashboard/CategoryLineChart";
import CountryDashboard from "@/app/dashboard/CountryDashboard";
import DashboardTabBar from "@/app/dashboard/DashboardTabBar";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

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
  const { data: session } = authClient.useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const [view, setView] = useState<"overview" | "trip">("overview");

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
  const [categoryTimelineData, setCategoryTimelineData] = useState<MonthlyTotal[]>([]);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);
  const [categoryTimelineLoading, setCategoryTimelineLoading] = useState(false);

  const [monthlyGroupBy, setMonthlyGroupBy] = useState<"category" | "total">(
    "category"
  );
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [categoryTimelineGranularity, setCategoryTimelineGranularity] = useState<Granularity>("month");

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
    async (f: FilterValues, groupBy: "category" | "total", gran: Granularity, catTimelineGran: Granularity) => {
      const base = buildParams(f);

      setCategoryLoading(true);
      setMonthlyLoading(true);
      setCumulativeLoading(true);
      setCategoryTimelineLoading(true);

      const [catRes, monthRes, cumRes, catTimelineRes] = await Promise.allSettled([
        fetch(`/api/charts/category-totals?${base}`, { credentials: "include" }),
        fetch(`/api/charts/monthly-totals?${buildParams(f, { groupBy })}`, { credentials: "include" }),
        fetch(`/api/charts/cumulative?${buildParams(f, { granularity: gran })}`, { credentials: "include" }),
        fetch(`/api/charts/monthly-totals?${buildParams(f, { groupBy: "category", granularity: catTimelineGran })}`, { credentials: "include" }),
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

      if (catTimelineRes.status === "fulfilled" && catTimelineRes.value.ok) {
        const data: MonthlyTotal[] = await catTimelineRes.value.json();
        setCategoryTimelineData(data);
      }
      setCategoryTimelineLoading(false);
    },
    []
  );

  // Re-fetch charts whenever filters, groupBy, or granularity change
  useEffect(() => {
    if (meta?.dateRange !== undefined) {
      fetchCharts(filters, monthlyGroupBy, granularity, categoryTimelineGranularity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, monthlyGroupBy, granularity, categoryTimelineGranularity, meta]);

  const handleFiltersChange = useCallback((f: FilterValues) => {
    setFilters(f);
  }, []);

  if (metaLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  if (meta?.dateRange === null) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-gray-500 text-sm">No transactions yet.</p>
        <Link
          href="/upload"
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
        >
          Import transactions
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <NavBar links={[{ label: "Dashboards", href: "/" }, { label: "Transactions", href: "/transactions" }]}>
        {/* Hero content */}
        <div className="py-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p className="mt-1 text-emerald-200 text-sm">
              Here&apos;s your spending overview.
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
      <div className="max-w-6xl mx-auto px-6 -mt-24 pb-8">
        {view === "overview" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            <DashboardTabBar activeView={view} onSwitch={setView} />
            <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
              <Filters onChange={handleFiltersChange} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Category breakdown */}
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
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
              <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
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
              <div className="lg:col-span-2 bg-gray-50 rounded-lg border border-gray-100 p-5">
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

              {/* Spending by category over time */}
              <div className="lg:col-span-2 bg-gray-50 rounded-lg border border-gray-100 p-5">
                <h2 className="text-sm font-semibold text-gray-700 mb-4">
                  Category spending over time
                </h2>
                <CategoryLineChart
                  data={categoryTimelineData}
                  currency={currency}
                  loading={categoryTimelineLoading}
                  granularity={categoryTimelineGranularity}
                  onGranularityChange={setCategoryTimelineGranularity}
                />
              </div>
            </div>
          </div>
        )}

        {view === "trip" && (
          <CountryDashboard onSwitchView={setView} />
        )}
      </div>
    </main>
  );
}
