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
 * month from January through the current month. When selectedMonth is
 * given, all four figures are scoped to that single month instead.
 */
export function computeBudgetStats(
  monthlyTotals: MonthlyActual[],
  totalMonthlyBudget: number,
  now: Date = new Date(),
  selectedMonth?: string
): BudgetStats {
  if (selectedMonth) {
    const actual = monthlyTotals
      .filter((m) => m.month === selectedMonth)
      .reduce((sum, m) => sum + m.actual, 0);
    return {
      ytdActual: actual,
      ytdBudget: totalMonthlyBudget,
      avgMonthlyActual: actual,
      avgMonthlyBudget: totalMonthlyBudget,
    };
  }

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

export interface CategoryBudgetActual {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  parentName: string | null;
  budgeted: number;
  actual: number;
}

/**
 * Computes budgeted vs. actual spend per category. With no selectedMonth,
 * budgeted is the category's monthly amount scaled by the number of calendar
 * months elapsed in the current year (YTD), matching the stats tiles. When
 * selectedMonth is given, both figures are scoped to that single month.
 */
export function computeCategoryBudgetVsActual(
  categories: {
    categoryId: string;
    categoryName: string;
    parentId: string | null;
    parentName: string | null;
    monthlyAmount: number;
  }[],
  monthly: { month: string; categoryId: string; actual: number }[],
  now: Date = new Date(),
  selectedMonth?: string
): CategoryBudgetActual[] {
  if (selectedMonth) {
    return categories.map((c) => {
      const actual = monthly
        .filter((m) => m.categoryId === c.categoryId && m.month === selectedMonth)
        .reduce((sum, m) => sum + m.actual, 0);
      return {
        categoryId: c.categoryId,
        categoryName: c.categoryName,
        parentId: c.parentId,
        parentName: c.parentName,
        budgeted: c.monthlyAmount,
        actual,
      };
    });
  }

  const year = String(now.getFullYear());
  const currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthsElapsed = now.getMonth() + 1;

  return categories.map((c) => {
    const actual = monthly
      .filter(
        (m) => m.categoryId === c.categoryId && m.month.startsWith(year) && m.month <= currentMonth
      )
      .reduce((sum, m) => sum + m.actual, 0);
    return {
      categoryId: c.categoryId,
      categoryName: c.categoryName,
      parentId: c.parentId,
      parentName: c.parentName,
      budgeted: c.monthlyAmount * monthsElapsed,
      actual,
    };
  });
}

export interface CategoryGroup {
  key: string;
  label: string;
  budgeted: number;
  actual: number;
  children: CategoryBudgetActual[];
}

/**
 * Groups flat category rows into parent/child breakdown groups. A category
 * with no parent is its own group; a category with a parent is grouped under
 * it, merging with the parent's own row if the parent is also budgeted.
 */
export function groupCategoryBreakdown(data: CategoryBudgetActual[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();

  for (const row of data) {
    const key = row.parentId ?? row.categoryId;
    const label = row.parentName ?? row.categoryName;
    let group = groups.get(key);
    if (!group) {
      group = { key, label, budgeted: 0, actual: 0, children: [] };
      groups.set(key, group);
    }
    group.budgeted += row.budgeted;
    group.actual += row.actual;
    group.children.push(row);
  }

  for (const group of groups.values()) {
    group.children.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
  }

  return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label));
}
