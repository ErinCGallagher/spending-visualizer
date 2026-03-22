/**
 * Dashboard — the main view showing spending charts with filter controls.
 * Redirects to /upload when no transactions exist.
 */

"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import NavBar from "@/app/components/NavBar";
import Filters, { type FilterValues } from "@/app/dashboard/Filters";
import CountryDashboard from "@/app/dashboard/CountryDashboard";
import DashboardTabBar from "@/app/dashboard/DashboardTabBar";
import DashboardOverview from "@/app/dashboard/DashboardOverview";
import { useDashboardData } from "@/app/dashboard/useDashboardData";
import type { Granularity } from "@/app/dashboard/CumulativeLineChart";

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const firstName = session?.user?.name?.split(" ")[0] ?? "";
  const [view, setView] = useState<"overview" | "trip">("overview");

  const [filters, setFilters] = useState<FilterValues>({
    from: "",
    to: "",
    travellers: [],
    countries: [],
  });
  const [monthlyGroupBy, setMonthlyGroupBy] = useState<"category" | "total">(
    "category"
  );
  const [granularity, setGranularity] = useState<Granularity>("month");
  const [categoryTimelineGranularity, setCategoryTimelineGranularity] =
    useState<Granularity>("month");

  const {
    meta,
    metaLoading,
    categoryData,
    monthlyData,
    cumulativeData,
    categoryTimelineData,
    categoryLoading,
    monthlyLoading,
    cumulativeLoading,
    categoryTimelineLoading,
  } = useDashboardData(filters, monthlyGroupBy, granularity, categoryTimelineGranularity);

  const currency = meta?.homeCurrency ?? "CAD";

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
            <DashboardOverview
              categoryData={categoryData}
              monthlyData={monthlyData}
              cumulativeData={cumulativeData}
              categoryTimelineData={categoryTimelineData}
              categoryLoading={categoryLoading}
              monthlyLoading={monthlyLoading}
              cumulativeLoading={cumulativeLoading}
              categoryTimelineLoading={categoryTimelineLoading}
              currency={currency}
              monthlyGroupBy={monthlyGroupBy}
              onMonthlyGroupByChange={setMonthlyGroupBy}
              granularity={granularity}
              onGranularityChange={setGranularity}
              categoryTimelineGranularity={categoryTimelineGranularity}
              onCategoryTimelineGranularityChange={setCategoryTimelineGranularity}
            />
          </div>
        )}

        {view === "trip" && (
          <CountryDashboard onSwitchView={setView} currency={currency} />
        )}
      </div>
    </main>
  );
}
