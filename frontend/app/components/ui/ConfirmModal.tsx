/**
 * Generic confirmation modal with optional danger styling.
 * Rendered via a portal at document.body to avoid being clipped by
 * transformed ancestors (e.g. page transition wrappers).
 * Used for destructive actions that require explicit user confirmation.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  loadingLabel?: string;
  danger?: boolean;
  error?: string;
  requiredConfirmText?: string;
}

export default function ConfirmModal({
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  loading = false,
  loadingLabel = "Loading…",
  danger = false,
  error,
  requiredConfirmText,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [confirmInput, setConfirmInput] = useState("");
  const portalRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    portalRef.current = document.body;
    setMounted(true);
  }, []);

  const isConfirmDisabled = loading || (requiredConfirmText !== undefined && confirmInput !== requiredConfirmText);

  if (!mounted || !portalRef.current) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
        
        {requiredConfirmText && (
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Please type <span className="font-bold text-gray-900 select-none">{requiredConfirmText}</span> to confirm.
            </p>
            <input
              type="text"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              placeholder={`Type ${requiredConfirmText} here`}
              autoFocus
            />
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
        
        <div className="flex gap-3 justify-end pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isConfirmDisabled}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 transition-opacity ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-800 hover:bg-emerald-900 text-white"
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    portalRef.current
  );
}
