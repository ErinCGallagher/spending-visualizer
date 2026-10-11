/**
 * Table showing actual income per category, plus pension contributions, for
 * the selected period. Styled like the configure budget screen's table, with
 * a Total footer row.
 */

"use client";

import { formatAmount } from "@/lib/format";
import type { IncomeBreakdownRow } from "@/lib/budgetStats";

interface Props {
  data: IncomeBreakdownRow[];
  pensionTotal: number;
  currency: string;
}

export default function IncomeBreakdownTable({ data, pensionTotal, currency }: Props) {
  if (data.length === 0 && pensionTotal === 0) {
    return (
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Income breakdown by Category
        </h2>
        <p className="text-sm text-gray-400">No data</p>
      </div>
    );
  }

  const total = data.reduce((sum, row) => sum + row.amount, 0) + pensionTotal;

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
        Income breakdown by Category
      </h2>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 divide-x divide-gray-200">
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr key={row.categoryId} className="border-t border-gray-200 divide-x divide-gray-200">
                <td className="py-2 px-3 text-gray-900">{row.categoryName}</td>
                <td className="py-2 px-3 text-right text-gray-900">{formatAmount(row.amount, currency)}</td>
              </tr>
            ))}
            {pensionTotal > 0 && (
              <tr className="border-t border-gray-200 divide-x divide-gray-200">
                <td className="py-2 px-3 text-gray-900">Pension</td>
                <td className="py-2 px-3 text-right text-gray-900">{formatAmount(pensionTotal, currency)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 divide-x divide-gray-200">
              <td className="py-2 px-3 font-semibold text-gray-900">Total</td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">{formatAmount(total, currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
