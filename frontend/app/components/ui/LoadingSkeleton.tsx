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

/** Two-line chart skeleton: a short header bar and a tall chart area. */
export function SkeletonChart() {
  return (
    <div className="space-y-2">
      <SkeletonBlock className="h-4 w-24" />
      <SkeletonBlock className="h-56" />
    </div>
  );
}
