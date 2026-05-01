/**
 * Trip Dashboard — per-trip spending summary with category breakdown.
 * Owns its own filter state and drives the trip summary table, category
 * table, and category pie chart.
 */

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Filters, { type FilterValues } from "@/app/dashboard/Filters";
import DashboardTabBar from "@/app/dashboard/DashboardTabBar";
import CountrySummaryTable from "@/app/dashboard/CountrySummaryTable";
import CountryCategoryTable from "@/app/dashboard/CountryCategoryTable";
import CategoryPieChart, {
  type CategoryTotal,
} from "@/app/dashboard/CategoryPieChart";
import { CountryDashboardSkeleton } from "@/app/components/ui/LoadingSkeleton";
import { formatCurrency } from "@/lib/format";
import type { Meta } from "@/app/dashboard/useDashboardData";

interface FilterState {
  from: string;
  to: string;
  travellers: string[];
}

interface Props {
  onSwitchView: (view: "overview" | "trip") => void;
  currency: string;
  meta: Meta | null;
}

export default function TripDashboard({ onSwitchView, currency, meta }: Props) {
  const [filterState, setFilterState] = useState<FilterState>({
    from: "",
    to: "",
    travellers: [],
  });
  const [selectedGroup, setSelectedGroup] = useState<{ id: string; name: string } | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryTotal[]>([]);
  const [totalSpend, setTotalSpend] = useState<number | null>(null);
  const [categoryLoading, setCategoryLoading] = useState(false);

  const [overlayState, setOverlayState] = useState<"visible" | "fading" | "hidden">("hidden");
  const overlayStateRef = useRef<"visible" | "fading" | "hidden">("hidden");

  function setOverlay(next: "visible" | "fading" | "hidden") {
    overlayStateRef.current = next;
    setOverlayState(next);
  }

  useEffect(() => {
    if (categoryLoading) {
      setOverlay("visible");
    } else if (overlayStateRef.current !== "hidden") {
      setOverlay("fading");
      const timer = setTimeout(() => setOverlay("hidden"), 300);
      return () => clearTimeout(timer);
    }
  }, [categoryLoading]);

  useEffect(() => {
    setCategoryLoading(true);
    const params = new URLSearchParams();
    if (filterState.from) params.set("from", filterState.from);
    if (filterState.to) params.set("to", filterState.to);
    for (const t of filterState.travellers) params.append("traveller", t);
    if (selectedGroup) params.set("groupId", selectedGroup.id);
    fetch(`/api/charts/category-totals?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCategoryData(data))
      .catch(() => setCategoryData([]))
      .finally(() => setCategoryLoading(false));
  }, [selectedGroup, filterState]);

  const handleFiltersChange = useCallback((f: FilterValues) => {
    setFilterState({
      from: f.from,
      to: f.to,
      travellers: f.travellers,
    });
    // Reset selection and total when filters change so stale data is not shown
    setSelectedGroup(null);
    setTotalSpend(null);
  }, []);

  return (
    <div className="bg-white rounded-3xl border border-white/10 shadow-2xl overflow-hidden">
      <DashboardTabBar activeView="trip" onSwitch={onSwitchView} />
      <div className="p-8 space-y-6">
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
          <Filters meta={meta} onChange={handleFiltersChange} showGroupType={false} />
        </div>

        <div className="relative space-y-6">
          {/* Total spend */}
          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total spent</p>
            <p className="text-3xl font-bold text-slate-900">
              {totalSpend === null ? "—" : formatCurrency(totalSpend, currency, 2)}
            </p>
          </div>

          <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
            <CountrySummaryTable
              filters={filterState}
              onSelect={setSelectedGroup}
              selectedGroupId={selectedGroup?.id ?? null}
              currency={currency}
              onTotalChange={setTotalSpend}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <CountryCategoryTable
                tripName={selectedGroup?.name ?? null}
                filters={filterState}
                data={categoryData}
                loading={categoryLoading}
                currency={currency}
              />
            </div>
            <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
                Category breakdown
              </h2>
              <CategoryPieChart
                data={categoryData}
                currency={currency}
                loading={categoryLoading}
              />
            </div>
          </div>

          {overlayState !== "hidden" && (
            <div
              className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none ${
                overlayState === "visible" ? "opacity-100" : "opacity-0"
              }`}
            >
              <CountryDashboardSkeleton />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
