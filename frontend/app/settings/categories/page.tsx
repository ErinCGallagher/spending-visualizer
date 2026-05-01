/**
 * Credit card category mappings page — shows how merchant names are
 * automatically mapped to categories.
 */

"use client";

import Link from "next/link";
import { useState } from "react";
import { useFetch } from "@/app/hooks/useFetch";
import NavBar from "@/app/components/NavBar";
import type { Category } from "@/app/upload/types";

interface Mapping {
  merchant_key: string;
  category_id: string;
  category_name: string;
  parent_id: string | null;
  parent_name: string | null;
}

export default function CategoryMappingsPage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { data: mappings, loading, error } = useFetch<Mapping[]>("/api/categories/mappings", [refreshTrigger]);
  const { data: taxonomy } = useFetch<Category[]>("/api/categories", []);

  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [selectedSubId, setSelectedSubId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleEdit = (mapping: Mapping) => {
    setEditingKey(mapping.merchant_key);
    // If it has a parent, the parent_id is the main category, and category_id is the sub
    if (mapping.parent_id) {
      setSelectedParentId(mapping.parent_id);
      setSelectedSubId(mapping.category_id);
    } else {
      setSelectedParentId(mapping.category_id);
      setSelectedSubId("");
    }
    setSaveError(null);
  };

  const handleCancel = () => {
    setEditingKey(null);
    setSaveError(null);
  };

  const handleSave = async (merchantKey: string) => {
    setSaving(true);
    setSaveError(null);

    const categoryId = selectedSubId || selectedParentId;

    try {
      const res = await fetch("/api/categories/mappings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ merchantKey, categoryId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update mapping");
      }

      setRefreshTrigger(prev => prev + 1);
      setEditingKey(null);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const currentParent = taxonomy?.find(c => c.id === selectedParentId);

  return (
    <main className="min-h-screen">
      <NavBar
        links={[
          { label: "Dashboards", href: "/dashboard" },
          { label: "Transactions", href: "/transactions" },
          { label: "Settings", href: "/settings" },
        ]}
      />
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Breadcrumbs / Header */}
        <div className="space-y-2">
          <Link
            href="/settings"
            className="text-sm font-medium text-white/70 hover:text-white flex items-center gap-1 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
            </svg>
            Back to settings
          </Link>
          <h1 className="text-2xl font-bold text-white">Credit card categories</h1>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 bg-slate-50/30">
            <p className="text-gray-600 text-sm leading-relaxed">
              These mappings are created when you upload credit card statements. They help automatically categorise future transactions from the same merchants.
            </p>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Loading mappings…</p>
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-red-500">Failed to load mappings.</p>
              </div>
            ) : !mappings || mappings.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">No mappings found yet. They will appear here after you upload and categorise credit card transactions.</p>
              </div>
            ) : (
              <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-slate-50/50">
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Merchant / Keyword</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Parent Category</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider border-r border-gray-100">Sub Category (optional)</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {mappings.map((mapping) => {
                      const isEditing = editingKey === mapping.merchant_key;
                      const hasParent = mapping.parent_name !== null;
                      const parentDisplay = mapping.parent_name ?? mapping.category_name;
                      const subDisplay = hasParent ? mapping.category_name : null;

                      return (
                        <tr key={mapping.merchant_key} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 border-r border-gray-100">
                            {mapping.merchant_key}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">
                            {isEditing ? (
                              <select
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"
                                value={selectedParentId}
                                onChange={(e) => {
                                  setSelectedParentId(e.target.value);
                                  setSelectedSubId("");
                                }}
                              >
                                {taxonomy?.map(cat => (
                                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                                ))}
                              </select>
                            ) : (
                              parentDisplay
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium border-r border-gray-100">
                            {isEditing ? (
                              <select
                                className="w-full text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500 disabled:bg-gray-50 disabled:text-gray-400"
                                value={selectedSubId}
                                onChange={(e) => setSelectedSubId(e.target.value)}
                                disabled={!currentParent || currentParent.children.length === 0}
                              >
                                <option value="">None</option>
                                {currentParent?.children.map(child => (
                                  <option key={child.id} value={child.id}>{child.name}</option>
                                ))}
                              </select>
                            ) : (
                              subDisplay ?? <span className="text-gray-300">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-900 font-medium">
                            {isEditing ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSave(mapping.merchant_key)}
                                  disabled={saving}
                                  className="text-emerald-600 hover:text-emerald-700 font-semibold disabled:opacity-50"
                                >
                                  {saving ? "..." : "Save"}
                                </button>
                                <button
                                  onClick={handleCancel}
                                  disabled={saving}
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => handleEdit(mapping)}
                                className="text-emerald-600 hover:text-emerald-700 transition-colors p-1.5 rounded-lg hover:bg-emerald-50 flex items-center gap-2 font-medium"
                              >
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  className="w-4 h-4"
                                >
                                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                                </svg>
                                <span>Edit</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {saveError && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                {saveError}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
