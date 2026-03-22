/**
 * Bar chart showing spending per month, with optional category breakdown.
 * Supports "stacked" and "grouped" display modes.
 */

"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { formatAmount, formatCurrency } from "@/lib/format";
import { CHART_COLORS, pivotData } from "@/lib/chart-utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { SkeletonChart } from "@/app/components/ui/LoadingSkeleton";

export interface MonthlyTotal {
  month: string;
  category?: string;
  total: number;
}

interface Props {
  data: MonthlyTotal[];
  currency: string;
  loading: boolean;
  onGroupByChange: (groupBy: "category" | "total") => void;
  groupBy: "category" | "total";
}

export default function MonthlyBarChart({
  data,
  currency,
  loading,
  onGroupByChange,
  groupBy,
}: Props) {
  const [display, setDisplay] = useState<"stacked" | "grouped">("stacked");
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (loading || !mounted) {
    return <SkeletonChart />;
  }

  const { pivoted, categories } = pivotData(data);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Group by</span>
          <button
            onClick={() => onGroupByChange("category")}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === "category"
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Category
          </button>
          <button
            onClick={() => onGroupByChange("total")}
            className={`px-2 py-1 text-xs rounded ${
              groupBy === "total"
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            Total
          </button>
        </div>

        {groupBy === "category" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Display</span>
            <button
              onClick={() => setDisplay("stacked")}
              className={`px-2 py-1 text-xs rounded ${
                display === "stacked"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Stacked
            </button>
            <button
              onClick={() => setDisplay("grouped")}
              className={`px-2 py-1 text-xs rounded ${
                display === "grouped"
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              Grouped
            </button>
          </div>
        )}
      </div>

      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">
          No data
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%" minWidth={0}>
            <BarChart data={pivoted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(val: string) => {
                  try { return format(parseISO(val + "-01"), "MMM yyyy"); } catch { return val; }
                }}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(val: number) => formatAmount(val, currency)}
                width={70}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency, 0)}
              />
              <Legend
                formatter={(value: string) => (
                  <span className="text-xs text-gray-700">{value}</span>
                )}
              />
              {categories.map((cat, i) => (
                <Bar
                  key={cat}
                  dataKey={cat}
                  stackId={display === "stacked" ? "a" : undefined}
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
