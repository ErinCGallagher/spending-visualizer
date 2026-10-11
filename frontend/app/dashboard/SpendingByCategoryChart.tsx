/**
 * Full-width bar chart showing budgeted vs. actual spend per category, with
 * a clickable legend to toggle individual categories out of view (e.g. to
 * exclude a one-off large category like Rent).
 */

"use client";

import { useState } from "react";
import { formatAmount, formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-utils";
import type { CategoryBudgetActual } from "@/lib/budgetStats";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: CategoryBudgetActual[];
  currency: string;
}

export default function SpendingByCategoryChart({ data, currency }: Props) {
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const toggleCategory = (categoryId: string) => {
    setHiddenIds((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
        Spending by Category
      </h2>

      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
              <BarChart data={data.filter((d) => !hiddenIds.has(d.categoryId))}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(val: number) => formatAmount(val, currency)}
                  width={70}
                />
                <Tooltip formatter={(value) => formatCurrency(Number(value), currency, 0)} />
                <Bar dataKey="budgeted" name="Budgeted" fill={CHART_COLORS[0]} />
                <Bar dataKey="actual" name="Actual" fill={CHART_COLORS[1]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {data.map((d) => {
              const isHidden = hiddenIds.has(d.categoryId);
              return (
                <button
                  key={d.categoryId}
                  type="button"
                  onClick={() => toggleCategory(d.categoryId)}
                  aria-pressed={!isHidden}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    isHidden
                      ? "border-slate-200 text-slate-300 line-through"
                      : "border-slate-300 text-slate-700 hover:border-slate-400"
                  }`}
                >
                  {d.categoryName}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
