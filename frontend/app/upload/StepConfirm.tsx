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
    <div className="space-y-6">
      <p className="text-sm text-gray-700">
        Review the summary below and click <strong>Save</strong> to import these
        transactions.
      </p>

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-gray-500">File</dt>
          <dd className="font-medium text-gray-900 truncate">{filename}</dd>
        </div>

        <div>
          <dt className="text-gray-500">Total transactions</dt>
          <dd className="font-medium text-gray-900">
            {transactions.length.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Categorised</dt>
          <dd className="font-medium text-gray-900">
            {categorised.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Uncategorised</dt>
          <dd className="font-medium text-gray-900">
            {uncategorised.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Travellers</dt>
          <dd className="font-medium text-gray-900">
            {uploadResult.travellers.length > 0
              ? uploadResult.travellers.join(", ")
              : "—"}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Home currency</dt>
          <dd className="font-medium text-gray-900">
            {uploadResult.homeCurrency}
          </dd>
        </div>
      </dl>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
