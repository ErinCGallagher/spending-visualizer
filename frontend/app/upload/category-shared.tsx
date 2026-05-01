/**
 * Shared icons, constants, and the /api/categories/organise helper used by
 * both StepCategories and StepCreditCardCategories.
 */

import type { Category, CategoryAssignment } from "./types";

export function LockIcon({ size = 12 }: { size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 12 12"
      fill="currentColor"
      width={size}
      height={size}
      className="shrink-0"
    >
      <path d="M9 5V4a3 3 0 1 0-6 0v1H2v6h8V5H9ZM5 4a1 1 0 1 1 2 0v1H5V4Z" />
    </svg>
  );
}

export function DragHandle() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 10 16"
      fill="currentColor"
      width={10}
      height={16}
      className="text-gray-400 shrink-0"
    >
      <circle cx="3" cy="3" r="1.2" />
      <circle cx="7" cy="3" r="1.2" />
      <circle cx="3" cy="8" r="1.2" />
      <circle cx="7" cy="8" r="1.2" />
      <circle cx="3" cy="13" r="1.2" />
      <circle cx="7" cy="13" r="1.2" />
    </svg>
  );
}

export const GROUP_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-amber-500",
];

/**
 * Builds the full category hierarchy from the existing taxonomy + new
 * assignments, then posts it to /api/categories/organise.
 */
export async function callOrganiseCategories(
  existing: Category[],
  assignments: CategoryAssignment[]
): Promise<{ ok: boolean; taxonomy?: Category[]; error?: string }> {
  const categoryList: { name: string; parentName: string | null }[] = [];

  for (const main of existing) {
    categoryList.push({ name: main.name, parentName: null });
    for (const sub of main.children ?? []) {
      categoryList.push({ name: sub.name, parentName: main.name });
    }
  }

  const referencedParents = [
    ...new Set(assignments.filter((a) => a.parentName).map((a) => a.parentName!)),
  ];
  for (const parent of referencedParents) {
    if (!categoryList.some((c) => c.name === parent)) {
      categoryList.push({ name: parent, parentName: null });
    }
  }

  for (const { categoryName, parentName } of assignments) {
    if (!categoryList.some((c) => c.name === categoryName)) {
      categoryList.push({ name: categoryName, parentName });
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
      return { ok: false, error: data.message ?? "Failed to organise categories." };
    }
    return { ok: true, taxonomy: data };
  } catch {
    return { ok: false, error: "An unexpected error occurred." };
  }
}
