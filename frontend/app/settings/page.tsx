/**
 * Settings page — displays account information and provides an option to
 * permanently delete the account and all associated data.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SettingsPage() {
  const { data: session, isPending } = authClient.useSession();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteConfirm() {
    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const res = await fetch("/api/account", {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        setDeleteError("Something went wrong. Please try again.");
        setDeleteLoading(false);
        return;
      }

      await authClient.signOut({ callbackURL: "/login" });
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  if (isPending) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading…</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50"
            >
              Dashboard
            </Link>
            <Link
              href="/transactions"
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50"
            >
              Transactions
            </Link>
          </div>
        </div>

        {/* Account info */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Account</h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Name</dt>
              <dd className="font-medium text-gray-900">
                {session?.user?.name ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-500">Email</dt>
              <dd className="font-medium text-gray-900">
                {session?.user?.email ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        {/* Danger zone */}
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-red-700">Danger zone</h2>
          <p className="text-sm text-gray-600">
            Permanently delete your account and all associated data. This cannot
            be undone.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
          >
            Delete account
          </button>
        </div>
      </div>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl border border-gray-200 shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-base font-semibold text-gray-900">
              Delete account
            </h3>
            <p className="text-sm text-gray-600">
              This will permanently delete your account and all your data. This
              cannot be undone.
            </p>

            {deleteError && (
              <p className="text-sm text-red-600">{deleteError}</p>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeleteError(null);
                }}
                disabled={deleteLoading}
                className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-lg font-medium text-sm hover:bg-gray-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteConfirm}
                disabled={deleteLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm disabled:opacity-40"
              >
                {deleteLoading ? "Deleting…" : "Delete account"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
