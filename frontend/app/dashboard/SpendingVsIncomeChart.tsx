/**
 * Full-width bar chart comparing total income against total spending, with
 * the spending bar broken down by category.
 */

"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { formatAmount, formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-utils";
import type { CategoryGroup } from "@/lib/budgetStats";

interface Props {
  income: number;
  spendingGroups: CategoryGroup[];
  currency: string;
}

export default function SpendingVsIncomeChart({ income, spendingGroups, currency }: Props) {
  const hasData = income > 0 || spendingGroups.some((g) => g.actual > 0);

  const row: Record<string, number | string> = { name: "This period", Income: income };
  for (const group of spendingGroups) {
    row[group.label] = group.actual;
  }

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
        Spending vs Income
      </h2>

      {!hasData ? (
        <div className="h-72 flex items-center justify-center text-sm text-gray-400">No data</div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
            <BarChart data={[row]}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis
                tick={{ fontSize: 11 }}
                tickFormatter={(val: number) => formatAmount(val, currency)}
                width={70}
              />
              <Tooltip formatter={(value) => formatCurrency(Number(value), currency, 0)} />
              <Legend formatter={(value: string) => <span className="text-xs text-gray-700">{value}</span>} />
              <Bar dataKey="Income" fill={CHART_COLORS[0]} />
              {spendingGroups.map((group, i) => (
                <Bar
                  key={group.key}
                  dataKey={group.label}
                  name={group.label}
                  stackId="spending"
                  fill={CHART_COLORS[(i + 1) % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
