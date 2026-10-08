/**
 * Pure helpers for aggregating budget-vs-actual spend into the stats shown
 * on the Budget tab. Kept free of fetch/DOM concerns so they're unit
 * testable without rendering anything.
 */

export interface MonthlyActual {
  month: string;
  actual: number;
}

export interface BudgetStats {
  ytdActual: number;
  ytdBudget: number;
  avgMonthlyActual: number;
  avgMonthlyBudget: number;
}

/** Sums per-category monthly actuals into one total per month. */
export function aggregateMonthlyActuals(
  monthly: { month: string; actual: number }[]
): MonthlyActual[] {
  const totals = new Map<string, number>();
  for (const m of monthly) {
    totals.set(m.month, (totals.get(m.month) ?? 0) + m.actual);
  }
  return Array.from(totals.entries())
    .map(([month, actual]) => ({ month, actual }))
    .sort((a, b) => a.month.localeCompare(b.month));
}

/**
 * Computes YTD actual/budget and average monthly actual/budget.
 * YTD budget assumes the monthly budget amount applies to every calendar
 * month from January through the current month.
 */
export function computeBudgetStats(
  monthlyTotals: MonthlyActual[],
  totalMonthlyBudget: number,
  now: Date = new Date()
): BudgetStats {
  const year = String(now.getFullYear());
  const currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const ytdActual = monthlyTotals
    .filter((m) => m.month.startsWith(year) && m.month <= currentMonth)
    .reduce((sum, m) => sum + m.actual, 0);

  const monthsElapsed = now.getMonth() + 1;
  const ytdBudget = totalMonthlyBudget * monthsElapsed;

  const avgMonthlyActual =
    monthlyTotals.length === 0
      ? 0
      : monthlyTotals.reduce((sum, m) => sum + m.actual, 0) / monthlyTotals.length;

  return { ytdActual, ytdBudget, avgMonthlyActual, avgMonthlyBudget: totalMonthlyBudget };
}
