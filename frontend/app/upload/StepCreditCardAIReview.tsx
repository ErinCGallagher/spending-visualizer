/**
 * Credit card AI categorisation step. Sends all transactions to /api/uploads/categorise,
 * surfaces cache hits as a summary count, and shows AI suggestions for user review.
 */

"use client";

import { useEffect, useState } from "react";
import { formatDate } from "@/lib/format";
import type { Category, ParsedTransaction } from "./types";

interface Props {
  transactions: ParsedTransaction[];
  existingTaxonomy: Category[];
  onBack: () => void;
  onContinue: (transactions: ParsedTransaction[], newCategoryNames: string[]) => void;
}

function formatAmount(amount: number) {
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 2,
  }).format(amount);
}

interface CategoriseResult {
  categoryName: string;
  confidence: number;
}

export default function StepCreditCardAIReview({
  transactions,
  existingTaxonomy,
  onBack,
  onContinue,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<CategoriseResult[]>([]);
  /** Final category choices keyed by transaction index */
  const [choices, setChoices] = useState<Record<number, string>>({});

  useEffect(() => {
    async function runCategorisation() {
      setLoading(true);
      setError(null);

      const payload = transactions.map((t) => ({
        description: t.description,
        country: t.country ?? null,
      }));

      try {
        const res = await fetch("/api/uploads/categorise", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transactions: payload }),
        });

        const data = await res.json();

        if (!res.ok) {
          setError(data.message ?? "Categorisation failed.");
          return;
        }

        const categoriseResults: CategoriseResult[] = data.results ?? [];
        setResults(categoriseResults);

        const initialChoices: Record<number, string> = {};
        categoriseResults.forEach((r, i) => {
          initialChoices[i] = r.categoryName;
        });
        setChoices(initialChoices);
      } catch {
        setError("An unexpected error occurred during categorisation.");
      } finally {
        setLoading(false);
      }
    }

    runCategorisation();
    // Only run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cacheHitCount = results.filter((r) => r.confidence === 1).length;
  // All non-cache-hit results go into the review table
  const aiSuggestions = results
    .map((r, i) => ({ ...r, transactionIndex: i }))
    .filter((r) => r.confidence < 1);

  const allTaxonomyNames = new Set(
    existingTaxonomy.flatMap((c) => [c.name, ...c.children.map((ch) => ch.name)])
  );

  const allSubOptions: { label: string; value: string; group: string }[] = [];
  for (const main of existingTaxonomy) {
    if (main.children?.length) {
      for (const sub of main.children) {
        allSubOptions.push({ label: sub.name, value: sub.name, group: main.name });
      }
    } else {
      allSubOptions.push({ label: main.name, value: main.name, group: main.name });
    }
  }
  const groups = Array.from(new Set(allSubOptions.map((o) => o.group)));

  function handleContinue() {
    const updated = transactions.map((t, i) => ({
      ...t,
      categoryName: choices[i] ?? t.categoryName ?? undefined,
    }));

    const confirmedNames = new Set(
      updated.map((t) => t.categoryName).filter((n): n is string => !!n)
    );
    const newCategoryNames = [...confirmedNames].filter((name) => !allTaxonomyNames.has(name));

    onContinue(updated, newCategoryNames);
  }

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-gray-600">Running AI categorisation…</p>
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((n) => (
            <div key={n} className="h-8 bg-gray-100 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Suggestions</h2>
        {cacheHitCount > 0 && (
          <p className="text-sm text-gray-500">
            {cacheHitCount} transaction{cacheHitCount !== 1 ? "s" : ""} were automatically tagged from your history.
          </p>
        )}
      </div>

      {aiSuggestions.length > 0 ? (
        <>
          <p className="text-sm font-medium text-gray-700">
            Review {aiSuggestions.length} AI suggestion{aiSuggestions.length !== 1 ? "s" : ""}:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold tracking-widest text-gray-400 uppercase border-b border-gray-200">
                  <th className="py-2 pr-4">Date</th>
                  <th className="py-2 pr-4">Description</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">AI Suggestion</th>
                  <th className="py-2">Category</th>
                </tr>
              </thead>
              <tbody>
                {aiSuggestions.map((s) => {
                  const tx = transactions[s.transactionIndex];
                  const isLowConfidence = s.confidence < 0.8;
                  return (
                    <tr
                      key={s.transactionIndex}
                      className={`border-b border-gray-100 ${isLowConfidence ? "bg-amber-50/40" : ""}`}
                    >
                      <td className="py-3 pr-4 text-gray-600">{formatDate(tx.date)}</td>
                      <td className="py-3 pr-4 text-gray-800">{tx.description}</td>
                      <td className="py-3 pr-4 text-gray-800">{formatAmount(tx.amountHome)}</td>
                      <td className="py-3 pr-4">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            isLowConfidence
                              ? "bg-amber-50 text-amber-800"
                              : "bg-emerald-50 text-emerald-800"
                          }`}
                        >
                          {s.categoryName} ({Math.round(s.confidence * 100)}%)
                        </span>
                      </td>
                      <td className="py-3">
                        <select
                          value={choices[s.transactionIndex] ?? ""}
                          onChange={(e) =>
                            setChoices((prev) => ({
                              ...prev,
                              [s.transactionIndex]: e.target.value,
                            }))
                          }
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
                        >
                          <option value="">Uncategorised</option>
                          {groups.map((group) => {
                            const opts = allSubOptions.filter((o) => o.group === group);
                            return (
                              <optgroup key={group} label={group}>
                                {opts.map((o) => (
                                  <option key={o.value} value={o.value}>
                                    {o.label}
                                  </option>
                                ))}
                              </optgroup>
                            );
                          })}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <p className="text-sm text-gray-600">
          All transactions were tagged from your history — nothing to review.
        </p>
      )}

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
          Continue
        </button>
      </div>
    </div>
  );
}
