/**
 * Manages all data fetching for the dashboard overview.
 * Fetches meta once on mount, then re-fetches all four chart datasets
 * whenever filters or granularity settings change.
 */

"use client";

import { useCallback, useEffect, useState } from "react";
import type { FilterValues } from "@/app/dashboard/Filters";
import type { CategoryTotal } from "@/app/dashboard/CategoryPieChart";
import type { MonthlyTotal } from "@/app/dashboard/MonthlyBarChart";
import type { CumulativePoint, Granularity } from "@/app/dashboard/CumulativeLineChart";

export interface Meta {
  categories: { id: string; name: string }[];
  travellers: string[];
  paymentMethods: string[];
  countries: string[];
  dateRange: { from: string; to: string } | null;
  groups: { id: string; name: string; groupType: string }[];
  groupTypes: { value: string; label: string }[];
  overviewDefaultFilter: string | null;
  tripDefaultFilter: string | null;
  homeCurrency: string | null;
}

function buildParams(
  filters: FilterValues,
  extra: Record<string, string> = {}
): string {
  const params = new URLSearchParams();
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  for (const t of filters.travellers) params.append("traveller", t);
  for (const c of filters.countries) params.append("country", c);
  for (const gt of filters.groupTypes) params.append("groupType", gt);
  for (const [k, v] of Object.entries(extra)) params.set(k, v);
  return params.toString();
}

export interface DashboardData {
  meta: Meta | null;
  metaLoading: boolean;
  categoryData: CategoryTotal[];
  monthlyData: MonthlyTotal[];
  cumulativeData: CumulativePoint[];
  categoryTimelineData: MonthlyTotal[];
  categoryLoading: boolean;
  monthlyLoading: boolean;
  cumulativeLoading: boolean;
  categoryTimelineLoading: boolean;
}

export function useDashboardData(
  filters: FilterValues | null,
  monthlyGroupBy: "category" | "total",
  granularity: Granularity,
  categoryTimelineGranularity: Granularity
): DashboardData {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const [categoryData, setCategoryData] = useState<CategoryTotal[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyTotal[]>([]);
  const [cumulativeData, setCumulativeData] = useState<CumulativePoint[]>([]);
  const [categoryTimelineData, setCategoryTimelineData] = useState<MonthlyTotal[]>([]);

  const [categoryLoading, setCategoryLoading] = useState(false);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [cumulativeLoading, setCumulativeLoading] = useState(false);
  const [categoryTimelineLoading, setCategoryTimelineLoading] = useState(false);

  useEffect(() => {
    fetch("/api/transactions/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data))
      .catch(() =>
        setMeta({
          categories: [],
          travellers: [],
          paymentMethods: [],
          countries: [],
          dateRange: null,
          groups: [],
          groupTypes: [],
          overviewDefaultFilter: null,
          tripDefaultFilter: null,
          homeCurrency: null,
        })
      )
      .finally(() => setMetaLoading(false));
  }, []);

  const fetchCharts = useCallback(
    async (
      f: FilterValues,
      groupBy: "category" | "total",
      gran: Granularity,
      catTimelineGran: Granularity
    ) => {
      const base = buildParams(f);

      setCategoryLoading(true);
      setMonthlyLoading(true);
      setCumulativeLoading(true);
      setCategoryTimelineLoading(true);

      const [catRes, monthRes, cumRes, catTimelineRes] = await Promise.allSettled([
        fetch(`/api/charts/category-totals?${base}`, { credentials: "include" }),
        fetch(`/api/charts/monthly-totals?${buildParams(f, { groupBy })}`, { credentials: "include" }),
        fetch(`/api/charts/cumulative?${buildParams(f, { granularity: gran })}`, { credentials: "include" }),
        fetch(`/api/charts/monthly-totals?${buildParams(f, { groupBy: "category", granularity: catTimelineGran })}`, { credentials: "include" }),
      ]);

      if (catRes.status === "fulfilled" && catRes.value.ok) {
        setCategoryData(await catRes.value.json());
      }
      setCategoryLoading(false);

      if (monthRes.status === "fulfilled" && monthRes.value.ok) {
        setMonthlyData(await monthRes.value.json());
      }
      setMonthlyLoading(false);

      if (cumRes.status === "fulfilled" && cumRes.value.ok) {
        setCumulativeData(await cumRes.value.json());
      }
      setCumulativeLoading(false);

      if (catTimelineRes.status === "fulfilled" && catTimelineRes.value.ok) {
        setCategoryTimelineData(await catTimelineRes.value.json());
      }
      setCategoryTimelineLoading(false);
    },
    []
  );

  // Re-fetch charts whenever meta has loaded and any dependency changes
  useEffect(() => {
    if (filters && meta?.dateRange !== undefined) {
      fetchCharts(filters, monthlyGroupBy, granularity, categoryTimelineGranularity);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, monthlyGroupBy, granularity, categoryTimelineGranularity, meta]);

  return {
    meta,
    metaLoading,
    categoryData,
    monthlyData,
    cumulativeData,
    categoryTimelineData,
    categoryLoading,
    monthlyLoading,
    cumulativeLoading,
    categoryTimelineLoading,
  };
}
