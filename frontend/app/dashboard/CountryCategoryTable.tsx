/**
 * Table showing per-category spending totals for a selected country.
 * Data is provided by the parent — this component does not fetch.
 */

"use client";

import { type CategoryTotal } from "@/app/dashboard/CategoryPieChart";

interface Props {
  country: string | null;
  filters: { from: string; to: string; travellers: string[] };
  data: CategoryTotal[];
  loading: boolean;
  currency: string;
}

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CountryCategoryTable({
  country,
  data,
  loading,
  currency,
}: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-700 mb-4">
        {country ? `Categories — ${country}` : "Category breakdown"}
      </h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
            <th className="pb-2 font-medium">Category</th>
            <th className="pb-2 font-medium text-right">Total Spent</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <>
              {[0, 1, 2].map((i) => (
                <tr key={i}>
                  <td className="py-2 pr-4">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-28" />
                  </td>
                  <td className="py-2">
                    <div className="animate-pulse h-4 bg-gray-100 rounded w-20 ml-auto" />
                  </td>
                </tr>
              ))}
            </>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-8 text-center text-sm text-gray-400">
                No data
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.category}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="py-2 pr-4 font-medium text-gray-900">
                  {row.category}
                </td>
                <td className="py-2 text-right text-gray-700">
                  {formatCurrency(row.total, currency)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
