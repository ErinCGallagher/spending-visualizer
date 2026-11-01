/**
 * Filter bar for the dashboard — date range and traveller selectors.
 * Emits the current filter state on every change.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { endOfMonth, format, subDays } from "date-fns";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

export interface FilterValues {
  from: string;
  to: string;
  travellers: string[];
  countries: string[];
  groupTypes: string[];
  month?: string;
}

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

interface Props {
  meta: Meta | null;
  onChange: (filters: FilterValues) => void;
  initialValues?: Partial<FilterValues>;
  showTravellers?: boolean;
  showGroupType?: boolean;
  showDateRange?: boolean;
  showCountry?: boolean;
  showMonth?: boolean;
  /**
   * With showMonth, makes the year dropdown filter the data (an "All years"
   * option is added and month chips only appear once a year is chosen). Without
   * it, the year only picks which months the chips list.
   */
  filterByYear?: boolean;
}

type Preset = "30d" | "all";

function isoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

// Builds the list of "yyyy-MM" month keys spanning two ISO dates, inclusive.
function monthRange(fromStr: string, toStr: string): string[] {
  const [fy, fm] = fromStr.split("-").map(Number);
  const [ty, tm] = toStr.split("-").map(Number);
  const months: string[] = [];
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return format(new Date(y, m - 1, 1), "MMM yyyy");
}

/**
 * Whole-year range for the dashboard's default view: the current year if the
 * data covers it, otherwise the most recent year with data. Unbounded when
 * there is no data.
 */
