/**
 * Filter bar for the transactions page — date range, category, group, and group type.
 */

"use client";

interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  dateRange: { from: string; to: string } | null;
  groups: { id: string; name: string; groupType: string }[];
}

interface Props {
  meta: Meta | null;
  from: string;
  to: string;
  category: string;
  group: string;
  groupType: string;
  onChange: (
    from: string,
    to: string,
    category: string,
    group: string,
    groupType: string
  ) => void;
}

export default function TransactionFilters({
  meta,
  from,
  to,
  category,
  group,
  groupType,
  onChange,
}: Props) {
  return (
    <div className="bg-gray-50 rounded-lg border border-gray-100 px-4 py-3 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 text-sm">
        <input
          type="date"
          value={from}
          onChange={(e) => onChange(e.target.value, to, category, group, groupType)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
        <span className="text-gray-400">—</span>
        <input
          type="date"
          value={to}
          onChange={(e) => onChange(from, e.target.value, category, group, groupType)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        />
      </div>

      <select
        value={category}
        onChange={(e) => onChange(from, to, e.target.value, group, groupType)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All categories</option>
        {(meta?.categories ?? []).map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>

      <select
        value={group}
        onChange={(e) => onChange(from, to, category, e.target.value, groupType)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All groups</option>
        {(meta?.groups ?? []).map((g) => (
          <option key={g.id} value={g.id}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        value={groupType}
        onChange={(e) => onChange(from, to, category, group, e.target.value)}
        className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
      >
        <option value="">All group types</option>
        {Array.from(new Set((meta?.groups ?? []).map((g) => g.groupType))).map((t) => (
          <option key={t} value={t}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </option>
        ))}
      </select>
    </div>
  );
}
