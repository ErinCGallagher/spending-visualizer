/**
 * Tab bar shared between Overview and Country dashboard views.
 */

"use client";

type View = "overview" | "trip";

interface Props {
  activeView: View;
  onSwitch: (view: View) => void;
}

const TABS: { key: View; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "trip", label: "Trip" },
];

export default function DashboardTabBar({ activeView, onSwitch }: Props) {
  return (
    <div className="flex items-center justify-between pb-6 border-b border-gray-100">
      <h2 className="text-base font-semibold text-gray-900">
        {TABS.find((t) => t.key === activeView)?.label}
      </h2>
      <div className="flex items-center gap-6">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onSwitch(key)}
            className={`text-base font-medium pb-0.5 transition-colors ${
              activeView === key
                ? "text-gray-900 border-b-2 border-emerald-700"
                : "text-gray-400 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
