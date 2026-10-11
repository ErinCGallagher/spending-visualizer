/**
 * Table showing budgeted vs. actual spend broken down by parent and child
 * category (including a "Not in budget" row), styled like the configure
 * budget screen's table, with a Total footer row.
 */

"use client";

import { formatAmount } from "@/lib/format";
import type { CategoryGroup } from "@/lib/budgetStats";

interface Props {
  data: CategoryGroup[];
  currency: string;
}

export default function BudgetCategoryTable({ data, currency }: Props) {
  if (data.length === 0) {
    return (
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
          Spending Breakdown by Category
        </h2>
        <p className="text-sm text-gray-400">No data</p>
      </div>
    );
  }

  const totalBudgeted = data.reduce((sum, group) => sum + group.budgeted, 0);
  const totalActual = data.reduce((sum, group) => sum + group.actual, 0);

  return (
    <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-6">
        Spending Breakdown by Category
      </h2>
      <div className="border border-gray-300 rounded-lg overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wide bg-gray-50 divide-x divide-gray-200">
              <th className="py-2 px-3">Category</th>
              <th className="py-2 px-3 text-right">Budgeted</th>
              <th className="py-2 px-3 text-right">Actual</th>
            </tr>
          </thead>
          <tbody>
            {data.map((group) => (
              <CategoryGroupRows key={group.key} group={group} currency={currency} />
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-gray-300 divide-x divide-gray-200">
              <td className="py-2 px-3 font-semibold text-gray-900">Total</td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                {formatAmount(totalBudgeted, currency)}
              </td>
              <td className="py-2 px-3 text-right font-semibold text-gray-900">
                {formatAmount(totalActual, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function CategoryGroupRows({ group, currency }: { group: CategoryGroup; currency: string }) {
  const hasChildren = group.children.some((c) => c.parentId === group.key);

  return (
    <>
      <tr className="border-t border-gray-200 divide-x divide-gray-200">
        <td className="py-2 px-3 font-semibold text-gray-900">{group.label}</td>
        <td className="py-2 px-3 text-right font-semibold text-gray-700">
          {formatAmount(group.budgeted, currency)}
        </td>
        <td className="py-2 px-3 text-right font-semibold text-gray-700">
          {formatAmount(group.actual, currency)}
        </td>
      </tr>
      {hasChildren &&
        group.children.map((child) => (
          <tr key={child.categoryId} className="border-t border-gray-100 divide-x divide-gray-200">
            <td className="py-2 pl-6 pr-3 text-gray-500">{child.categoryName}</td>
            <td className="py-2 px-3 text-right text-gray-500">{formatAmount(child.budgeted, currency)}</td>
            <td className="py-2 px-3 text-right text-gray-500">{formatAmount(child.actual, currency)}</td>
          </tr>
        ))}
    </>
  );
}
