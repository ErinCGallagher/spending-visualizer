/**
 * Dashboard — the main view showing spending charts with filter controls.
 * Redirects to /upload when no transactions exist.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
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
import CountryDashboard from "@/app/dashboard/CountryDashboard";

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
  const router = useRouter();

  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const [view, setView] = useState<"overview" | "country">("overview");

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
      {/* Green header — navbar + hero, extends down to overlap content */}
      <div className="bg-emerald-800 pb-32">
        <div className="max-w-6xl mx-auto px-6">
          {/* Navbar row */}
          <div className="h-14 flex items-center justify-between">
            <span className="text-sm font-semibold text-white tracking-tight">
              Spending Visualizer
            </span>
            <div className="flex items-center gap-6">
              <Link href="/transactions" className="text-sm text-emerald-200 hover:text-white font-medium">
                Transactions
              </Link>
              {/* Profile dropdown */}
              <div ref={profileRef} className="relative">
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-emerald-200 hover:text-white transition-colors"
                >
                  {/* User icon */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
                    <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
                  </svg>
                  {/* Chevron down */}
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    <button
                      onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Settings
                    </button>
                    <button
                      onClick={() => authClient.signOut({ callbackURL: "/login" })}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

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
        </div>
      </div>

      {/* Content pulled up to overlap the green header */}
      <div className="max-w-6xl mx-auto px-6 -mt-24 pb-8">
        {view === "overview" && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
            {/* Tab bar inside the card */}
            <div className="flex items-center justify-between pb-6 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-900">Overview</h2>
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setView("overview")}
                  className="text-base font-medium pb-0.5 text-gray-900 border-b-2 border-emerald-700"
                >
                  Overview
                </button>
                <button
                  onClick={() => setView("country")}
                  className="text-base font-medium pb-0.5 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  Country
                </button>
              </div>
            </div>
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
            </div>
          </div>
        )}

        {view === "country" && (
          <CountryDashboard onSwitchView={setView} />
        )}
      </div>
    </main>
  );
}
