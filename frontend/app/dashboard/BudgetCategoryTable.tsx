/**
 * Table showing YTD budgeted vs. actual spend broken down by parent and
 * child category, below the budget chart.
 */

"use client";

import { formatAmount } from "@/lib/format";
import { groupCategoryBreakdown, type CategoryBudgetActual } from "@/lib/budgetStats";

interface Props {
  data: CategoryBudgetActual[];
  currency: string;
}

export default function BudgetCategoryTable({ data, currency }: Props) {
  if (data.length === 0) {
    return null;
  }

  const groups = groupCategoryBreakdown(data);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
          <th className="py-2">Category</th>
          <th className="py-2 text-right">Budgeted</th>
          <th className="py-2 text-right">Actual</th>
        </tr>
      </thead>
      <tbody>
        {groups.map((group) => (
          <CategoryGroupRows key={group.key} group={group} currency={currency} />
        ))}
      </tbody>
    </table>
  );
}

function CategoryGroupRows({
  group,
  currency,
}: {
  group: ReturnType<typeof groupCategoryBreakdown>[number];
  currency: string;
}) {
  const hasChildren = group.children.some((c) => c.parentId === group.key);

  return (
    <>
      <tr className="border-b border-slate-50">
        <td className="py-2 font-medium text-gray-900">{group.label}</td>
        <td className="py-2 text-right font-medium text-gray-900">
          {formatAmount(group.budgeted, currency)}
        </td>
        <td className="py-2 text-right font-medium text-gray-900">
          {formatAmount(group.actual, currency)}
        </td>
      </tr>
      {hasChildren &&
        group.children.map((child) => (
          <tr key={child.categoryId} className="border-b border-slate-50">
            <td className="py-2 pl-6 text-gray-500">{child.categoryName}</td>
            <td className="py-2 text-right text-gray-500">{formatAmount(child.budgeted, currency)}</td>
            <td className="py-2 text-right text-gray-500">{formatAmount(child.actual, currency)}</td>
          </tr>
        ))}
    </>
  );
}
