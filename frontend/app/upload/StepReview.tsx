/**
 * Step 4 of the upload wizard — AI categorisation review.
 * Auto-accepts high-confidence suggestions; surfaces low-confidence ones
 * for the user to confirm or override before saving.
 */

"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import type { AISuggestion, Category, ParsedTransaction } from "./types";

interface Props {
  transactions: ParsedTransaction[];
  taxonomy: Category[];
  onBack: () => void;
  onContinue: (transactions: ParsedTransaction[]) => void;
}

function formatDate(iso: string) {
  try {
    return format(parseISO(iso), "MMM d, yyyy");
  } catch {
    return iso;
  }
}

function formatAmount(amount: number, currency: string) {
  if (!currency) {
    return new Intl.NumberFormat("en-CA", { maximumFractionDigits: 2 }).format(amount);
  }
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export default function StepReview({
  transactions,
  taxonomy,
  onBack,
  onContinue,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  /** Final category choices, keyed by transaction index */
  const [choices, setChoices] = useState<Record<number, string | null>>({});

  useEffect(() => {
    async function runCategorisation() {
      setLoading(true);
      setError(null);

      // Only send uncategorized transactions to the AI
      const uncategorized = transactions
        .map((t, i) => ({ t, i }))
        .filter(({ t }) => !t.categoryName);

      if (uncategorized.length === 0) {
        setLoading(false);
        return;
      }

      const payload = uncategorized.map(({ t }) => ({
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

        const results: { categoryName: string; confidence: number }[] =
          data.results ?? [];

        const built: AISuggestion[] = [];
        const initialChoices: Record<number, string | null> = {};

        // Map results back to original transaction indices
        results.forEach((r, resultIdx) => {
          const { t, i } = uncategorized[resultIdx];
          built.push({
            transactionIndex: i,
            description: t.description,
            amount: t.amountHome,
            date: t.date,
            suggestedCategory: r.categoryName,
            confidence: r.confidence,
            chosenCategory: r.categoryName,
          });

          // Auto-accept high-confidence results
          initialChoices[i] = r.categoryName;
        });

        setSuggestions(built);
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

  const lowConfidence = suggestions.filter((s) => s.confidence < 0.8);

  function handleContinue() {
    // Merge AI choices back; preserve existing categories for already-categorized transactions
    const updated = transactions.map((t, i) => ({
      ...t,
      categoryName: choices[i] ?? t.categoryName ?? undefined,
    }));
    onContinue(updated);
  }

  if (loading) {
    return (
      <div className="space-y-4">
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
      <div className="space-y-4">
        <p className="text-sm text-red-600">{error}</p>
        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  const allSubOptions: { label: string; value: string; group: string }[] = [];
  for (const main of taxonomy) {
    if (main.children?.length) {
      for (const sub of main.children) {
        allSubOptions.push({
          label: sub.name,
          value: sub.name,
          group: main.name,
        });
      }
    } else {
      allSubOptions.push({
        label: main.name,
        value: main.name,
        group: main.name,
      });
    }
  }

  const groups = Array.from(new Set(allSubOptions.map((o) => o.group)));

  const alreadyCategorized = transactions.filter((t) => t.categoryName).length;

  return (
    <div className="space-y-6">
      {alreadyCategorized > 0 && (
        <p className="text-sm text-gray-600">
          {alreadyCategorized} transaction{alreadyCategorized !== 1 ? "s" : ""}{" "}
          already had a category from the CSV and were skipped.
        </p>
      )}
      {suggestions.length > 0 && (
        <p className="text-sm text-gray-600">
          {suggestions.length - lowConfidence.length} of {suggestions.length}{" "}
          uncategorised transaction{suggestions.length !== 1 ? "s" : ""} were
          accepted automatically (confidence ≥ 80%).
        </p>
      )}

      {lowConfidence.length > 0 ? (
        <>
          <p className="text-sm font-medium text-gray-700">
            Review {lowConfidence.length} low-confidence suggestion
            {lowConfidence.length !== 1 ? "s" : ""}:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Description</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">AI Suggestion</th>
                  <th className="py-2 font-medium">Category</th>
                </tr>
              </thead>
              <tbody>
                {lowConfidence.map((s) => {
                  const t = transactions[s.transactionIndex];
                  return (
                    <tr
                      key={s.transactionIndex}
                      className="border-b last:border-0"
                    >
                      <td className="py-2 pr-4 text-gray-600">
                        {formatDate(s.date)}
                      </td>
                      <td className="py-2 pr-4 text-gray-800">
                        {s.description}
                      </td>
                      <td className="py-2 pr-4 text-gray-800">
                        {formatAmount(s.amount, t.localCurrency ?? "")}
                      </td>
                      <td className="py-2 pr-4 text-gray-500">
                        {s.suggestedCategory}{" "}
                        <span className="text-xs text-gray-400">
                          ({Math.round(s.confidence * 100)}%)
                        </span>
                      </td>
                      <td className="py-2">
                        <select
                          value={choices[s.transactionIndex] ?? ""}
                          onChange={(e) =>
                            setChoices((prev) => ({
                              ...prev,
                              [s.transactionIndex]:
                                e.target.value === "" ? null : e.target.value,
                            }))
                          }
                          className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="">Uncategorised</option>
                          {groups.map((group) => {
                            const opts = allSubOptions.filter(
                              (o) => o.group === group
                            );
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
      ) : suggestions.length > 0 ? (
        <p className="text-sm text-gray-600">
          All suggestions were high-confidence and have been accepted.
        </p>
      ) : null}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
