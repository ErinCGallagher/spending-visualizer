/**
 * Step 5 of the upload wizard — assign transactions to one or two groups.
 * All transactions default to the primary group; individual rows can be moved
 * to a secondary group by unchecking them.
 */

"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Group, GroupType, ParsedTransaction } from "./types";

const GROUP_TYPES: GroupType[] = ["trip", "daily", "business"];

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  trip: "Trip",
  daily: "Daily Living",
  business: "Business",
};

function formatAmount(amount: number, currency: string | null) {
  try {
    return new Intl.NumberFormat("en-CA", {
      style: currency ? "currency" : "decimal",
      currency: currency ?? undefined,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return amount.toFixed(2);
  }
}

interface GroupPicker {
  type: GroupType | null;
  existingId: string | null;
  newName: string;
}

function emptyPicker(): GroupPicker {
  return { type: null, existingId: null, newName: "" };
}

interface Props {
  transactions: ParsedTransaction[];
  onBack: () => void;
  onContinue: (
    transactions: ParsedTransaction[],
    primaryGroup: { id: string; name: string; groupType: GroupType }
  ) => void;
}

export default function StepGroup({ transactions, onBack, onContinue }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [primary, setPrimary] = useState<GroupPicker>(emptyPicker());
  const [secondary, setSecondary] = useState<GroupPicker>(emptyPicker());
  const [primarySet, setPrimarySet] = useState<Set<number>>(
    () => new Set(transactions.map((_, i) => i))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/groups", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setGroups(data.groups ?? []))
      .catch(() => {})
      .finally(() => setLoadingGroups(false));
  }, []);

  const hasSecondary = primarySet.size < transactions.length;
  const uncheckedCount = transactions.length - primarySet.size;

  function toggleRow(i: number) {
    setPrimarySet((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  function selectAll() {
    setPrimarySet(new Set(transactions.map((_, i) => i)));
  }

  function deselectAll() {
    setPrimarySet(new Set());
  }

  function groupsOfType(type: GroupType | null): Group[] {
    return type ? groups.filter((g) => g.groupType === type) : [];
  }

  async function resolveGroup(
    picker: GroupPicker
  ): Promise<{ id: string; name: string; groupType: GroupType }> {
    if (picker.existingId) {
      const found = groups.find((g) => g.id === picker.existingId);
      if (found) return { id: found.id, name: found.name, groupType: found.groupType };
    }
    const res = await fetch("/api/groups", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: picker.newName.trim(), groupType: picker.type }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error ?? "Failed to create group");
    }
    return res.json();
  }

  function validate(): string | null {
    if (!primary.type) return "Select a group type";
    if (!primary.existingId && !primary.newName.trim())
      return "Select an existing group or enter a name for a new one";
    if (hasSecondary) {
      if (!secondary.type) return "Select a type for the unchecked transactions";
      if (!secondary.existingId && !secondary.newName.trim())
        return "Select or name the group for unchecked transactions";
    }
    return null;
  }

  async function handleContinue() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const primaryGroup = await resolveGroup(primary);
      let secondaryId: string | null = null;
      if (hasSecondary) {
        const secondaryGroup = await resolveGroup(secondary);
        secondaryId = secondaryGroup.id;
      }

      const updated = transactions.map((t, i) => ({
        ...t,
        groupId: primarySet.has(i) ? primaryGroup.id : secondaryId!,
      }));

      onContinue(updated, primaryGroup);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  const allChecked = primarySet.size === transactions.length;
  const primaryTypeGroups = groupsOfType(primary.type);
  const secondaryTypeGroups = groupsOfType(secondary.type);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Assign to a group</h2>
        <p className="text-sm text-gray-500">
          Group these transactions so they appear in the right dashboard.
        </p>
      </div>

      {/* Primary group picker */}
      <div className="space-y-3">
        <p className="text-sm font-medium text-gray-700">Group type</p>
        <div className="flex gap-2 flex-wrap">
          {GROUP_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setPrimary({ type, existingId: null, newName: "" })}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                primary.type === type
                  ? "bg-emerald-800 text-white border-emerald-800"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {GROUP_TYPE_LABELS[type]}
            </button>
          ))}
        </div>

        {primary.type && (
          <div className="flex flex-wrap items-center gap-3">
            {!loadingGroups && primaryTypeGroups.length > 0 && (
              <>
                <select
                  value={primary.existingId ?? ""}
                  onChange={(e) =>
                    setPrimary({
                      ...primary,
                      existingId: e.target.value || null,
                      newName: e.target.value ? "" : primary.newName,
                    })
                  }
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                >
                  <option value="">Add to existing…</option>
                  {primaryTypeGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
                <span className="text-xs text-gray-400">or</span>
              </>
            )}
            <input
              type="text"
              placeholder={`New ${GROUP_TYPE_LABELS[primary.type].toLowerCase()} name`}
              value={primary.newName}
              onChange={(e) =>
                setPrimary({
                  ...primary,
                  newName: e.target.value,
                  existingId: e.target.value ? null : primary.existingId,
                })
              }
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>
        )}
      </div>

      {/* Transaction table */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-600">
            {primarySet.size} of {transactions.length} transaction
            {transactions.length !== 1 ? "s" : ""} in primary group
          </p>
          <div className="flex gap-3">
            <button onClick={selectAll} className="text-xs text-emerald-700 hover:underline">
              Select all
            </button>
            <button onClick={deselectAll} className="text-xs text-gray-400 hover:underline">
              Deselect all
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white border-b border-gray-200">
                <tr className="text-left text-xs font-semibold tracking-widest text-gray-400 uppercase">
                  <th className="py-2 pl-3 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={allChecked}
                      onChange={() => (allChecked ? deselectAll() : selectAll())}
                      className="rounded"
                    />
                  </th>
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, i) => (
                  <tr
                    key={i}
                    className={`border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 ${
                      !primarySet.has(i) ? "text-gray-400" : ""
                    }`}
                    onClick={() => toggleRow(i)}
                  >
                    <td className="py-2 pl-3 pr-2">
                      <input
                        type="checkbox"
                        checked={primarySet.has(i)}
                        onChange={() => toggleRow(i)}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2 pr-4 whitespace-nowrap">{formatDate(t.date)}</td>
                    <td className="py-2 pr-4">{t.description}</td>
                    <td className="py-2 pr-3 text-right whitespace-nowrap">
                      {formatAmount(t.amountHome, t.localCurrency ?? null)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Secondary group picker — appears when rows are unchecked */}
      {hasSecondary && (
        <div className="border-t border-gray-100 pt-5 space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Assign {uncheckedCount} unchecked transaction
            {uncheckedCount !== 1 ? "s" : ""} to:
          </p>
          <div className="flex gap-2 flex-wrap">
            {GROUP_TYPES.map((type) => (
              <button
                key={type}
                onClick={() => setSecondary({ type, existingId: null, newName: "" })}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  secondary.type === type
                    ? "bg-emerald-800 text-white border-emerald-800"
                    : "border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
              >
                {GROUP_TYPE_LABELS[type]}
              </button>
            ))}
          </div>

          {secondary.type && (
            <div className="flex flex-wrap items-center gap-3">
              {!loadingGroups && secondaryTypeGroups.length > 0 && (
                <>
                  <select
                    value={secondary.existingId ?? ""}
                    onChange={(e) =>
                      setSecondary({
                        ...secondary,
                        existingId: e.target.value || null,
                        newName: e.target.value ? "" : secondary.newName,
                      })
                    }
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  >
                    <option value="">Add to existing…</option>
                    {secondaryTypeGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-gray-400">or</span>
                </>
              )}
              <input
                type="text"
                placeholder={`New ${GROUP_TYPE_LABELS[secondary.type].toLowerCase()} name`}
                value={secondary.newName}
                onChange={(e) =>
                  setSecondary({
                    ...secondary,
                    newName: e.target.value,
                    existingId: e.target.value ? null : secondary.existingId,
                  })
                }
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={saving}
          className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={saving}
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
