/**
 * Parser Settings page — allows users to manage custom configurations for
 * different parsers, such as mapping Amex card numbers to names.
 */

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import NavBar from "@/app/components/NavBar";

interface ParserSetting {
  id: string;
  parserType: string;
  settingKey: string;
  settingValue: string;
}

export default function ParserSettingsPage() {
  const [settings, setSettings] = useState<ParserSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Form state
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/account/settings/parsers", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load settings");
        return r.json();
      })
      .then((d) => {
        setSettings(d.settings ?? []);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings.");
        setLoading(false);
      });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newKey || !newValue) return;

    setAdding(true);
    setError(null);

    try {
      const res = await fetch("/api/account/settings/parsers", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parserType: "amex",
          settingKey: newKey,
          settingValue: newValue,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add mapping.");
        return;
      }

      // Update local state (upsert)
      setSettings((prev) => {
        const filtered = prev.filter(s => !(s.parserType === "amex" && s.settingKey === newKey));
        return [...filtered, { id: data.id, parserType: "amex", settingKey: newKey, settingValue: newValue }];
      });
      setNewKey("");
      setNewValue("");
    } catch {
      setError("An unexpected error occurred.");
    } finally {
      setAdding(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/account/settings/parsers/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        setSettings((prev) => prev.filter((s) => s.id !== id));
        setConfirmDeleteId(null);
      } else {
        setError("Failed to delete mapping.");
      }
    } catch {
      setError("An unexpected error occurred.");
    }
  }

  const amexSettings = settings.filter(s => s.parserType === "amex");

  return (
    <main className="min-h-screen">
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
        ]}
      />
      <div className="max-w-3xl mx-auto px-6 py-8 space-y-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to settings
        </Link>

        <div>
          <h1 className="text-2xl font-bold text-white">Parser Settings</h1>
          <p className="text-emerald-200 text-sm mt-1">
            Configure how your CSV files are parsed.
          </p>
        </div>

        {/* Amex Mappings */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">American Express</h2>
            <p className="text-sm text-gray-500 mt-1">
              Map the suffix of the "Account #" column to a friendly card name.
            </p>
          </div>

          <div className="p-6 space-y-6">
            {/* Add form */}
            <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3">
              <div className="space-y-1.5 flex-1 min-w-[140px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Account # Suffix
                </label>
                <input
                  type="text"
                  placeholder="-12345"
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <div className="space-y-1.5 flex-[2] min-w-[200px]">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                  Card Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Amex Gold"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
                />
              </div>
              <button
                type="submit"
                disabled={adding || !newKey || !newValue}
                className="bg-emerald-800 hover:bg-emerald-900 text-white p-2.5 rounded-lg disabled:opacity-50 transition-colors"
              >
                {adding ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </form>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-100 px-3 py-2 rounded-lg">
                {error}
              </p>
            )}

            {/* List */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">
                Existing Mappings
              </h3>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                </div>
              ) : amexSettings.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  No mappings configured. Unknown cards will use their suffix.
                </p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg overflow-hidden">
                  {amexSettings.map((s) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded text-gray-700">
                          {s.settingKey}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {s.settingValue}
                        </span>
                      </div>
                      {confirmDeleteId === s.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Delete?</span>
                          <button
                            onClick={() => handleDelete(s.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-medium text-gray-400 hover:text-gray-600"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(s.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
