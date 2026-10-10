/**
 * Bar chart showing YTD budgeted vs. actual spend per category.
 */

"use client";

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
  Legend,
  ResponsiveContainer,
} from "recharts";

interface Props {
  data: CategoryBudgetActual[];
  currency: string;
}

export default function BudgetBarChart({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="categoryName" tick={{ fontSize: 11 }} />
          <YAxis
            tick={{ fontSize: 11 }}
            tickFormatter={(val: number) => formatAmount(val, currency)}
            width={70}
          />
          <Tooltip formatter={(value) => formatCurrency(Number(value), currency, 0)} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-700">{value}</span>
            )}
          />
          <Bar dataKey="budgeted" name="Budgeted" fill={CHART_COLORS[0]} />
          <Bar dataKey="actual" name="Actual" fill={CHART_COLORS[1]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
