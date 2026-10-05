/**
 * Modal for choosing a parent + optional sub category, used for both
 * single-transaction and bulk category edits on the transactions page.
 * Rendered via a portal, matching ConfirmModal's overlay/panel styling.
 */

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Category } from "@/app/upload/types";

interface Props {
  title: string;
  description: string;
  taxonomy: Category[];
  initialParentId?: string;
  initialSubId?: string;
  saving: boolean;
  error?: string;
  onSave: (categoryId: string) => void;
  onCancel: () => void;
}

export default function CategoryPickerModal({
  title,
  description,
  taxonomy,
  initialParentId,
  initialSubId,
  saving,
  error,
  onSave,
  onCancel,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const portalRef = useRef<HTMLElement | null>(null);

  const [parentId, setParentId] = useState(initialParentId ?? "");
  const [subId, setSubId] = useState(initialSubId ?? "");

  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);

  const parentCategories = useMemo(
    () => taxonomy.filter((c) => c.parentId === null),
    [taxonomy]
  );
  const currentParent = taxonomy.find((c) => c.id === parentId);

  const isSaveDisabled = saving || !parentId;

  if (!mounted || !portalRef.current) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Parent category
            </label>
            <select
              value={parentId}
              onChange={(e) => {
                setParentId(e.target.value);
                setSubId("");
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            >
              <option value="">Select a category…</option>
              {parentCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-gray-600">
              Sub category
            </label>
            <select
              value={subId}
              onChange={(e) => setSubId(e.target.value)}
              disabled={!currentParent || currentParent.children.length === 0}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
            >
              <option value="">None</option>
              {currentParent?.children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(subId || parentId)}
            disabled={isSaveDisabled}
            className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 transition-opacity"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>,
    portalRef.current
  );
}
