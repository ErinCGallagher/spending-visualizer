/**
 * Credit card category mappings page — shows how merchant names are
 * automatically mapped to categories.
 */

"use client";

import Link from "next/link";
import { useFetch } from "@/app/hooks/useFetch";
import NavBar from "@/app/components/NavBar";

interface Mapping {
  merchant_key: string;
  category_name: string;
}

export default function CategoryMappingsPage() {
  const { data: mappings, loading, error } = useFetch<Mapping[]>("/api/categories/mappings", []);

  return (
    <main className="min-h-screen">
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "Settings", href: "/settings" },
        ]}
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Breadcrumbs / Header */}
        <div className="space-y-2">
          <Link
            href="/settings"
            className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            Back to settings
          </Link>
          <h1 className="text-2xl font-bold text-white">Credit card categories</h1>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/30">
            <p className="text-gray-600 text-sm leading-relaxed">
              These mappings are created when you upload credit card statements. They help automatically categorise future transactions from the same merchants.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Loading mappings…</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-500">Failed to load mappings.</p>
              </div>
            ) : !mappings || mappings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No mappings found yet. They will appear here after you upload and categorise credit card transactions.</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Merchant / Keyword</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Parent Category</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Sub Category (optional)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mappings.map((mapping) => {
                      const hasParent = mapping.parent_name !== null;
                      const parentDisplay = mapping.parent_name ?? mapping.category_name;
                      const subDisplay = hasParent ? mapping.category_name : null;

                      return (
                        <tr key={mapping.merchant_key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-100">
                            {mapping.merchant_key}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">
                            {parentDisplay}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {subDisplay ?? <span className="text-gray-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
