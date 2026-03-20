/**
 * Line chart showing spending per category over time.
 * Clickable category pills let the user show/hide individual categories;
 * the Y-axis rescales automatically when categories are toggled.
 */

"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { MonthlyTotal } from "@/app/dashboard/MonthlyBarChart";
import type { Granularity } from "@/app/dashboard/CumulativeLineChart";

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

export { type Granularity };

interface Props {
  data: MonthlyTotal[];
  currency: string;
  loading: boolean;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
}

function formatDateLabel(val: string, granularity: Granularity): string {
  try {
    // "month" granularity returns YYYY-MM; day/week return YYYY-MM-DD
    const d = val.length === 7 ? parseISO(val + "-01") : parseISO(val);
    return granularity === "month" ? format(d, "MMM yyyy") : format(d, "MMM d, yyyy");
  } catch {
    return val;
  }
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Pivots flat rows into one object per month with a key per category.
 * Returns the pivoted rows and the ordered list of all categories found.
 */
function pivotData(data: MonthlyTotal[]): {
  pivoted: Record<string, number | string>[];
  categories: string[];
} {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(
    new Set(data.filter((d) => d.category).map((d) => d.category as string))
  );

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

export default function CategoryLineChart({ data, currency, loading, granularity, onGranularityChange }: Props) {
  const { pivoted, categories } = pivotData(data);

  // Start with all categories visible; reset when the category list changes.
  const [activeCategories, setActiveCategories] = useState<Set<string>>(
    () => new Set(categories)
  );
  useEffect(() => {
    setActiveCategories(new Set(categories));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories.join(",")]);

  function toggleCategory(cat: string) {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        // Keep at least one category visible
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-56 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Granularity controls */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-500">Granularity</span>
        {(["day", "week", "month"] as Granularity[]).map((g) => (
          <button
            key={g}
            onClick={() => onGranularityChange(g)}
            className={`px-2 py-1 text-xs rounded capitalize ${
              granularity === g
                ? "bg-blue-100 text-blue-700 font-medium"
                : "text-gray-500 hover:bg-gray-100"
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-1.5">
        {categories.map((cat, i) => {
          const color = COLORS[i % COLORS.length];
          const active = activeCategories.has(cat);
          return (
            <button
              key={cat}
              onClick={() => toggleCategory(cat)}
              style={
                active
                  ? { borderColor: color, backgroundColor: color + "1a", color }
                  : undefined
              }
              className={`px-2 py-0.5 text-xs rounded-full border transition-colors ${
                active
                  ? "font-medium"
                  : "border-gray-200 text-gray-400 hover:border-gray-300"
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={pivoted}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11 }}
              tickFormatter={(val: string) => formatDateLabel(val, granularity)}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={(val: number) =>
                formatCurrency(val, currency).replace(/\.00$/, "")
              }
              width={70}
            />
            <Tooltip
              labelFormatter={(label) => formatDateLabel(String(label ?? ""), granularity)}
              formatter={(value, name) => [
                formatCurrency(Number(value), currency),
                name,
              ]}
            />
            {categories.map((cat, i) =>
              activeCategories.has(cat) ? (
                <Line
                  key={cat}
                  type="monotone"
                  dataKey={cat}
                  stroke={COLORS[i % COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
