/**
 * Generic confirmation modal with optional danger styling.
 * Used for destructive actions that require explicit user confirmation.
 */

"use client";

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
}: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{description}</p>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={loading}
            className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40 ${
              danger
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-emerald-800 hover:bg-emerald-900 text-white"
            }`}
          >
            {loading ? loadingLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
