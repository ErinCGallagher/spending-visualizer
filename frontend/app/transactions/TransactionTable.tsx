/**
 * Renders the transactions table with pagination controls.
 * Displays a loading overlay while data is being fetched.
 */

"use client";

import { formatDate } from "@/lib/format";

interface Transaction {
  id: string;
  date: string;
  description: string;
  amountHome: number;
  localCurrency: string | null;
  homeCurrency: string | null;
  categoryName: string | null;
  payer: string | null;
  groupName: string | null;
  groupType: string | null;
}

export interface TransactionsResponse {
  transactions: Transaction[];
  total: number;
  page: number;
  limit: number;
}

interface Props {
  data: TransactionsResponse | null;
  loading: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

function formatAmount(amount: number) {
  return amount.toLocaleString("en-CA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TransactionTable({
  data,
  loading,
  page,
  totalPages,
  onPageChange,
}: Props) {
  return (
    <div className="relative min-h-[480px]">
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
        </div>
      )}
      {!loading && (!data || data.transactions.length === 0) ? (
        <div className="flex items-center justify-center py-16">
          <p className="text-sm text-gray-400">No transactions found.</p>
        </div>
      ) : data ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Description
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Category
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase text-right">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Payer
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Group
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold tracking-widest text-gray-400 uppercase">
                    Type
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {formatDate(t.date)}
                    </td>
                    <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                      {t.description}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.categoryName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-900 text-right whitespace-nowrap font-medium">
                      {formatAmount(t.amountHome)}
                      {t.homeCurrency ? ` ${t.homeCurrency}` : ""}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.payer ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.groupName ?? <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {t.groupType ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              {data.total.toLocaleString()} transaction
              {data.total !== 1 ? "s" : ""}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onPageChange(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => onPageChange(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
