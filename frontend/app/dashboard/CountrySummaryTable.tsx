/**
 * Table showing per-trip spending totals, days, and daily average.
 * Fetches from /api/charts/trip-totals with date and traveller filters applied.
 */

"use client";

import { useEffect, useState } from "react";
import { getSpendBand } from "./spendCategoryConfig";

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

function formatCurrency(value: number, currency: string, decimals = 2) {
  return `${new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)} ${currency}`;
}

export default function CountrySummaryTable({
  filters,
  onSelect,
  selectedGroupId,
  currency,
}: Props) {
  const [data, setData] = useState<TripTotal[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    for (const t of filters.travellers) params.append("traveller", t);

    fetch(`/api/charts/trip-totals?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, [filters]);

  function handleRowClick(row: TripTotal) {
    const isSelected = selectedGroupId === row.groupId;
    onSelect(isSelected ? null : { id: row.groupId, name: row.tripName });
  }

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">Spending by trip</h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">Trip</th>
            <th className="pb-2 font-medium text-right">Total Spent</th>
            <th className="pb-2 font-medium text-right">Days</th>
            <th className="pb-2 font-medium text-right">Spent/Day</th>
            <th className="pb-2 font-medium text-right">Category</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className="py-2 pr-4">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-24" />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-20 ml-auto" />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-8 ml-auto" />
                  </td>
                  <td className="py-2 pr-4">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-20 ml-auto" />
                  </td>
                  <td className="py-2">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-16 ml-auto" />
                  </td>
                </tr>
              ))}
            </>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={5} className="py-8 text-center text-sm text-gray-400">
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
                  className={`cursor-pointer border-b border-gray-100 last:border-0 hover:bg-gray-50 ${
                    selectedGroupId === row.groupId ? "bg-blue-50" : ""
                  }`}
                >
                  <td className="py-2 pr-4 font-medium text-gray-900">{row.tripName}</td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatCurrency(row.total, currency)}
                  </td>
                  <td className="py-2 pr-4 text-right text-gray-700">{row.days}</td>
                  <td className="py-2 pr-4 text-right text-gray-700">
                    {formatCurrency(row.perDay, currency)}
                  </td>
                  <td className="py-2 text-right">
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
  );
}
