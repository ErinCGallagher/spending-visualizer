/**
 * Tab bar shared between Overview and Country dashboard views.
 * Spans the full width of the containing card with an underline indicator
 * on the active tab.
 */

"use client";

type View = "overview" | "trip";

interface Props {
  activeView: View;
  onSwitch: (view: View) => void;
}

const TABS: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trip", label: "Trips" },
];

export default function DashboardTabBar({ activeView, onSwitch }: Props) {
  return (
    <div className="flex border-b border-slate-100">
      {TABS.map(({ key, label }) => {
        const isActive = activeView === key;
        return (
          <button
            key={key}
            onClick={() => onSwitch(key)}
            className={`flex-1 py-4 text-base font-semibold transition-all border-b-2 ${
              isActive
                ? "border-brand-primary text-brand-primary bg-brand-primary/5"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
