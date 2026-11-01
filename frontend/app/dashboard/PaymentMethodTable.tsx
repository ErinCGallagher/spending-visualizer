/**
 * Table of total spent per payment method for the dashboard overview.
 * Rows render in the order given; the backend sorts largest first.
 */

"use client";

import { formatCurrency } from "@/lib/format";
import { SkeletonRows } from "@/app/components/ui/LoadingSkeleton";

export interface PaymentMethodTotal {
  paymentMethod: string;
  total: number;
}

interface Props {
  data: PaymentMethodTotal[];
  currency: string;
  loading: boolean;
}

export default function PaymentMethodTable({ data, currency, loading }: Props) {
  if (!loading && data.length === 0) {
    return <p className="text-sm text-gray-400">No data</p>;
  }

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs font-semibold tracking-widest text-gray-400 uppercase border-b border-gray-200">
          <th className="py-2 pr-4">Payment method</th>
          <th className="py-2 text-right">Total spent</th>
        </tr>
      </thead>
      <tbody>
        {loading ? (
          <SkeletonRows count={3} columns={2} />
        ) : (
          data.map((row) => (
            <tr key={row.paymentMethod} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 text-gray-700">{row.paymentMethod}</td>
              <td className="py-2 text-right font-medium text-gray-900">
                {formatCurrency(row.total, currency, 2)}
              </td>
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}
