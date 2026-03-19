/**
 * Step 2 of the upload wizard — shows a human-readable summary of the
 * parsed file so the user can confirm before proceeding.
 */

"use client";

import { format, parseISO } from "date-fns";
import type { ParsedUploadResult } from "./types";

interface Props {
  result: ParsedUploadResult;
  onBack: () => void;
  onContinue: () => void;
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

export default function StepSummary({ result, onBack, onContinue }: Props) {
  return (
    <div className="space-y-6">
      {result.overlapWarning && (
        <div className="rounded-md bg-yellow-50 border border-yellow-300 px-4 py-3 text-sm text-yellow-800">
          <strong>Warning:</strong> Some of these dates overlap with previously
          uploaded data. Duplicate transactions may result.
        </div>
      )}

      <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
        <div>
          <dt className="text-gray-500">Transactions</dt>
          <dd className="font-medium text-gray-900">
            {result.transactions.length.toLocaleString()}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Home currency</dt>
          <dd className="font-medium text-gray-900">{result.homeCurrency}</dd>
        </div>

        <div>
          <dt className="text-gray-500">Date range</dt>
          <dd className="font-medium text-gray-900">
            {formatDate(result.dateRange.from)} —{" "}
            {formatDate(result.dateRange.to)}
          </dd>
        </div>

        <div>
          <dt className="text-gray-500">Travellers</dt>
          <dd className="font-medium text-gray-900">
            {result.travellers.length > 0
              ? result.travellers.join(", ")
              : "—"}
          </dd>
        </div>
      </dl>

      {result.errors.length > 0 && (
        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">
            Parse warnings
          </p>
          <ul className="space-y-1">
            {result.errors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">
                {err.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onContinue}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
