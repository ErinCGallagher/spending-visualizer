/**
 * Line chart showing cumulative spending over time.
 * Supports day / week / month granularity, passed as a query param.
 */

"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

export interface CumulativePoint {
  date: string;
  runningTotal: number;
}

export type Granularity = "day" | "week" | "month";

interface Props {
  data: CumulativePoint[];
  currency: string;
  loading: boolean;
  granularity: Granularity;
  onGranularityChange: (g: Granularity) => void;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(iso: string, granularity: Granularity) {
  try {
    const d = parseISO(iso);
    if (granularity === "month") return format(d, "MMM yyyy");
    if (granularity === "week") return format(d, "MMM d");
    return format(d, "MMM d");
  } catch {
    return iso;
  }
}

export default function CumulativeLineChart({
  data,
  currency,
  loading,
  granularity,
  onGranularityChange,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        <div className="h-4 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="h-56 bg-gray-100 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
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

      {data.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-sm text-gray-400">
          No data
        </div>
      ) : (
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11 }}
                tickFormatter={(val: string) =>
                  formatDateLabel(val, granularity)
                }
                // Reduce tick density for larger datasets
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
                labelFormatter={(label) =>
                  formatDateLabel(String(label ?? ""), granularity)
                }
                formatter={(value) => [
                  formatCurrency(Number(value), currency),
                  "Running total",
                ]}
              />
              <Line
                type="monotone"
                dataKey="runningTotal"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
