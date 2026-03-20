/**
 * Step 5 of the upload wizard — final confirmation before saving.
 * Calls POST /api/uploads/confirm and redirects to the dashboard on success.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ParsedTransaction, ParsedUploadResult } from "./types";

interface Props {
  uploadResult: ParsedUploadResult;
  transactions: ParsedTransaction[];
  filename: string;
  onBack: () => void;
}

export default function StepConfirm({
  uploadResult,
  transactions,
  filename,
  onBack,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categorised = transactions.filter((t) => t.categoryName).length;
  const uncategorised = transactions.length - categorised;

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
          transactions,
          travellers: uploadResult.travellers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Save failed.");
        return;
      }

      router.push("/");
    } catch {
      setError("An unexpected error occurred while saving.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Confirm Import</h2>

      <dl className="grid grid-cols-2 gap-4 mb-6">
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

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

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
