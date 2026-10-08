/**
 * Bar chart showing actual spend per category per month, with a reference
 * line marking the total monthly budget.
 */

"use client";

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
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";

export interface BudgetMonthlyActual {
  month: string;
  categoryName: string;
  actual: number;
}

interface Props {
  data: BudgetMonthlyActual[];
  totalMonthlyBudget: number;
  currency: string;
}

export default function BudgetBarChart({ data, totalMonthlyBudget, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  const { pivoted, categories } = pivotData(
    data.map((d) => ({ month: d.month, category: d.categoryName, total: d.actual }))
  );

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
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
          <Tooltip formatter={(value) => formatCurrency(Number(value), currency, 0)} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-700">{value}</span>
            )}
          />
          {categories.map((cat, i) => (
            <Bar key={cat} dataKey={cat} stackId="a" fill={CHART_COLORS[i % CHART_COLORS.length]} />
          ))}
          <ReferenceLine
            y={totalMonthlyBudget}
            stroke="#ef4444"
            strokeDasharray="4 4"
            label={{ value: "Budget", position: "right", fontSize: 11, fill: "#ef4444" }}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
