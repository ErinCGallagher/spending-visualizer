/**
 * Step 6 of the upload wizard — final confirmation before saving.
 * Calls POST /api/uploads/confirm and redirects to the dashboard on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupType, ParsedTransaction, ParsedUploadResult } from "./types";

const GROUP_TYPE_LABELS: Record<GroupType, string> = {
  trip: "Trip",
  daily: "Daily Living",
  business: "Business",
};

interface Props {
  uploadResult: ParsedUploadResult;
  transactions: ParsedTransaction[];
  filename: string;
  primaryGroup: { id: string; name: string; groupType: GroupType };
  onBack: () => void;
}

export default function StepConfirm({
  uploadResult,
  transactions,
  filename,
  primaryGroup,
  onBack,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorised = transactions.filter((t) => t.categoryName).length;
  const uncategorised = transactions.length - categorised;

  // Count transactions assigned to the secondary group (if any)
  const secondaryCount = transactions.filter(
    (t) => t.groupId && t.groupId !== primaryGroup.id
  ).length;

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/uploads/confirm", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          homeCurrency: uploadResult.homeCurrency,
          sourceFormat: "travelspend",
          filename,
          primaryGroupId: primaryGroup.id,
          transactions,
          travellers: uploadResult.travellers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Save failed.");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-gray-900">Confirm Import</h2>

      <dl className="grid grid-cols-2 gap-4">
        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">File</dt>
          <dd className="text-base font-medium text-gray-900">{filename}</dd>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Total Transactions</dt>
          <dd className="text-base font-medium text-gray-900">
            {transactions.length.toLocaleString()}
          </dd>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Categorised</dt>
          <dd className="text-base font-medium text-gray-900">
            {categorised.toLocaleString()}
          </dd>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Uncategorised</dt>
          <dd className="text-base font-medium text-gray-900">
            {uncategorised.toLocaleString()}
          </dd>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Primary Group</dt>
          <dd className="text-base font-medium text-gray-900">
            {primaryGroup.name}
            <span className="ml-2 text-xs text-gray-400 font-normal">
              {GROUP_TYPE_LABELS[primaryGroup.groupType]}
            </span>
          </dd>
        </div>

        {secondaryCount > 0 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">
              Secondary Group
            </dt>
            <dd className="text-base font-medium text-gray-900">
              {secondaryCount.toLocaleString()} transaction
              {secondaryCount !== 1 ? "s" : ""} assigned separately
            </dd>
          </div>
        )}

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Travellers</dt>
          <dd className="text-base font-medium text-gray-900">
            {uploadResult.travellers.length > 0
              ? uploadResult.travellers.join(", ")
              : "—"}
          </dd>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <dt className="text-xs text-gray-500 uppercase tracking-wide mb-1">Home Currency</dt>
          <dd className="text-base font-medium text-gray-900">
            {uploadResult.homeCurrency}
          </dd>
        </div>
      </dl>

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
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
