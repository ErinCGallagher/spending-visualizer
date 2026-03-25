/**
 * Skeleton loading primitives for charts and tables.
 */

"use client";

interface SkeletonBlockProps {
  className?: string;
}

/** Generic animated pulse block. */
export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={`animate-pulse bg-gray-100 rounded ${className ?? ""}`} />;
}

interface SkeletonRowsProps {
  /** Number of rows to render. */
  count: number;
  /** Number of cells per row (default 2). */
  columns?: number;
}

/** Table body rows for loading state. Each cell is a pulse block. */
export function SkeletonRows({ count, columns = 2 }: SkeletonRowsProps) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <tr key={i}>
          {Array.from({ length: columns }, (__, j) => (
            <td key={j} className="py-2 pr-4">
              <div className="animate-pulse h-4 bg-gray-100 rounded" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

/** Chart skeleton: animated bars mimicking a bar chart. */
export function SkeletonChart() {
  const barHeights = [55, 80, 40, 70, 90, 50, 75, 45, 65, 85];
  return (
    <div className="h-56 flex items-end gap-2">
      {barHeights.map((h, i) => (
        <div
          key={i}
          className="animate-pulse bg-gray-100 rounded flex-1"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

/** Pie chart skeleton: a pulsing circle matching CategoryPieChart's dimensions. */
export function SkeletonPieChart() {
  return (
    <div className="h-64 flex items-center justify-center">
      <div className="animate-pulse w-40 h-40 rounded-full bg-gray-100" />
    </div>
  );
}

/** Trip dashboard skeleton mirroring CountryDashboard's table + chart layout. */
export function CountryDashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Summary table */}
      <div className="bg-slate-50/50 rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-white/50">
          <SkeletonBlock className="h-3 w-32" />
        </div>
        <div className="px-6 py-2 divide-y divide-slate-100">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="py-4 flex gap-4">
              <SkeletonBlock className="h-4 flex-1" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-12" />
              <SkeletonBlock className="h-4 w-20" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      {/* Category breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6 space-y-4">
          <SkeletonBlock className="h-4 w-40" />
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="py-3 flex justify-between gap-4">
                <SkeletonBlock className="h-4 w-24" />
                <SkeletonBlock className="h-4 w-16" />
              </div>
            ))}
          </div>
        </div>
        <div className="bg-slate-50/50 rounded-2xl border border-slate-100 p-6">
          <SkeletonBlock className="h-4 w-40 mb-6" />
          <SkeletonPieChart />
        </div>
      </div>
    </div>
  );
}

/** Full dashboard skeleton mirroring DashboardOverview's 4-chart layout. */
export function DashboardOverviewSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <SkeletonBlock className="h-4 w-44 mb-6" />
          <SkeletonPieChart />
        </div>
        <div>
          <SkeletonBlock className="h-4 w-36 mb-6" />
          <SkeletonChart />
        </div>
      </div>
      <div className="pt-8 border-t border-slate-100">
        <SkeletonBlock className="h-4 w-40 mb-6" />
        <SkeletonChart />
      </div>
      <div className="pt-8 border-t border-slate-100">
        <SkeletonBlock className="h-4 w-56 mb-6" />
        <SkeletonChart />
      </div>
    </div>
  );
}