export function defaultYearRange(
  dateRange: { from: string; to: string } | null,
  now: Date = new Date()
): { from: string; to: string } {
  if (!dateRange) return { from: "", to: "" };
  const firstYear = Number(dateRange.from.slice(0, 4));
  const lastYear = Number(dateRange.to.slice(0, 4));
  const current = now.getFullYear();
  const year = current >= firstYear && current <= lastYear ? current : lastYear;
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
  renderOption,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  renderOption?: (opt: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function toggle(option: string) {
    if (selected.includes(option)) {
      onChange(selected.filter((s) => s !== option));
    } else {
      onChange([...selected, option]);
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20 hover:bg-slate-100 transition-colors"
      >
        <span>
          {selected.length > 0 ? (
            <>
              {label}
              <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full">
                {selected.length}
              </span>
            </>
          ) : (
            `All ${label.toLowerCase()}s`
          )}
        </span>
        <span className="text-slate-400 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-slate-200 rounded-lg shadow-lg min-w-full py-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400">No options</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-slate-300 text-brand-primary"
                />
                {renderOption ? renderOption(opt) : opt}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Filters({
  meta,
  onChange,
  initialValues,
  showTravellers = true,
  showGroupType = true,
  showDateRange = true,
  showCountry = true,
  showMonth = false,
  filterByYear = false,
}: Props) {
  const [from, setFrom] = useState(initialValues?.from ?? "");
  const [to, setTo] = useState(initialValues?.to ?? "");
  const [month, setMonth] = useState("");
  const [selectedYear, setSelectedYear] = useState(
    filterByYear && initialValues?.from ? initialValues.from.slice(0, 4) : ""
  );
  const [travellers, setTravellers] = useState<string[]>(initialValues?.travellers ?? []);
  const [countries, setCountries] = useState<string[]>(initialValues?.countries ?? []);
  const [groupTypes, setGroupTypes] = useState<string[]>(initialValues?.groupTypes ?? []);
  const [activePreset, setActivePreset] = useState<Preset | null>(initialValues?.from || initialValues?.to ? null : "all");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const monthOptions = meta?.dateRange ? monthRange(meta.dateRange.from, meta.dateRange.to) : [];
  const years = Array.from(new Set(monthOptions.map((key) => key.slice(0, 4))));
  const monthsForYear = monthOptions.filter((key) => key.startsWith(selectedYear));
  const showMonthChips = !filterByYear || selectedYear !== "";

  // Default the year dropdown to the most recent year once the data range loads.
  useEffect(() => {
    if (!filterByYear && selectedYear === "" && years.length > 0) {
      setSelectedYear(years[years.length - 1]);
    }
  }, [years, selectedYear, filterByYear]);

  const hasActiveFilters =
    from !== "" ||
    to !== "" ||
    travellers.length > 0 ||
    countries.length > 0 ||
    groupTypes.length > 0;

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Emit debounced filter changes upward.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ from, to, travellers, countries, groupTypes, month });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [from, to, travellers, countries, groupTypes, month, onChange]);

  function setYearRange(year: string) {
    setFrom(year ? `${year}-01-01` : "");
    setTo(year ? `${year}-12-31` : "");
  }

  function handleYearChange(value: string) {
    setSelectedYear(value);
    if (!filterByYear) return;
    setMonth("");
    setYearRange(value);
  }

  function handleMonthChange(value: string) {
    setMonth(value);
    if (!value) {
      setYearRange(filterByYear ? selectedYear : "");
      return;
    }
    const [year, monthNum] = value.split("-").map(Number);
    const start = new Date(year, monthNum - 1, 1);
    setFrom(isoDate(start));
    setTo(isoDate(endOfMonth(start)));
  }

  function applyPreset(preset: Preset) {
    const today = new Date();
    setActivePreset(preset);
    switch (preset) {
      case "30d":
        setFrom(isoDate(subDays(today, 30)));
        setTo(isoDate(today));
        break;
      case "all":
        setFrom("");
        setTo("");
        break;
    }
  }

  const groupTypeFilter = (className: string) => (
    <div className={`space-y-1.5 ${className}`}>
      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
        Group Type
      </label>
      <MultiSelect
        label="Type"
        options={(meta?.groupTypes ?? []).map((gt) => gt.value)}
        selected={groupTypes}
        onChange={setGroupTypes}
        renderOption={(val) => meta?.groupTypes?.find((gt) => gt.value === val)?.label ?? val}
      />
    </div>
  );

  return (
    <div>
      {/* Mobile collapse toggle */}
      <button
        onClick={() => setFiltersOpen((o) => !o)}
        className="md:hidden w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-slate-400" />
          Filters
          {hasActiveFilters && (
            <span className="inline-flex items-center justify-center w-4 h-4 bg-brand-primary text-white text-[10px] font-bold rounded-full">
              !
            </span>
          )}
        </span>
        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
      </button>

    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-11 gap-4 ${filtersOpen ? "mt-3" : "hidden md:grid"}`}>
      {/* Date presets */}
      {showDateRange && (
        <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Quick range
          </label>
          <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
            {(
              [
                { key: "all", label: "All time" },
                { key: "30d", label: "Last 30d" },
              ] as { key: Preset; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => applyPreset(key)}
                className={`flex-1 px-3 py-1.5 text-sm font-semibold rounded-md transition-all whitespace-nowrap ${
                  activePreset === key
                    ? "bg-brand-primary text-white shadow-sm"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* From date */}
      {showDateRange && (
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="filter-from" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setActivePreset(null);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      )}

      {/* To date */}
      {showDateRange && (
        <div className="space-y-1.5 lg:col-span-2">
          <label htmlFor="filter-to" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setActivePreset(null);
            }}
            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
          />
        </div>
      )}

      {/* Year + month chips */}
      {showMonth && (
        <div className="flex flex-wrap gap-4 lg:col-span-11">
          <div className="space-y-1.5">
            <label htmlFor="filter-year" className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Year
            </label>
            <div>
              <select
                id="filter-year"
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              >
                {filterByYear && <option value="">All years</option>}
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {showMonthChips && (
          <div className="space-y-1.5 flex-1 min-w-0">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
              Month
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleMonthChange("")}
                className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                  month === ""
                    ? "bg-brand-primary text-white"
                    : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                }`}
              >
                All Months
              </button>
              {monthsForYear.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleMonthChange(key)}
                  className={`px-3 py-1.5 text-sm font-semibold rounded-full transition-colors ${
                    month === key
                      ? "bg-brand-primary text-white"
                      : "bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100"
                  }`}
                >
                  {monthLabel(key)}
                </button>
              ))}
            </div>
          </div>
          )}
          {showGroupType && groupTypeFilter("w-full sm:w-48 shrink-0 sm:ml-auto")}
        </div>
      )}

      {/* Traveller multi-select */}
      {showTravellers && (
        <div className="space-y-1.5 lg:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Traveller
          </label>
          <MultiSelect
            label="Traveller"
            options={meta?.travellers ?? []}
            selected={travellers}
            onChange={setTravellers}
          />
        </div>
      )}

      {/* Country multi-select */}
      {showCountry && (
        <div className="space-y-1.5 lg:col-span-2">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
            Country
          </label>
          <MultiSelect
            label="Country"
            options={meta?.countries ?? []}
            selected={countries}
            onChange={setCountries}
          />
        </div>
      )}

      {/* Group Type multi-select (sits at the end of the year/month row when that row is shown) */}
      {showGroupType && !showMonth && groupTypeFilter("lg:col-span-2")}
    </div>
    </div>
  );
}
