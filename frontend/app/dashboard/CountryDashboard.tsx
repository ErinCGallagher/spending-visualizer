/**
 * Country Dashboard — per-country spending summary with category breakdown.
 * Owns its own filter state and drives the country summary table, category
 * table, and category pie chart.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import Filters, { type FilterValues } from "@/app/dashboard/Filters";
import DashboardTabBar from "@/app/dashboard/DashboardTabBar";
import CountrySummaryTable from "@/app/dashboard/CountrySummaryTable";
import CountryCategoryTable from "@/app/dashboard/CountryCategoryTable";
import CategoryPieChart, {
  type CategoryTotal,
} from "@/app/dashboard/CategoryPieChart";

interface FilterState {
  from: string;
  to: string;
  travellers: string[];
}

interface Props {
  onSwitchView: (view: "overview" | "country") => void;
}

export default function CountryDashboard({ onSwitchView }: Props) {
  const [filterState, setFilterState] = useState<FilterState>({
    from: "",
    to: "",
    travellers: [],
  });
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [categoryData, setCategoryData] = useState<CategoryTotal[]>([]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const currency = "CAD";

  useEffect(() => {
    setCategoryLoading(true);
    const params = new URLSearchParams();
    if (filterState.from) params.set("from", filterState.from);
    if (filterState.to) params.set("to", filterState.to);
    for (const t of filterState.travellers) params.append("traveller", t);
    if (selectedCountry) params.set("country", selectedCountry);
    fetch(`/api/charts/category-totals?${params}`, { credentials: "include" })
      .then((r) => r.json())
      .then((data) => setCategoryData(data))
      .catch(() => setCategoryData([]))
      .finally(() => setCategoryLoading(false));
  }, [selectedCountry, filterState]);

  const handleFiltersChange = useCallback((f: FilterValues) => {
    setFilterState({
      from: f.from,
      to: f.to,
      travellers: f.travellers,
    });
    // Reset selection when filters change so stale category data is not shown
    setSelectedCountry(null);
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-4">
      <DashboardTabBar activeView="country" onSwitch={onSwitchView} />
      <div className="bg-gray-50 rounded-lg border border-gray-100 p-4">
        <Filters onChange={handleFiltersChange} />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
          <CountrySummaryTable
            filters={filterState}
            onSelect={setSelectedCountry}
            selectedCountry={selectedCountry}
            currency={currency}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
            <CountryCategoryTable
              country={selectedCountry}
              filters={filterState}
              data={categoryData}
              loading={categoryLoading}
              currency={currency}
            />
          </div>
          <div className="bg-gray-50 rounded-lg border border-gray-100 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">
              Category breakdown
            </h2>
            <CategoryPieChart
              data={categoryData}
              currency={currency}
              loading={categoryLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
