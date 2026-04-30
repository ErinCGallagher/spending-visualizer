/**
 * Step 3 of the upload wizard — optionally override the country field on
 * all transactions before they proceed through categorisation.
 */

"use client";

import { useState } from "react";
import type { ParsedTransaction } from "./types";

interface Props {
  transactions: ParsedTransaction[];
  onBack: () => void;
  onContinue: (updated: ParsedTransaction[]) => void;
}

export default function StepCountry({ transactions, onBack, onContinue }: Props) {
  const detectedCountries = [
    ...new Set(transactions.map((t) => t.country).filter(Boolean)),
  ].sort() as string[];

  const [override, setOverride] = useState("");

  function handleContinue() {
    if (!override.trim()) {
      onContinue(transactions);
      return;
    }
    const country = override.trim();
    onContinue(transactions.map((t) => ({ ...t, country })));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">Set Country</h2>
        <p className="mt-1 text-sm text-gray-500">
          Optionally override the country on every transaction in this upload.
          Leave blank to keep the values from the file.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 space-y-1">
        <p className="text-xs text-gray-500 uppercase tracking-wide font-medium mb-2">
          Countries in this file
        </p>
        {detectedCountries.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {detectedCountries.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setOverride(c)}
                className="px-3 py-1 rounded-full border border-gray-300 bg-white text-sm text-gray-700 hover:border-emerald-600 hover:text-emerald-700 transition-colors"
              >
                {c}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">None recorded in file</p>
        )}
      </div>

      <div className="space-y-2">
        <label
          htmlFor="country-override"
          className="block text-sm font-medium text-gray-700"
        >
          Override country
        </label>
        <input
          id="country-override"
          type="text"
          value={override}
          onChange={(e) => setOverride(e.target.value)}
          placeholder="e.g. Canada — leave blank to keep file values"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:border-transparent"
        />
        {override.trim() && (
          <p className="text-xs text-emerald-700">
            All {transactions.length.toLocaleString()} transactions will be set
            to <strong>{override.trim()}</strong>.
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium"
        >
          {override.trim() ? "Override & Continue" : "Keep as uploaded"}
        </button>
      </div>
    </div>
  );
}
