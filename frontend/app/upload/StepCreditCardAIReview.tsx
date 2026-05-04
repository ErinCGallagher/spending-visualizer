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
  source: "cache" | "ai";
}

const CATEGORY_MAX_LENGTH = 50;
const CATEGORY_NAME_RE = /^[^\d]+$/;

export default function StepCreditCardAIReview({
  transactions,
  existingTaxonomy,
  onBack,
  onContinue,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [results, setResults] = useState<CategoriseResult[]>([]);
  /** Final category choices keyed by transaction index */
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [userAddedCategories, setUserAddedCategories] = useState<string[]>([]);

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
          if (res.status >= 500) {
            setFatalError(data.message ?? "Categorisation failed.");
            return;
          }
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

        if (data.aiError) {
          setError(data.aiError);
        }
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

  const cacheHits = results
    .map((r, i) => ({ ...r, transactionIndex: i }))
    .filter((r) => r.source === "cache");

  // All non-cache-hit results go into the review table
  const aiSuggestions = results
    .map((r, i) => ({ ...r, transactionIndex: i }))
    .filter((r) => r.source === "ai");

  const allTaxonomyNames = new Set(
    existingTaxonomy.flatMap((c) => [c.name, ...c.children.map((ch) => ch.name)])
  );

  const parentCategories = existingTaxonomy.map((c) => c.name);
  const childToParent = new Map<string, string>();
  const parentToChildren = new Map<string, string[]>();

  for (const cat of existingTaxonomy) {
    parentToChildren.set(cat.name, cat.children.map((ch) => ch.name));
    for (const child of cat.children) {
      childToParent.set(child.name, cat.name);
    }
  }

  function addUserCategory() {
    const name = newCategoryInput.trim();
    if (!name) return;
    if (name.length > CATEGORY_MAX_LENGTH) {
      setInputError(`Category name must be ${CATEGORY_MAX_LENGTH} characters or fewer.`);
      return;
    }
    if (!CATEGORY_NAME_RE.test(name)) {
      setInputError("Category name must not contain numbers.");
      return;
    }
    if (allTaxonomyNames.has(name) || userAddedCategories.includes(name)) {
      setInputError(`"${name}" already exists.`);
      return;
    }
    setUserAddedCategories((prev) => [...prev, name]);
    setNewCategoryInput("");
    setInputError(null);
  }

  function removeUserCategory(name: string) {
    setUserAddedCategories((prev) => prev.filter((c) => c !== name));
    // Reset any transaction choices that were using the removed category
    setChoices((prev) => {
      const next = { ...prev };
      for (const [idx, chosen] of Object.entries(next)) {
        if (chosen === name) {
          next[Number(idx)] = results[Number(idx)]?.categoryName ?? "";
        }
      }
      return next;
    });
  }

  function handleContinue() {
    const updated = transactions.map((t, i) => ({
      ...t,
      categoryName: choices[i] ?? t.categoryName ?? undefined,
      categorySource: results[i]?.source === "cache" ? ("user" as const) : ("ai" as const),
      categoryConfidence: results[i]?.confidence ?? 0,
    }));

    const confirmedNames = new Set(
      updated.map((t) => t.categoryName).filter((n): n is string => !!n)
    );
    const newCategoryNames = [...confirmedNames].filter((name) => !allTaxonomyNames.has(name));

    onContinue(updated, newCategoryNames);
  }

  if (fatalError) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
        <p className="text-sm text-red-600">{fatalError}</p>
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      {error && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.28 7.22a.75.75 0 0 0-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 1 0 1.06 1.06L10 11.06l1.72 1.72a.75.75 0 1 0 1.06-1.06L11.06 10l1.72-1.72a.75.75 0 0 0-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">AI Suggestions</h2>

        <div className="mt-3 space-y-2">
          <p className="text-sm text-gray-600">Need a category that isn't listed? Add it here and select it from the dropdowns below.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryInput}
              onChange={(e) => {
                setNewCategoryInput(e.target.value);
                setInputError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addUserCategory();
                }
              }}
              maxLength={CATEGORY_MAX_LENGTH}
              placeholder="New category name"
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
            <button
              type="button"
              onClick={addUserCategory}
              className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 whitespace-nowrap"
            >
              Add Category
            </button>
          </div>
          {inputError && <p className="text-xs text-red-600">{inputError}</p>}
          {userAddedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {userAddedCategories.map((cat) => (
                <span
                  key={cat}
                  className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full px-3 py-0.5 text-xs font-medium"
                >
                  {cat}
                  <button
                    type="button"
                    onClick={() => removeUserCategory(cat)}
                    aria-label={`Remove ${cat}`}
                    className="hover:text-emerald-900 ml-0.5 leading-none"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {cacheHits.length > 0 && (
          <details className="group border border-gray-100 rounded-lg overflow-hidden mt-4">
            <summary className="bg-gray-50/50 px-4 py-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-50 flex items-center justify-between list-none">
              <span>
                {cacheHits.length} transaction{cacheHits.length !== 1 ? "s" : ""} automatically tagged from history
              </span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 transition-transform group-open:rotate-180"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <div className="p-4 bg-white overflow-x-auto">
              <p className="text-xs text-gray-500 mb-4 bg-gray-50 px-3 py-2 rounded-lg inline-block">
                Tip: You can modify cached categorizations in the settings.
              </p>
              <table className="w-full text-sm opacity-50">
                <thead>
                  <tr className="text-left text-xs font-semibold tracking-widest text-gray-400 uppercase border-b border-gray-200">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Description</th>
                    <th className="py-2 pr-4">Amount</th>
                    <th className="py-2 pr-4">Parent Category</th>
                    <th className="py-2">Sub Category</th>
                  </tr>
                </thead>
                <tbody>
                  {cacheHits.map((s) => {
                    const tx = transactions[s.transactionIndex];
                    const currentChoice = s.categoryName;
                    const inferredParent = childToParent.get(currentChoice) || (parentCategories.includes(currentChoice) ? currentChoice : null);
                    const inferredSub = inferredParent && inferredParent !== currentChoice ? currentChoice : null;

                    return (
                      <tr key={s.transactionIndex} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{formatDate(tx.date)}</td>
                        <td className="py-2 pr-4 text-gray-700">{tx.description}</td>
                        <td className="py-2 pr-4 text-gray-700">{formatAmount(tx.amountHome)}</td>
                        <td className="py-2 pr-4 text-gray-700">{inferredParent || "Uncategorised"}</td>
                        <td className="py-2 text-gray-700">{inferredSub || "—"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </details>
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
                  <th className="py-2 pr-4">Parent Category</th>
                  <th className="py-2">Sub Category</th>
                </tr>
              </thead>
              <tbody>
                {aiSuggestions.map((s) => {
                  const tx = transactions[s.transactionIndex];
                  const isLowConfidence = s.confidence < 0.8;
                  const currentChoice = choices[s.transactionIndex] ?? "";
                  
                  // Determine current parent and sub based on taxonomy and user-added categories
                  const inferredParent = childToParent.get(currentChoice) || (parentCategories.includes(currentChoice) ? currentChoice : null) || (userAddedCategories.includes(currentChoice) ? currentChoice : null);
                  const inferredSub = inferredParent && inferredParent !== currentChoice ? currentChoice : null;

                  const parentOptions = [...parentCategories, ...userAddedCategories];
                  // If current choice is completely new (AI-suggested, not user-added), it acts as a new parent for now
                  if (!inferredParent && currentChoice !== "" && !userAddedCategories.includes(currentChoice)) {
                    parentOptions.unshift(currentChoice);
                  }

                  const subOptions = inferredParent ? parentToChildren.get(inferredParent) || [] : [];

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
                      <td className="py-3 pr-4">
                        <select
                          value={inferredParent || ""}
                          onChange={(e) => {
                            const newParent = e.target.value;
                            setChoices((prev) => ({
                              ...prev,
                              [s.transactionIndex]: newParent,
                            }));
                          }}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 w-full"
                        >
                          <option value="">Uncategorised</option>
                          {parentOptions.map((p) => (
                            <option key={p} value={p}>
                              {p} {!allTaxonomyNames.has(p) ? "(New)" : ""}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3">
                        <select
                          value={inferredSub || ""}
                          disabled={!inferredParent}
                          onChange={(e) => {
                            const newSub = e.target.value;
                            setChoices((prev) => ({
                              ...prev,
                              [s.transactionIndex]: newSub || inferredParent || "",
                            }));
                          }}
                          className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-800 w-full disabled:bg-gray-50 disabled:text-gray-400"
                        >
                          <option value="">Optional / None</option>
                          {subOptions.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                          {/* If the AI suggested a sub that isn't in taxonomy yet */}
                          {!inferredParent && !parentCategories.includes(currentChoice) && currentChoice !== "" && (
                             <option value={currentChoice}>{currentChoice} (New)</option>
                          )}
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
