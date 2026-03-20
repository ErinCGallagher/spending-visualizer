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

interface PanelProps {
  categories: string[];
  existing: Category[];
  submitting: boolean;
  onBack: () => void;
  onContinue: (assignments: CategoryAssignment[]) => void;
  onToggleMode: () => void;
}

function LockIcon({ size = 12 }: { size?: number }) {
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

function DragHandle() {
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

function ToggleTabs({ active, onToggle }: { active: "basic" | "advanced"; onToggle: () => void }) {
  return (
    <div className="flex items-center gap-1">
      <button
        onClick={active === "advanced" ? onToggle : undefined}
        className={
          active === "basic"
            ? "border-2 border-emerald-800 text-gray-900 font-semibold rounded-full px-4 py-1.5 text-sm"
            : "text-gray-500 px-4 py-1.5 text-sm hover:text-gray-700"
        }
      >
        Basic
      </button>
      <button
        onClick={active === "basic" ? onToggle : undefined}
        className={
          active === "advanced"
            ? "border-2 border-emerald-800 text-gray-900 font-semibold rounded-full px-4 py-1.5 text-sm"
            : "text-gray-500 px-4 py-1.5 text-sm hover:text-gray-700"
        }
      >
        Advanced
      </button>
    </div>
  );
}

function BasicPanel({ categories, existing, submitting, onBack, onContinue, onToggleMode }: PanelProps) {
  const lockedNames = new Set(
    existing.flatMap((c) => [c.name, ...(c.children ?? []).map((ch) => ch.name)])
  );

  function handleContinue() {
    onContinue(categories.map((name) => ({ categoryName: name, parentName: null })));
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        Review the categories we found in your uploaded transactions and confirm they look right.
      </p>

      <ToggleTabs active="basic" onToggle={onToggleMode} />

      {categories.length === 0 ? (
        <p className="text-sm text-gray-500 mt-4">No categories were detected in this file.</p>
      ) : (
        <div className="mt-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">
            Categories ({categories.length})
          </h3>
          <ul className="flex flex-wrap gap-2">
            {categories.map((name) =>
              lockedNames.has(name) ? (
                <li
                  key={name}
                  className="border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-500 flex items-center gap-1"
                >
                  <LockIcon size={12} />
                  {name}
                </li>
              ) : (
                <li
                  key={name}
                  className="border border-gray-200 rounded-full px-3 py-1 text-sm text-gray-700"
                >
                  {name}
                </li>
              )
            )}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between mt-6">
        <button
          onClick={onBack}
          className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium hover:bg-gray-50"
        >
          Back
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
  );
}

const GROUP_COLORS = [
  "bg-indigo-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-sky-500",
  "bg-teal-500",
  "bg-amber-500",
];

function AdvancedPanel({ categories, existing, submitting, onBack, onContinue, onToggleMode }: PanelProps) {
  const lockedNames = new Set(
    existing.flatMap((c) => [c.name, ...(c.children ?? []).map((ch) => ch.name)])
  );

  // user-created parent group names (not from the CSV)
  const [userParents, setUserParents] = useState<string[]>([]);
  // child category name → parent name
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [newParentName, setNewParentName] = useState("");
  const [addingGroup, setAddingGroup] = useState(false);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);

  // CSV categories that have been implicitly promoted by having children dragged onto them
  const promotedParents = [...new Set(Object.values(assignments))].filter((p) =>
    categories.includes(p)
  );

  // allParents deduped — a CSV category can be both explicitly added to userParents
  // and later appear in promotedParents once it has children
  const allParents = [...new Set([...userParents, ...promotedParents])];

  // Categories sitting in the unassigned pool (not a child, not a promoted parent, not explicitly promoted)
  const pool = categories.filter(
    (c) => !(c in assignments) && !promotedParents.includes(c) && !userParents.includes(c)
  );

  const allLocked = categories.length > 0 && categories.every((c) => lockedNames.has(c));

  function getChildren(parent: string) {
    return Object.entries(assignments)
      .filter(([, p]) => p === parent)
      .map(([c]) => c);
  }

  // Dragging a pool chip onto another pool chip promotes the target to a parent
  function handleDropOnPoolItem(target: string) {
    if (!dragging || dragging === target || allParents.includes(dragging)) return;
    setAssignments((prev) => {
      const next = { ...prev };
      // If target was already a child somewhere, remove that assignment first
      delete next[target];
      next[dragging] = target;
      return next;
    });
    setDragging(null);
    setDragOver(null);
  }

  function handleDropOnParent(parent: string) {
    if (!dragging || allParents.includes(dragging)) return;
    setAssignments((prev) => ({ ...prev, [dragging]: parent }));
    setDragging(null);
    setDragOver(null);
  }

  // Dropping onto the "create group" zone promotes the chip to a parent group
  function handleDropToCreateGroup() {
    if (!dragging || allParents.includes(dragging)) return;
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[dragging];
      return next;
    });
    setUserParents((prev) => [...prev, dragging]);
    setDragging(null);
    setDragOver(null);
  }

  // Dropping onto the pool area unassigns the item
  function handleDropToPool() {
    if (!dragging) return;
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[dragging];
      return next;
    });
    setDragging(null);
    setDragOver(null);
  }

  function unassign(child: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      delete next[child];
      return next;
    });
  }

  function reset() {
    setUserParents([]);
    setAssignments({});
    setNewParentName("");
    setAddingGroup(false);
  }

  function addUserParent() {
    const name = newParentName.trim();
    if (!name || allParents.includes(name) || categories.includes(name)) return;
    setUserParents((prev) => [...prev, name]);
    setNewParentName("");
    setAddingGroup(false);
  }

  function deleteUserParent(parent: string) {
    setAssignments((prev) => {
      const next = { ...prev };
      for (const [child, p] of Object.entries(next)) {
        if (p === parent) delete next[child];
      }
      return next;
    });
    setUserParents((prev) => prev.filter((p) => p !== parent));
  }

  function handleContinue() {
    onContinue(
      categories.map((name) => ({ categoryName: name, parentName: assignments[name] ?? null }))
    );
  }

  return (
    <div>
      <ToggleTabs active="advanced" onToggle={onToggleMode} />

      {/* HOW IT WORKS info box */}
      <div className="border border-gray-200 rounded-xl p-4 mb-6 mt-4">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-3">
          How it works
        </p>
        <div className="grid grid-cols-4 gap-4">
          <div className="flex flex-col gap-1.5">
            {/* Cursor/arrow icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={16} height={16} className="text-gray-400">
              <path d="M2.5 1a.5.5 0 0 0-.5.5v11.793l2.146-2.147a.5.5 0 0 1 .708 0L7 13.293V2.5a.5.5 0 0 0-.5-.5h-4ZM8 2.5V14l2.646-2.646a.5.5 0 0 1 .708 0L14 14V2.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5Z" />
            </svg>
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Drag and drop</span> ungrouped items into the coloured group cards below.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Folder-in icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={16} height={16} className="text-gray-400">
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9A3 3 0 0 0 1 9.5V3.5ZM1 9.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3Zm8.854-.146a.5.5 0 0 0-.708-.708L7.5 10.293V8a.5.5 0 0 0-1 0v2.293L4.854 8.646a.5.5 0 1 0-.708.708l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5Z" />
            </svg>
            <p className="text-xs text-gray-600">
              Drop an item onto a group card to add it as a sub-category.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Folder-plus icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={16} height={16} className="text-gray-400">
              <path d="M1 3.5A1.5 1.5 0 0 1 2.5 2h2.764c.958 0 1.76.56 2.311 1.184C7.985 3.648 8.48 4 9 4h4.5A1.5 1.5 0 0 1 15 5.5v1.401a2.986 2.986 0 0 0-1.5-.401h-9A3 3 0 0 0 1 9.5V3.5ZM1 9.5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2v-3Zm7-1a.5.5 0 0 0-1 0V10H5.5a.5.5 0 0 0 0 1H7v1.5a.5.5 0 0 0 1 0V11h1.5a.5.5 0 0 0 0-1H8V8.5Z" />
            </svg>
            <p className="text-xs text-gray-600">
              Create brand new groups or add items manually as needed.
            </p>
          </div>
          <div className="flex flex-col gap-1.5">
            {/* Lock icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" width={16} height={16} className="text-gray-400">
              <path d="M11.5 7h-7A1.5 1.5 0 0 0 3 8.5v5A1.5 1.5 0 0 0 4.5 15h7a1.5 1.5 0 0 0 1.5-1.5v-5A1.5 1.5 0 0 0 11.5 7ZM8 11.5a1 1 0 1 1 0-2 1 1 0 0 1 0 2ZM5.5 6V5a2.5 2.5 0 0 1 5 0v1h-5Z" />
            </svg>
            <p className="text-xs text-gray-600">
              <span className="font-semibold">Locked groups</span> are pre-set and can&apos;t be removed, but you can add items to them.
            </p>
          </div>
        </div>
      </div>

      {/* Ungrouped section */}
      <div className="flex items-center gap-3 mb-2">
        <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase">
          Ungrouped
        </p>
        {allLocked && (
          <p className="text-xs text-warning">Cannot be modified, pre-existing.</p>
        )}
      </div>
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
          pool.map((name) =>
            lockedNames.has(name) ? (
              <span
                key={name}
                className="border border-gray-300 rounded-full px-3 py-1 text-sm text-gray-500 flex items-center gap-1 select-none"
              >
                <LockIcon size={12} />
                {name}
              </span>
            ) : (
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
            )
          )
        )}
      </div>

      {/* Groups section */}
      <p className="text-xs font-semibold tracking-widest text-gray-400 uppercase mb-2 mt-6">
        Groups
      </p>
      {allLocked ? (
        <p className="text-sm text-warning italic">Cannot be modified.</p>
      ) : (
      <div className="grid grid-cols-2 gap-4">
        {allParents.map((parent, index) => {
          const children = getChildren(parent);
          const isUserCreated = userParents.includes(parent);
          const isLocked = lockedNames.has(parent);
          const headerColor = GROUP_COLORS[index % GROUP_COLORS.length];

          if (isLocked) {
            return (
              <div
                key={parent}
                onDragOver={(e) => { e.preventDefault(); setDragOver(parent); }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => { e.preventDefault(); handleDropOnParent(parent); }}
                className={`border border-dashed border-gray-300 rounded-xl p-3 transition-colors ${
                  dragOver === parent ? "bg-emerald-50 border-emerald-300" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <LockIcon size={12} />
                  <span className="text-sm font-semibold text-gray-700">{parent}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">locked</span>
                  <span className="text-xs text-gray-400">{children.length} items</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {children.map((child) => (
                    <span
                      key={child}
                      className="border border-dashed border-gray-300 rounded-full px-3 py-1 text-sm text-gray-500 flex items-center gap-1"
                    >
                      <LockIcon size={12} />
                      {child}
                    </span>
                  ))}
                </div>
              </div>
            );
          }

          return (
            <div
              key={parent}
              onDragOver={(e) => { e.preventDefault(); setDragOver(parent); }}
              onDragLeave={() => setDragOver(null)}
              onDrop={(e) => { e.preventDefault(); handleDropOnParent(parent); }}
              className={`rounded-xl overflow-hidden transition-colors ${
                dragOver === parent ? "ring-2 ring-emerald-300" : ""
              }`}
            >
              {/* Card header */}
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
              {/* Card body */}
              <div className="border border-t-0 border-gray-200 rounded-b-lg p-3 flex flex-wrap gap-2">
                {children.length === 0 && dragOver !== parent && (
                  <span className="text-xs text-gray-400 italic self-center">Drop items here</span>
                )}
                {children.map((child) =>
                  lockedNames.has(child) ? (
                    <span
                      key={child}
                      className="border border-dashed border-gray-300 rounded-full px-3 py-1 text-sm text-gray-500 flex items-center gap-1 select-none"
                    >
                      <LockIcon size={12} />
                      {child}
                    </span>
                  ) : (
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
                  )
                )}
              </div>
            </div>
          );
        })}

        {/* New group card */}
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
            <div
              className="flex flex-col items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={newParentName}
                onChange={(e) => setNewParentName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addUserParent(); if (e.key === "Escape") { setAddingGroup(false); setNewParentName(""); } }}
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
      )}

      {/* Bottom bar */}
      <div className="flex items-center justify-between mt-6">
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

export default function StepCategories({
  parsedCategories,
  onBack,
  onContinue,
}: Props) {
  const [existing, setExisting] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"basic" | "advanced">("basic");

  useEffect(() => {
    fetch("/api/categories", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Category[]) => setExisting(data))
      .catch(() => setError("Failed to load existing categories."))
      .finally(() => setLoading(false));
  }, []);

  async function handleContinue(assignments: CategoryAssignment[]) {
    setSubmitting(true);
    setError(null);

    // Build the full category hierarchy to send to the organise endpoint.
    // Preserve the existing taxonomy and append new categories with their assignments.
    const categoryList: { name: string; parentName: string | null }[] = [];

    for (const main of existing) {
      categoryList.push({ name: main.name, parentName: null });
      for (const sub of main.children ?? []) {
        categoryList.push({ name: sub.name, parentName: main.name });
      }
    }

    // Any parent name referenced in assignments that isn't already in the list
    // must be added first (covers user-created groups and promoted CSV categories).
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
        setError(data.message ?? "Failed to organise categories.");
        return;
      }

      onContinue(data, assignments);
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading categories…</p>;
  }

  const sharedProps = {
    categories: parsedCategories,
    existing,
    submitting,
    onBack,
    onContinue: handleContinue,
    onToggleMode: () => setMode((m) => (m === "basic" ? "advanced" : "basic")),
  };

  return (
    <div>
      {error && (
        <p className="text-sm text-red-600 mb-4">{error}</p>
      )}

      {mode === "basic" ? (
        <BasicPanel {...sharedProps} />
      ) : (
        <AdvancedPanel {...sharedProps} />
      )}
    </div>
  );
}
