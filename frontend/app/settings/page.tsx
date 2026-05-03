/**
 * Settings page — displays account information and provides an option to
 * permanently delete the account and all associated data.
 */

"use client";

import { useEffect, useState } from "react";
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
  const [savingSettings, setSavingSettings] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [userSettings, setUserSettings] = useState<{
    overviewDefaultFilter: string | null;
    tripDefaultFilter: string | null;
    groupTypes: { value: string; label: string }[];
  } | null>(null);
  const [settingsLoadError, setSettingsLoadError] = useState(false);

  useEffect(() => {
    fetch("/api/account/settings", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => setUserSettings(d))
      .catch((err) => {
        console.error("Failed to load settings:", err);
        setSettingsLoadError(true);
      });
  }, []);

  async function updateDefaultFilter(field: "overviewDefaultFilter" | "tripDefaultFilter", value: string) {
    setSavingSettings(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/account/settings", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value || null }),
      });
      if (res.ok) {
        setUserSettings((prev) => prev ? { ...prev, [field]: value || null } : prev);
      } else {
        setSaveError("Failed to save. Please try again.");
      }
    } catch (err) {
      console.error("Failed to update settings:", err);
      setSaveError("Failed to save. Please try again.");
    } finally {
      setSavingSettings(false);
    }
  }

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

        {/* Dashboard Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Dashboard</h2>
          {settingsLoadError && (
            <p className="text-sm text-red-600">Failed to load settings. Please refresh the page.</p>
          )}
          <div className="space-y-6 text-sm">
            {/* Overview Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <dt className="font-semibold text-gray-900">Overview default filter</dt>
                <dd className="text-gray-500 text-xs mt-0.5">Which group type to show by default when opening the overview.</dd>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={userSettings?.overviewDefaultFilter ?? ""}
                  onChange={(e) => updateDefaultFilter("overviewDefaultFilter", e.target.value)}
                  disabled={savingSettings || !userSettings}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 disabled:opacity-50"
                >
                  <option value="">All groups</option>
                  {(userSettings?.groupTypes ?? []).map((gt) => (
                    <option key={gt.value} value={gt.value}>
                      {gt.label}
                    </option>
                  ))}
                </select>
                {savingSettings && (
                  <div className="w-4 h-4 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
                )}
                {saveError && (
                  <p className="text-xs text-red-600">{saveError}</p>
                )}
              </div>
            </div>

            {/* Trip Default */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 opacity-60">
              <div>
                <dt className="font-semibold text-gray-900">Trip default filter</dt>
                <dd className="text-gray-500 text-xs mt-0.5">Preferred default filter for the trip dashboard.</dd>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value=""
                  disabled
                  className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-not-allowed"
                >
                  <option value="">No default set</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
          <h2 className="text-sm font-semibold text-gray-700">Data Management</h2>
          <div className="space-y-3 text-sm">
            <Link
              href="/settings/categories"
              className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl hover:bg-slate-100 hover:border-slate-200 transition-all group shadow-sm"
            >
              <div>
                <dt className="font-semibold text-gray-900">Credit card categories</dt>
                <dd className="text-gray-500 text-xs mt-0.5">View and manage mappings from merchant names to categories.</dd>
              </div>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="w-6 h-6 text-gray-400 group-hover:text-gray-600 transition-colors"
              >
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </div>
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
          requiredConfirmText="DELETE"
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
