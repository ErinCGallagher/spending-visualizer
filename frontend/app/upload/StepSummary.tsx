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
  const hasErrors = result.errors.length > 0;
  const hasNoTransactions = result.transactions.length === 0;
  const canContinue = !hasErrors && !hasNoTransactions;

  const countries = [
    ...new Set(result.transactions.map((t) => t.country).filter(Boolean)),
  ].sort() as string[];

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

        <div>
          <dt className="text-gray-500">Countries</dt>
          <dd className="font-medium text-gray-900">
            {countries.length > 0 ? countries.join(", ") : "None recorded"}
          </dd>
        </div>
      </dl>

      {hasNoTransactions && (
        <div className="rounded-md bg-red-50 border border-red-300 px-4 py-3 text-sm text-red-800">
          <strong>No valid transactions found.</strong> The file could not be
          parsed. Check that you selected the correct format.
        </div>
      )}

      {hasErrors && (
        <div>
          <p className="text-sm font-medium text-red-700 mb-1">
            {result.errors.length} row{result.errors.length !== 1 ? "s" : ""}{" "}
            could not be imported due to missing required fields. Fix the file
            and re-upload to proceed.
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto">
            {result.errors.map((err, i) => (
              <li key={i} className="text-sm text-red-600">
                {err.row != null && (
                  <span className="font-medium">Row {err.row}: </span>
                )}
                {err.field && (
                  <span className="font-medium">{err.field} — </span>
                )}
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
          disabled={!canContinue}
          title={
            hasNoTransactions
              ? "No valid transactions to import"
              : hasErrors
              ? "Fix the errors above before continuing"
              : undefined
          }
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
