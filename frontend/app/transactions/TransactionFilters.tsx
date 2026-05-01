/**
 * Filter bar for the transactions page — search input, collapsible filter panel
 * with date range, category, payer, group, and group type dropdowns.
 */

"use client";

import { useState } from "react";
import { Search, Filter, X } from "lucide-react";

interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  dateRange: { from: string; to: string } | null;
  groups: { id: string; name: string; groupType: string }[];
  groupTypes: { value: string; label: string }[];
}

interface Props {
  meta: Meta | null;
  from: string;
  to: string;
  category: string;
  group: string;
  groupType: string;
  payer: string;
  search: string;
  onChange: (
    from: string,
    to: string,
    category: string,
    group: string,
    groupType: string,
    payer: string,
    search: string
  ) => void;
}

export default function TransactionFilters({
  meta,
  from,
  to,
  category,
  group,
  groupType,
  payer,
  search,
  onChange,
}: Props) {
  const [showFilters, setShowFilters] = useState(false);

  const hasActiveFilters =
    from !== "" ||
    to !== "" ||
    category !== "" ||
    group !== "" ||
    groupType !== "" ||
    payer !== "" ||
    search !== "";

  function resetFilters() {
    onChange("", "", "", "", "", "", "");
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters toggle row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search transactions..."
            value={search}
            onChange={(e) =>
              onChange(from, to, category, group, groupType, payer, e.target.value)
            }
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 text-slate-900"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-xl text-sm font-medium transition-all ${
            showFilters || hasActiveFilters
              ? "bg-brand-primary/5 border-brand-primary text-brand-primary"
              : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          <Filter className="w-4 h-4" />
          Filters
          {hasActiveFilters && (
            <span className="w-2 h-2 rounded-full bg-brand-primary" />
          )}
        </button>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              From
            </label>
            <input
              type="date"
              value={from}
              onChange={(e) =>
                onChange(e.target.value, to, category, group, groupType, payer, search)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              To
            </label>
            <input
              type="date"
              value={to}
              onChange={(e) =>
                onChange(from, e.target.value, category, group, groupType, payer, search)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) =>
                onChange(from, to, e.target.value, group, groupType, payer, search)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All categories</option>
              {(meta?.categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Payer
            </label>
            <select
              value={payer}
              onChange={(e) =>
                onChange(from, to, category, group, groupType, e.target.value, search)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All payers</option>
              {(meta?.travellers ?? []).map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Group
            </label>
            <select
              value={group}
              onChange={(e) =>
                onChange(from, to, category, e.target.value, groupType, payer, search)
              }
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
            >
              <option value="">All groups</option>
              {(meta?.groups ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Type
            </label>
            <div className="flex items-center gap-2">
              <select
                value={groupType}
                onChange={(e) =>
                  onChange(from, to, category, group, e.target.value, payer, search)
                }
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                <option value="">All types</option>
                {Array.isArray(meta?.groupTypes) && meta.groupTypes.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  title="Reset filters"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
