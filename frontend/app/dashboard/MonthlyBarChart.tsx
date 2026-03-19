/**
 * Bar chart showing spending per month, with optional category breakdown.
 * Supports "stacked" and "grouped" display modes.
 */

"use client";

import { useState } from "react";
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

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pivots the flat array from the API into the shape Recharts expects:
 * one object per month, with a key per category.
 */
function pivotData(data: MonthlyTotal[]): {
  pivoted: Record<string, number | string>[];
  categories: string[];
} {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(
    new Set(data.filter((d) => d.category).map((d) => d.category as string))
  );

  if (categories.length === 0) {
    // Ungrouped — single bar per month
    const pivoted = months.map((month) => {
      const row: Record<string, number | string> = { month };
      const match = data.find((d) => d.month === month);
      row["Total"] = match?.total ?? 0;
      return row;
    });
    return { pivoted, categories: ["Total"] };
  }

  const pivoted = months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const cat of categories) {
      const match = data.find((d) => d.month === month && d.category === cat);
      row[cat] = match?.total ?? 0;
    }
    return row;
  });

  return { pivoted, categories };
}

export default function MonthlyBarChart({
  data,
  currency,
  loading,
  onGroupByChange,
  groupBy,
}: Props) {
  const [display, setDisplay] = useState<"stacked" | "grouped">("stacked");

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-56 bg-gray-100 rounded animate-pulse" />
      </div>
    );
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
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={pivoted}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={(val: string) => val.slice(0, 7)}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(val: number) =>
                  formatCurrency(val, currency).replace(/\.00$/, "")
                }
                width={70}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency)}
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
                  fill={COLORS[i % COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
