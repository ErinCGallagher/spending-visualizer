/**
 * Settings page — displays account information and provides an option to
 * permanently delete the account and all associated data.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import ConfirmModal from "@/app/components/ui/ConfirmModal";
import NavBar from "@/app/components/NavBar";

export default function SettingsPage() {
  const router = useRouter();
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

      await authClient.signOut();
      router.push("/login");
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
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
        ]}
        actions={
          <Link
            href="/upload"
            className="flex items-center gap-2 bg-[#064E3B] hover:bg-[#053d2f] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
            </svg>
            Import transactions
          </Link>
        }
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
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

      {showDeleteModal && (
        <ConfirmModal
          title="Delete account"
          description="This will permanently delete your account and all your data. This cannot be undone."
          confirmLabel="Delete account"
          loadingLabel="Deleting…"
          onConfirm={handleDeleteConfirm}
          onCancel={() => {
            setShowDeleteModal(false);
            setDeleteError(null);
          }}
          loading={deleteLoading}
          danger
          error={deleteError ?? undefined}
        />
      )}
    </main>
  );
}
