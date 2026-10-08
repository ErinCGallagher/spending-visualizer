/** Budget creation screen — select categories and set a monthly amount for each. */

"use client";

import Link from "next/link";

export default function BudgetSetupPage() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gray-500 text-sm">Budget creation is coming soon.</p>
      <Link
        href="/dashboard"
        className="bg-emerald-800 hover:bg-emerald-900 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
      >
        Back to dashboard
      </Link>
    </main>
  );
}
