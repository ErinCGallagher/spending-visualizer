/**
 * Keeps the active dashboard tab in the URL (?tab=overview|trip|budget) so a
 * refresh, a shared link, or navigating back from /budget/setup lands on the
 * same tab. The URL is the single source of truth — no local state to sync.
 */

"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export type DashboardView = "overview" | "trip" | "budget";

const PARAM = "tab";

function isDashboardView(value: string | null): value is DashboardView {
  return value === "overview" || value === "trip" || value === "budget";
}

export function useDashboardView(): [DashboardView, (view: DashboardView) => void] {
  const router = useRouter();
  const searchParams = useSearchParams();

  const raw = searchParams.get(PARAM);
  const view: DashboardView = isDashboardView(raw) ? raw : "overview";

  const setView = useCallback(
    (next: DashboardView) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(PARAM, next);
      router.replace(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  return [view, setView];
}
