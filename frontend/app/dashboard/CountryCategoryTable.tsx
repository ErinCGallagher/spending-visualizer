/**
 * Table showing per-category spending totals for a selected country.
 * Data is provided by the parent — this component does not fetch.
 */

"use client";

import { formatCurrency } from "@/lib/format";
import { type CategoryTotal } from "@/app/dashboard/CategoryPieChart";
import { SkeletonRows } from "@/app/components/ui/LoadingSkeleton";

interface Props {
  tripName: string | null;
  filters: { from: string; to: string; travellers: string[] };
  data: CategoryTotal[];
  loading: boolean;
  currency: string;
}

export default function CountryCategoryTable({
  tripName,
  data,
  loading,
  currency,
}: Props) {
  return (
    <div>
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
        {tripName ? `Categories — ${tripName}` : "Category breakdown"}
      </h2>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
            <th className="pb-2">Category</th>
            <th className="pb-2 text-right">Total Spent</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows count={3} />
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={2} className="py-8 text-center text-sm text-slate-400">
                No data
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row.category}
                className="border-b border-slate-100 last:border-0"
              >
                <td className="py-2 pr-4 font-semibold text-slate-900">
                  {row.category}
                </td>
                <td className="py-2 text-right text-slate-600">
                  {formatCurrency(row.total, currency, 2)}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
