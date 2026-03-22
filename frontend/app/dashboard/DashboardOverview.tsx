/**
 * Overview tab layout — renders the four spending charts in a responsive grid.
 */

"use client";

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
  return (
    <div className="space-y-8">
      {/* Top row: category breakdown + monthly spending */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
            Spending by category
          </h2>
          <CategoryPieChart
            data={categoryData}
            currency={currency}
            loading={categoryLoading}
          />
        </div>

        <div>
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
      <div className="pt-8 border-t border-slate-100">
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
      <div className="pt-8 border-t border-slate-100">
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
    </div>
  );
}
