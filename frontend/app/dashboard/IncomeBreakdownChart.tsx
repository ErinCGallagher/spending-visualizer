/**
 * Half-width pie chart showing actual income broken down by category, plus
 * a Pension slice, mirroring the Spending Breakdown pie chart.
 */

"use client";

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-utils";
import type { IncomeBreakdownRow } from "@/lib/budgetStats";

interface Props {
  data: IncomeBreakdownRow[];
  pensionTotal: number;
  currency: string;
}

export default function IncomeBreakdownChart({ data, pensionTotal, currency }: Props) {
  const slices: IncomeBreakdownRow[] =
    pensionTotal > 0 ? [...data, { categoryId: "pension", categoryName: "Pension", amount: pensionTotal }] : data;

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
        Income breakdown
      </h2>

      {slices.length === 0 ? (
        <div className="h-64 flex items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
            <PieChart>
              <Pie
                data={slices}
                dataKey="amount"
                nameKey="categoryName"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={false}
              >
                {slices.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value) => formatCurrency(Number(value), currency, 0)}
                labelFormatter={(label) => String(label ?? "")}
              />
              <Legend
                formatter={(value: string) => <span className="text-xs text-gray-700">{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
