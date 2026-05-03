/**
 * Step 2 of the upload wizard — shows a human-readable summary of the
 * parsed file so the user can confirm before proceeding.
 */

"use client";

import { formatDate } from "@/lib/format";
import type { ParsedUploadResult } from "./types";
import { isCreditCardFormat } from "./stepConfig";

interface Props {
  result: ParsedUploadResult;
  onBack: () => void;
  onContinue: () => void;
}

export default function StepSummary({ result, onBack, onContinue }: Props) {
  const hasErrors = result.errors.length > 0;
  const hasNoTransactions = result.transactions.length === 0;
  const canContinue = !hasErrors && !hasNoTransactions;

  const countries = [
    ...new Set(result.transactions.map((t) => t.country).filter(Boolean)),
  ].sort() as string[];

  const isCreditCard = isCreditCardFormat(result.transactions[0]?.sourceFormat);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">
        Review your upload
      </h2>

      {result.overlapWarning && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 flex-shrink-0 mt-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>
            <strong>Warning:</strong> Some of these dates overlap with previously
            uploaded data. Duplicate transactions may result.
          </span>
        </div>
      )}

      <div>
        <div className="flex justify-between border-b border-gray-100 py-2">
          <span className="text-sm text-gray-500">Transactions</span>
          <span className="text-sm font-medium text-gray-900">
            {result.transactions.length.toLocaleString()}
          </span>
        </div>

        <div className="flex justify-between border-b border-gray-100 py-2">
          <span className="text-sm text-gray-500">Home currency</span>
          <span className="text-sm font-medium text-gray-900">
            {result.homeCurrency}
          </span>
        </div>

        <div className="flex justify-between border-b border-gray-100 py-2">
          <span className="text-sm text-gray-500">Date range</span>
          <span className="text-sm font-medium text-gray-900">
            {formatDate(result.dateRange.from)} —{" "}
            {formatDate(result.dateRange.to)}
          </span>
        </div>

        {!isCreditCard && (
          <>
            <div className="flex justify-between border-b border-gray-100 py-2">
              <span className="text-sm text-gray-500">Travellers</span>
              <span className="text-sm font-medium text-gray-900">
                {result.travellers.length > 0
                  ? result.travellers.join(", ")
                  : "—"}
              </span>
            </div>

            <div className="flex justify-between border-b border-gray-100 py-2 last:border-b-0">
              <span className="text-sm text-gray-500">Countries</span>
              <span className="text-sm font-medium text-gray-900">
                {countries.length > 0 ? countries.join(", ") : "None recorded"}
              </span>
            </div>
          </>
        )}
      </div>

      {!!result.skippedPayments && result.skippedPayments > 0 && (
        <p className="text-sm text-gray-500">
          {result.skippedPayments} payment row{result.skippedPayments > 1 ? "s" : ""} were skipped
        </p>
      )}

      {hasNoTransactions && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <strong>No valid transactions found.</strong> The file could not be
          parsed. Check that you selected the correct format.
        </div>
      )}

      {hasErrors && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <p className="font-medium mb-2">
            {result.errors.length} row{result.errors.length !== 1 ? "s" : ""}{" "}
            could not be imported due to missing required fields. Fix the file
            and re-upload to proceed.
          </p>
          <ul className="space-y-1 max-h-40 overflow-y-auto list-disc list-inside">
            {result.errors.map((err, i) => (
              <li key={i}>
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
          className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
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
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
