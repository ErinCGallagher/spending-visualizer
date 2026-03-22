/**
 * Shared utilities for Recharts-based chart components.
 */

/** Consistent colour palette — cycles if there are more series than colours. */
export const CHART_COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#84cc16",
  "#f97316",
  "#6366f1",
];

/**
 * Pivots flat rows into one object per month with a key per category.
 * Returns the pivoted rows and the ordered list of all categories found.
 * When no categories are present, produces a single "Total" series.
 */
export function pivotData(data: { month: string; category?: string; total: number }[]): {
  pivoted: Record<string, number | string>[];
  categories: string[];
} {
  const months = Array.from(new Set(data.map((d) => d.month))).sort();
  const categories = Array.from(
    new Set(data.filter((d) => d.category).map((d) => d.category as string))
  );

  if (categories.length === 0) {
    // Ungrouped — single bar per month
    const pivoted = months.map((month) => {
      const row: Record<string, number | string> = { month };
      const match = data.find((d) => d.month === month);
      row["Total"] = match?.total ?? 0;
      return row;
    });
    return { pivoted, categories: ["Total"] };
  }

  const pivoted = months.map((month) => {
    const row: Record<string, number | string> = { month };
    for (const cat of categories) {
      const match = data.find((d) => d.month === month && d.category === cat);
      row[cat] = match?.total ?? 0;
    }
    return row;
  });

  return { pivoted, categories };
}
