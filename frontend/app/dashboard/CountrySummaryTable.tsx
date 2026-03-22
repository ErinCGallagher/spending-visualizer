/**
 * Table showing per-trip spending totals, days, and daily average.
 * Fetches from /api/charts/trip-totals with date and traveller filters applied.
 */

"use client";

import { formatCurrency } from "@/lib/format";
import { getSpendBand } from "./spendCategoryConfig";
import { SkeletonRows } from "@/app/components/ui/LoadingSkeleton";
import { useFetch } from "@/app/hooks/useFetch";

interface TripTotal {
  groupId: string;
  tripName: string;
  total: number;
  days: number;
  perDay: number;
}

interface FilterState {
  from: string;
  to: string;
  travellers: string[];
}

interface Props {
  filters: FilterState;
  onSelect: (group: { id: string; name: string } | null) => void;
  selectedGroupId: string | null;
  currency: string;
}

export default function CountrySummaryTable({
  filters,
  onSelect,
  selectedGroupId,
  currency,
}: Props) {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  for (const t of filters.travellers) params.append("traveller", t);

  const { data: rawData, loading } = useFetch<TripTotal[]>(
    `/api/charts/trip-totals?${params}`,
    [filters]
  );
  const data = rawData ?? [];

  function handleRowClick(row: TripTotal) {
    const isSelected = selectedGroupId === row.groupId;
    onSelect(isSelected ? null : { id: row.groupId, name: row.tripName });
  }

  return (
    <div>
      <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
        <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest">Spending by trip</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/30 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">
              <th className="px-6 py-4">Trip</th>
              <th className="px-6 py-4 text-right">Total Spent</th>
              <th className="px-6 py-4 text-right">Days</th>
              <th className="px-6 py-4 text-right">Spent/Day</th>
              <th className="px-6 py-4 text-right">Category</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <SkeletonRows count={3} columns={5} />
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8 text-center text-sm text-slate-400">
                  No data
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const band = getSpendBand(row.perDay);
                return (
                  <tr
                    key={row.groupId}
                    onClick={() => handleRowClick(row)}
                    className={`cursor-pointer hover:bg-slate-50/50 transition-colors ${
                      selectedGroupId === row.groupId ? "bg-blue-50" : ""
                    }`}
                  >
                    <td className="px-6 py-4 font-semibold text-slate-900">{row.tripName}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(row.total, currency, 2)}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-600">{row.days}</td>
                    <td className="px-6 py-4 text-right text-slate-600">
                      {formatCurrency(row.perDay, currency, 2)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${band.badgeClass} ${band.textClass}`}
                      >
                        {band.label}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
