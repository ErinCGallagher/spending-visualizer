/**
 * Step 3 of the upload wizard — lets the user assign unrecognised
 * categories into the existing taxonomy before AI categorisation runs.
 */

"use client";

import { useEffect, useState } from "react";
import type { Category, CategoryAssignment } from "./types";

interface Props {
  /** Raw category strings returned from the parse step */
  parsedCategories: string[];
  onBack: () => void;
  onContinue: (taxonomy: Category[], assignments: CategoryAssignment[]) => void;
}

export default function StepCategories({
  parsedCategories,
  onBack,
  onContinue,
}: Props) {
  const [existing, setExisting] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  /** Map from category name → chosen parent name (null = new standalone main) */
  const [assignments, setAssignments] = useState<Record<string, string | null>>(
    {}
  );

  /** User-defined new main categories that don't exist in the taxonomy yet */
  const [newMainCategories, setNewMainCategories] = useState<string[]>([]);
  const [newMainInput, setNewMainInput] = useState("");

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Category[]) => {
        setExisting(data);

        // Pre-assign any parsed category that already exists in the taxonomy
        const initial: Record<string, string | null> = {};
        for (const name of parsedCategories) {
          const asMain = data.find(
            (c) => c.name.toLowerCase() === name.toLowerCase()
          );
          if (asMain) {
            initial[name] = null; // already a main category
            continue;
          }
          for (const main of data) {
            const asSub = main.children?.find(
              (c) => c.name.toLowerCase() === name.toLowerCase()
            );
            if (asSub) {
              initial[name] = main.name;
              break;
            }
          }
        }
        setAssignments(initial);
      })
      .catch(() => setError("Failed to load existing categories."))
      .finally(() => setLoading(false));
  }, [parsedCategories]);

  const existingNames = new Set([
    ...existing.map((c) => c.name.toLowerCase()),
    ...existing.flatMap((c) =>
      (c.children ?? []).map((sub) => sub.name.toLowerCase())
    ),
  ]);

  const recognised = parsedCategories.filter((name) =>
    existingNames.has(name.toLowerCase())
  );
  const unrecognised = parsedCategories.filter(
    (name) => !existingNames.has(name.toLowerCase())
  );

  function addNewMainCategory() {
    const trimmed = newMainInput.trim();
    if (!trimmed) return;
    const alreadyExists = [
      ...existing.map((c) => c.name.toLowerCase()),
      ...newMainCategories.map((n) => n.toLowerCase()),
    ].includes(trimmed.toLowerCase());
    if (alreadyExists) return;
    setNewMainCategories((prev) => [...prev, trimmed]);
    setNewMainInput("");
  }

  async function handleContinue() {
    setSubmitting(true);
    setError(null);

    // Build the full category hierarchy to send to the organise endpoint
    const categoryList: { name: string; parentName: string | null }[] = [];

    // Include all existing main categories
    for (const main of existing) {
      categoryList.push({ name: main.name, parentName: null });
      for (const sub of main.children ?? []) {
        categoryList.push({ name: sub.name, parentName: main.name });
      }
    }

    // Include user-defined new main categories
    for (const name of newMainCategories) {
      categoryList.push({ name, parentName: null });
    }

    // Add unrecognised categories according to user assignments
    for (const name of unrecognised) {
      const parent = assignments[name] ?? null;
      // Avoid duplicates if user assigned to an existing parent
      if (!categoryList.some((c) => c.name === name)) {
        categoryList.push({ name, parentName: parent });
      }
    }

    try {
      const res = await fetch("/api/categories/organise", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: categoryList }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message ?? "Failed to organise categories.");
        return;
      }

      const builtAssignments: CategoryAssignment[] = unrecognised.map(
        (name) => ({
          categoryName: name,
          parentName: assignments[name] ?? null,
        })
      );

      onContinue(data, builtAssignments);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading categories…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      {recognised.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">
            Recognised ({recognised.length})
          </h3>
          <ul className="space-y-1">
            {recognised.map((name) => {
              const isMain = existing.some(
                (c) => c.name.toLowerCase() === name.toLowerCase()
              );
              const parentName = isMain
                ? null
                : existing.find((main) =>
                    main.children?.some(
                      (sub) => sub.name.toLowerCase() === name.toLowerCase()
                    )
                  )?.name ?? null;

              return (
                <li key={name} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-800">{name}</span>
                  <span className="text-gray-400 text-xs">
                    {parentName ? `sub of ${parentName}` : "main category"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {unrecognised.length > 0 && (
        <div className="space-y-4">
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Main categories
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMainInput}
                onChange={(e) => setNewMainInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewMainCategory()}
                placeholder="e.g. Food"
                className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={addNewMainCategory}
                className="px-3 py-1 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
              >
                Add
              </button>
            </div>
            {newMainCategories.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {newMainCategories.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-1 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-full px-3 py-1"
                  >
                    {name}
                    <button
                      onClick={() => {
                        setNewMainCategories((prev) =>
                          prev.filter((n) => n !== name)
                        );
                        // Clear any assignments that pointed to this category
                        setAssignments((prev) => {
                          const next = { ...prev };
                          for (const [k, v] of Object.entries(next)) {
                            if (v === name) next[k] = null;
                          }
                          return next;
                        });
                      }}
                      className="text-blue-400 hover:text-blue-600 leading-none"
                      aria-label={`Remove ${name}`}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">
              Unassigned ({unrecognised.length})
            </h3>
            <ul className="space-y-3">
              {unrecognised.map((name) => (
                <li key={name} className="flex items-center gap-3 text-sm">
                  <span className="w-48 text-gray-800 shrink-0">{name}</span>
                  <select
                    value={assignments[name] ?? "__new_main__"}
                    onChange={(e) =>
                      setAssignments((prev) => ({
                        ...prev,
                        [name]:
                          e.target.value === "__new_main__"
                            ? null
                            : e.target.value,
                      }))
                    }
                    className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="__new_main__">New main category</option>
                    {existing.map((main) => (
                      <option key={main.id} value={main.name}>
                        Under: {main.name}
                      </option>
                    ))}
                    {newMainCategories.length > 0 && (
                      <optgroup label="New">
                        {newMainCategories.map((mainName) => (
                          <option key={mainName} value={mainName}>
                            Under: {mainName}
                          </option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {parsedCategories.length === 0 && (
        <p className="text-sm text-gray-500">
          No categories were detected in this file.
        </p>
      )}

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={submitting}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  );
}
