/**
 * Pie chart showing spending broken down by category.
 * Fetches from /api/charts/category-totals with the current filters applied.
 */

"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "@/lib/format";
import { CHART_COLORS } from "@/lib/chart-utils";

export interface CategoryTotal {
  category: string;
  total: number;
}

interface Props {
  data: CategoryTotal[];
  currency: string;
  loading: boolean;
}

export default function CategoryPieChart({ data, currency, loading }: Props) {
  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-pulse w-40 h-40 rounded-full bg-gray-100" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    );
  }

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
        <PieChart>
          <Pie
            data={data}
            dataKey="total"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) =>
              formatCurrency(Number(value), currency, 0)
            }
            labelFormatter={(label) => String(label ?? "")}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs text-gray-700">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
