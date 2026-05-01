/**
 * Conditional credit card wizard step — only shown when StepCreditCardAIReview
 * produced category names absent from the existing taxonomy. Lets the user
 * organise those new categories into parent groups before saving.
 */

"use client";

import { useState } from "react";
import type { Category, CategoryAssignment } from "./types";
import { LockIcon, DragHandle, GROUP_COLORS, callOrganiseCategories } from "./category-shared";

interface Props {
  newCategoryNames: string[];
  existingTaxonomy: Category[];
  onBack: () => void;
  onContinue: (taxonomy: Category[]) => void;
}

export default function StepCreditCardCategories({
  newCategoryNames,
  existingTaxonomy,
  onBack,
  onContinue,
}: Props) {
  /** child name → parent name */
  const [categoryAssignments, setCategoryAssignments] = useState<Record<string, string>>({});
  const [userParents, setUserParents] = useState<string[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [addingGroup, setAddingGroup] = useState(false);
  const [newParentName, setNewParentName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const promotedParents = [...new Set(Object.values(categoryAssignments))].filter((p) =>
    newCategoryNames.includes(p)
  );
  const allUserGroups = [...new Set([...userParents, ...promotedParents])];

  const pool = newCategoryNames.filter(
    (name) =>
      !(name in categoryAssignments) &&
      !allUserGroups.includes(name)
  );

  function getChildren(parent: string) {
    return Object.entries(categoryAssignments)
      .filter(([, p]) => p === parent)
      .map(([c]) => c);
  }

  function assignTo(child: string, parent: string) {
    setCategoryAssignments((prev) => ({ ...prev, [child]: parent }));
    setDragging(null);
    setDragOver(null);
  }

  function unassign(child: string) {
    setCategoryAssignments((prev) => {
      const next = { ...prev };
      delete next[child];
      return next;
    });
  }

  function handleDropOnPoolItem(target: string) {
    if (!dragging || dragging === target || allUserGroups.includes(dragging)) return;
    setCategoryAssignments((prev) => {
      const next = { ...prev };
      delete next[target];
      next[dragging] = target;
      return next;
    });
    setDragging(null);
    setDragOver(null);
  }

  function handleDropToCreateGroup() {
    if (!dragging || allUserGroups.includes(dragging)) return;
    setCategoryAssignments((prev) => {
      const next = { ...prev };
      delete next[dragging];
      return next;
    });
    setUserParents((prev) => [...prev, dragging!]);
    setDragging(null);
    setDragOver(null);
  }

  function handleDropToPool() {
    if (!dragging) return;
    unassign(dragging);
    setDragging(null);
    setDragOver(null);
  }

  function deleteUserParent(parent: string) {
    setCategoryAssignments((prev) => {
      const next = { ...prev };
      for (const [child, p] of Object.entries(next)) {
        if (p === parent) delete next[child];
      }
      return next;
    });
    setUserParents((prev) => prev.filter((p) => p !== parent));
  }

  function addUserParent() {
    const name = newParentName.trim();
    if (!name || allUserGroups.includes(name) || newCategoryNames.includes(name)) return;
    setUserParents((prev) => [...prev, name]);
    setNewParentName("");
    setAddingGroup(false);
  }

  function reset() {
    setCategoryAssignments({});
    setUserParents([]);
    setNewParentName("");
    setAddingGroup(false);
  }

  async function handleContinue() {
    setSubmitting(true);
    setError(null);

    const assignments: CategoryAssignment[] = newCategoryNames.map((name) => ({
      categoryName: name,
      parentName: categoryAssignments[name] ?? null,
    }));

    const result = await callOrganiseCategories(existingTaxonomy, assignments);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Failed to organise categories.");
      return;
    }
    onContinue(result.taxonomy!);
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-1">Review Categories</h2>
        <p className="text-sm text-gray-500">
          The AI suggested {newCategoryNames.length} new categor{newCategoryNames.length !== 1 ? "ies" : "y"} not
          in your taxonomy. Drag them into existing groups or create new ones.
        </p>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Unassigned pool */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
          Ungrouped
        </p>
        <div
          className={`border border-gray-200 rounded-xl p-3 flex flex-wrap gap-2 min-h-[56px] transition-colors ${
            dragOver === "__pool__" ? "bg-emerald-50 border-emerald-300" : ""
          }`}
          onDragOver={(e) => { e.preventDefault(); setDragOver("__pool__"); }}
          onDragLeave={() => setDragOver(null)}
          onDrop={(e) => { e.preventDefault(); handleDropToPool(); }}
        >
          {pool.length === 0 ? (
            <span className="text-xs text-gray-400 italic self-center">
              {dragging ? "Drop here to unassign" : "All categories assigned"}
            </span>
          ) : (
            pool.map((name) => (
              <span
                key={name}
                draggable
                onDragStart={() => setDragging(name)}
                onDragEnd={() => { setDragging(null); setDragOver(null); }}
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setDragOver(`__item__${name}`); }}
                onDragLeave={(e) => { e.stopPropagation(); setDragOver(null); }}
                onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleDropOnPoolItem(name); }}
                className={`border border-gray-200 rounded-full px-3 py-1 text-sm font-semibold text-gray-700 flex items-center gap-2 cursor-grab select-none transition-all ${
                  dragging === name
                    ? "opacity-40"
                    : dragOver === `__item__${name}` && dragging !== name
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200 scale-105"
                      : ""
                }`}
              >
                <DragHandle />
                {name}
              </span>
            ))
          )}
        </div>
      </div>

      {/* Groups */}
      <div>
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2">
          Groups
        </p>
        <div className="grid grid-cols-2 gap-4">
          {/* Locked groups from the existing taxonomy */}
          {existingTaxonomy.map((cat) => {
            const children = getChildren(cat.name);
            return (
              <div
                key={cat.id}
                onDragOver={(e) => { e.preventDefault(); setDragOver(cat.name); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); assignTo(dragging!, cat.name); }}
                className={`rounded-xl overflow-hidden transition-colors ${
                  dragOver === cat.name ? "ring-2 ring-emerald-300" : ""
                }`}
              >
                <div className="bg-gray-400 rounded-t-lg px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-white">
                    <LockIcon size={12} />
                    <span className="font-semibold text-sm">{cat.name}</span>
                  </div>
                  <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">
                    {children.length}
                  </span>
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b-lg p-3 flex flex-wrap gap-2 min-h-[44px]">
                  {children.length === 0 && dragOver !== cat.name && (
                    <span className="text-xs text-gray-400 italic self-center">Drop items here</span>
                  )}
                  {children.map((child) => (
                    <span
                      key={child}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragging(child); }}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      className={`border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700 flex items-center gap-1 cursor-grab select-none transition-opacity ${
                        dragging === child ? "opacity-40" : ""
                      }`}
                    >
                      <DragHandle />
                      {child}
                      <button
                        onClick={(e) => { e.stopPropagation(); unassign(child); }}
                        className="text-gray-400 hover:text-gray-600 leading-none ml-0.5"
                        aria-label={`Remove ${child}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" width={10} height={10}>
                          <path d="M3.22 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.16 8.78a.75.75 0 1 0 1.06 1.06L6 7.06l2.78 2.78a.75.75 0 1 0 1.06-1.06L7.06 6l2.78-2.78a.75.75 0 0 0-1.06-1.06L6 4.94 3.22 2.22Z" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* User-created groups */}
          {allUserGroups.map((parent, index) => {
            const children = getChildren(parent);
            const isUserCreated = userParents.includes(parent);
            const headerColor = GROUP_COLORS[index % GROUP_COLORS.length];
            return (
              <div
                key={parent}
                onDragOver={(e) => { e.preventDefault(); setDragOver(parent); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); assignTo(dragging!, parent); }}
                className={`rounded-xl overflow-hidden transition-colors ${
                  dragOver === parent ? "ring-2 ring-emerald-300" : ""
                }`}
              >
                <div className={`${headerColor} rounded-t-lg px-4 py-2.5 flex items-center justify-between`}>
                  <span className="text-white font-semibold text-sm">{parent}</span>
                  <div className="flex items-center gap-2">
                    <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">
                      {children.length}
                    </span>
                    {isUserCreated && (
                      <button
                        onClick={() => deleteUserParent(parent)}
                        className="text-white/70 hover:text-white"
                        aria-label={`Delete ${parent} group`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={14} height={14}>
                          <path d="M5.28 4.22a.75.75 0 0 0-1.06 1.06L6.94 8l-2.72 2.72a.75.75 0 1 0 1.06 1.06L8 9.06l2.72 2.72a.75.75 0 1 0 1.06-1.06L9.06 8l2.72-2.72a.75.75 0 0 0-1.06-1.06L8 6.94 5.28 4.22Z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="border border-t-0 border-gray-200 rounded-b-lg p-3 flex flex-wrap gap-2 min-h-[44px]">
                  {children.length === 0 && dragOver !== parent && (
                    <span className="text-xs text-gray-400 italic self-center">Drop items here</span>
                  )}
                  {children.map((child) => (
                    <span
                      key={child}
                      draggable
                      onDragStart={(e) => { e.stopPropagation(); setDragging(child); }}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      className={`border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700 flex items-center gap-1 cursor-grab select-none transition-opacity ${
                        dragging === child ? "opacity-40" : ""
                      }`}
                    >
                      <DragHandle />
                      {child}
                      <button
                        onClick={(e) => { e.stopPropagation(); unassign(child); }}
                        className="text-gray-400 hover:text-gray-600 leading-none ml-0.5"
                        aria-label={`Remove ${child}`}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 12 12" fill="currentColor" width={10} height={10}>
                          <path d="M3.22 2.22a.75.75 0 0 0-1.06 1.06L4.94 6 2.16 8.78a.75.75 0 1 0 1.06 1.06L6 7.06l2.78 2.78a.75.75 0 1 0 1.06-1.06L7.06 6l2.78-2.78a.75.75 0 0 0-1.06-1.06L6 4.94 3.22 2.22Z" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            );
          })}

          {/* New group drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver("__create__"); }}
            onDragLeave={() => setDragOver(null)}
            onDrop={(e) => { e.preventDefault(); handleDropToCreateGroup(); }}
            onClick={() => { if (!addingGroup) setAddingGroup(true); }}
            className={`border-2 border-dashed rounded-xl flex items-center justify-center min-h-[120px] cursor-pointer transition-colors ${
              dragOver === "__create__"
                ? "border-emerald-400 bg-emerald-50 text-emerald-600"
                : "border-gray-300 hover:border-gray-400 text-gray-400"
            }`}
          >
            {addingGroup ? (
              <div className="flex flex-col items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={newParentName}
                  onChange={(e) => setNewParentName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addUserParent();
                    if (e.key === "Escape") { setAddingGroup(false); setNewParentName(""); }
                  }}
                  placeholder="Group name…"
                  autoFocus
                  className="border border-gray-200 px-4 py-2 rounded-full text-sm w-48 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-emerald-400"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={addUserParent}
                    disabled={!newParentName.trim()}
                    className="bg-emerald-800 text-white px-4 py-1.5 rounded-full text-sm font-medium hover:bg-emerald-900 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setAddingGroup(false); setNewParentName(""); }}
                    className="text-gray-500 text-sm hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <span className="flex items-center gap-2 text-sm font-medium">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={16} height={16}>
                  <path d="M8.75 3.75a.75.75 0 0 0-1.5 0v3.5h-3.5a.75.75 0 0 0 0 1.5h3.5v3.5a.75.75 0 0 0 1.5 0v-3.5h3.5a.75.75 0 0 0 0-1.5h-3.5v-3.5Z" />
                </svg>
                NEW GROUP
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={reset}
            className="text-gray-500 hover:text-gray-700 text-sm flex items-center gap-1.5"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={14} height={14}>
              <path fillRule="evenodd" d="M7.793 2.232a.75.75 0 0 1-.025 1.06L3.622 7.25h10.003a5.375 5.375 0 0 1 0 10.75H10.75a.75.75 0 0 1 0-1.5h2.875a3.875 3.875 0 0 0 0-7.75H3.622l4.146 3.957a.75.75 0 0 1-1.036 1.085l-5.5-5.25a.75.75 0 0 1 0-1.085l5.5-5.25a.75.75 0 0 1 1.061.025Z" clipRule="evenodd" />
            </svg>
            Reset
          </button>
          <button
            onClick={handleContinue}
            disabled={submitting}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Saving…" : "Continue"}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" width={16} height={16}>
              <path fillRule="evenodd" d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
