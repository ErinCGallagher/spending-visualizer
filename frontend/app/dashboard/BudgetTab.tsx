/**
 * Budget tab — first-run group selection, then a placeholder until a budget
 * has been created. The chart and spend/budget stats are added once budgets exist.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export interface BudgetGroupOption {
  id: string;
  name: string;
  groupType: string;
}

interface BudgetSettings {
  groupId: string;
  groupName: string;
  groupType: string;
}

interface Props {
  groups: BudgetGroupOption[];
}

export default function BudgetTab({ groups }: Props) {
  const [settings, setSettings] = useState<BudgetSettings | null | undefined>(undefined);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/budget-settings", { credentials: "include" })
      .then((r) => r.json())
      .then((data: BudgetSettings | null) => setSettings(data))
      .catch(() => setSettings(null));
  }, []);

  async function handleSelectGroup() {
    if (!selectedGroupId) {
      setError("Select a group");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/budget-settings", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: selectedGroupId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to save budget settings");
      }
      const group = groups.find((g) => g.id === selectedGroupId);
      if (group) {
        setSettings({ groupId: group.id, groupName: group.name, groupType: group.groupType });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (settings === undefined) {
    return <p className="text-sm text-gray-400">Loading…</p>;
  }

  if (settings === null) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-1">Set up your budget</h2>
          <p className="text-sm text-gray-500">
            Choose the group whose spending you want to track against a budget.
          </p>
        </div>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-500">
            No groups yet —{" "}
            <Link href="/upload" className="text-emerald-700 hover:underline">
              import transactions
            </Link>{" "}
            to create one.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={selectedGroupId}
              onChange={(e) => setSelectedGroupId(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
            >
              <option value="">Select a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={handleSelectGroup}
              disabled={saving}
              className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50"
            >
              {saving ? "Saving…" : "Continue"}
            </button>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Your budget tracks spending in <span className="font-medium text-gray-700">{settings.groupName}</span>.
      </p>
      <Link
        href="/budget/setup"
        className="inline-block bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium"
      >
        Create your budget
      </Link>
    </div>
  );
}
