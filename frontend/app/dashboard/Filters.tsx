/**
 * Filter bar for the dashboard — date range and traveller selectors.
 * Emits the current filter state on every change.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import { format, subDays } from "date-fns";

export interface FilterValues {
  from: string;
  to: string;
  travellers: string[];
  countries: string[];
}

interface Meta {
  travellers: string[];
  countries: string[];
  dateRange: { from: string; to: string } | null;
}

interface Props {
  onChange: (filters: FilterValues) => void;
}

type Preset = "30d" | "all";

function isoDate(d: Date) {
  return format(d, "yyyy-MM-dd");
}

function MultiSelect({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
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
        className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
      >
        {label}
        {selected.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center w-4 h-4 bg-blue-600 text-white text-xs rounded-full">
            {selected.length}
          </span>
        )}
        <span className="text-gray-400 ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 z-10 bg-white border border-gray-200 rounded-md shadow-lg min-w-40 py-1">
          {options.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">No options</p>
          ) : (
            options.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 px-3 py-1.5 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="rounded border-gray-300 text-blue-600"
                />
                {opt}
              </label>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function Filters({ onChange }: Props) {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [travellers, setTravellers] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState<Preset | null>("all");

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch("/api/transactions/meta", { credentials: "include" })
      .then((r) => r.json())
      .then((data: Meta) => setMeta(data))
      .catch(() => {
        // Non-fatal — filters just won't have options
      });
  }, []);

  // Emit debounced filter changes upward
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChange({ from, to, travellers, countries });
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [from, to, travellers, countries, onChange]);

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

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date presets */}
        <div className="flex items-center gap-1">
          {(
            [
              { key: "all", label: "All time" },
              { key: "30d", label: "Last 30 days" },
            ] as { key: Preset; label: string }[]
          ).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => applyPreset(key)}
              className={`px-2 py-1 text-xs rounded ${
                activePreset === key
                  ? "bg-blue-100 text-blue-700 font-medium"
                  : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        <div className="flex items-center gap-2 text-sm">
          <input
            type="date"
            value={from}
            onChange={(e) => {
              setFrom(e.target.value);
              setActivePreset(null);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={to}
            onChange={(e) => {
              setTo(e.target.value);
              setActivePreset(null);
            }}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Traveller multi-select */}
        <MultiSelect
          label="Traveller"
          options={meta?.travellers ?? []}
          selected={travellers}
          onChange={setTravellers}
        />

        {/* Country multi-select */}
        <MultiSelect
          label="Country"
          options={meta?.countries ?? []}
          selected={countries}
          onChange={setCountries}
        />
      </div>
    </div>
  );
}
