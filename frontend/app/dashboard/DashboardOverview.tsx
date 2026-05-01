/**
 * Overview tab layout — renders the four spending charts in a responsive grid.
 */

"use client";

import { useEffect, useRef, useState } from "react";
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
import { DashboardOverviewSkeleton } from "@/app/components/ui/LoadingSkeleton";
import { formatCurrency } from "@/lib/format";

interface Props {
  categoryData: CategoryTotal[];
  monthlyData: MonthlyTotal[];
  cumulativeData: CumulativePoint[];
  categoryTimelineData: MonthlyTotal[];
  categoryLoading: boolean;
  monthlyLoading: boolean;
  cumulativeLoading: boolean;
  categoryTimelineLoading: boolean;
  currency: string;
  monthlyGroupBy: "category" | "total";
  onMonthlyGroupByChange: (groupBy: "category" | "total") => void;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
  categoryTimelineGranularity: Granularity;
  onCategoryTimelineGranularityChange: (g: Granularity) => void;
}

export default function DashboardOverview({
  categoryData,
  monthlyData,
  cumulativeData,
  categoryTimelineData,
  categoryLoading,
  monthlyLoading,
  cumulativeLoading,
  categoryTimelineLoading,
  currency,
  monthlyGroupBy,
  onMonthlyGroupByChange,
  granularity,
  onGranularityChange,
  categoryTimelineGranularity,
  onCategoryTimelineGranularityChange,
}: Props) {
  const isLoading =
    categoryLoading || monthlyLoading || cumulativeLoading || categoryTimelineLoading;

  const totalSpend = categoryData.reduce((sum, d) => sum + d.total, 0);

  // "visible" → opaque, "fading" → transparent (transition playing), "hidden" → unmounted.
  // Starts "hidden" — only shows when a fetch is actually in progress.
  const [overlayState, setOverlayState] = useState<"visible" | "fading" | "hidden">("hidden");
  // Ref mirrors state to avoid stale closures in the effect.
  const overlayStateRef = useRef<"visible" | "fading" | "hidden">("hidden");

  function setOverlay(next: "visible" | "fading" | "hidden") {
    overlayStateRef.current = next;
    setOverlayState(next);
  }

  useEffect(() => {
    if (isLoading) {
      setOverlay("visible");
    } else if (overlayStateRef.current !== "hidden") {
      setOverlay("fading");
      const timer = setTimeout(() => setOverlay("hidden"), 300);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  return (
    <div className="relative space-y-6">
      {/* Total spend */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Total spent</p>
        <p className="text-3xl font-bold text-slate-900">
          {categoryLoading ? "—" : formatCurrency(totalSpend, currency, 2)}
        </p>
      </div>

      {/* Top row: category breakdown + monthly spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
            Spending by category
          </h2>
          <CategoryPieChart
            data={categoryData}
            currency={currency}
            loading={categoryLoading}
          />
        </div>

        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
            Monthly spending
          </h2>
          <MonthlyBarChart
            data={monthlyData}
            currency={currency}
            loading={monthlyLoading}
            groupBy={monthlyGroupBy}
            onGroupByChange={onMonthlyGroupByChange}
          />
        </div>
      </div>

      {/* Cumulative spending */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Cumulative spending
        </h2>
        <CumulativeLineChart
          data={cumulativeData}
          currency={currency}
          loading={cumulativeLoading}
          granularity={granularity}
          onGranularityChange={onGranularityChange}
        />
      </div>

      {/* Spending by category over time */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Category spending over time
        </h2>
        <CategoryLineChart
          data={categoryTimelineData}
          currency={currency}
          loading={categoryTimelineLoading}
          granularity={categoryTimelineGranularity}
          onGranularityChange={onCategoryTimelineGranularityChange}
        />
      </div>

      {overlayState !== "hidden" && (
        <div
          className={`absolute inset-0 bg-white transition-opacity duration-300 pointer-events-none ${
            overlayState === "visible" ? "opacity-100" : "opacity-0"
          }`}
        >
          <DashboardOverviewSkeleton />
        </div>
      )}
    </div>
  );
}
