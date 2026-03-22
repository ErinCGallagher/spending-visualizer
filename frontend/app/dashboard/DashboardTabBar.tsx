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
    <div className="flex border-b border-gray-200">
      {TABS.map(({ key, label }) => {
        const isActive = activeView === key;
        return (
          <button
            key={key}
            onClick={() => onSwitch(key)}
            className={`flex-1 py-3.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              isActive
                ? "text-gray-900 font-semibold border-[#064E3B]"
                : "text-[#064E3B] border-transparent hover:text-emerald-800"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
