/**
 * Pure helpers for aggregating budget-vs-actual spend into the stats shown
 * on the Budget tab. Kept free of fetch/DOM concerns so they're unit
 * testable without rendering anything.
 */

export interface MonthlyActual {
  month: string;
  actual: number;
}

/** True when month falls within the selected month, or (absent a selection) the current year up to now. */
function isInPeriod(month: string, now: Date, selectedMonth?: string): boolean {
  if (selectedMonth) return month === selectedMonth;
  const year = String(now.getFullYear());
  const currentMonth = `${year}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  return month.startsWith(year) && month <= currentMonth;
}

function sumInPeriod<T>(
  items: T[],
  getMonth: (item: T) => string,
  getValue: (item: T) => number,
  now: Date,
  selectedMonth?: string
): number {
  return items
    .filter((item) => isInPeriod(getMonth(item), now, selectedMonth))
    .reduce((sum, item) => sum + getValue(item), 0);
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

export interface IncomeMonthly {
  month: string;
  categoryId: string;
  categoryName: string;
  actual: number;
}

export interface PensionMonthly {
  month: string;
  amount: number;
}

/** Actual income for the period: Income-category transactions plus pension contributions. */
export function computeIncomeTotal(
  incomeMonthly: IncomeMonthly[],
  pensionMonthly: PensionMonthly[],
  now: Date = new Date(),
  selectedMonth?: string
): number {
  return (
    sumInPeriod(incomeMonthly, (m) => m.month, (m) => m.actual, now, selectedMonth) +
    sumInPeriod(pensionMonthly, (m) => m.month, (m) => m.amount, now, selectedMonth)
  );
}

export interface IncomeBreakdownRow {
  categoryId: string;
  categoryName: string;
  amount: number;
}

/** Sums income actuals per category for the period, sorted by category name. */
export function computeIncomeBreakdown(
  incomeMonthly: IncomeMonthly[],
  now: Date = new Date(),
  selectedMonth?: string
): IncomeBreakdownRow[] {
  const totals = new Map<string, IncomeBreakdownRow>();
  for (const m of incomeMonthly) {
    if (!isInPeriod(m.month, now, selectedMonth)) continue;
    const existing = totals.get(m.categoryId);
    if (existing) {
      existing.amount += m.actual;
    } else {
      totals.set(m.categoryId, { categoryId: m.categoryId, categoryName: m.categoryName, amount: m.actual });
    }
  }
  return Array.from(totals.values()).sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

/** Total non-income spend outside any budgeted category, for the period. */
export function computeUnbudgetedActual(
  unbudgetedMonthly: MonthlyActual[],
  now: Date = new Date(),
  selectedMonth?: string
): number {
  return sumInPeriod(unbudgetedMonthly, (m) => m.month, (m) => m.actual, now, selectedMonth);
}

export function computePensionTotal(
  pensionMonthly: PensionMonthly[],
  now: Date = new Date(),
  selectedMonth?: string
): number {
  return sumInPeriod(pensionMonthly, (m) => m.month, (m) => m.amount, now, selectedMonth);
}

/** Positive = surplus, negative = deficit. */
export function computeSurplus(income: number, spend: number): number {
  return income - spend;
}

/**
 * Appends a "Not in budget" pseudo-group to a spend breakdown so unbudgeted
 * spend shows up alongside budgeted categories in charts. Omitted when zero.
 */
export function appendUnbudgetedGroup(groups: CategoryGroup[], unbudgetedActual: number): CategoryGroup[] {
  if (unbudgetedActual <= 0) return groups;
  return [
    ...groups,
    { key: "not-in-budget", label: "Not in budget", budgeted: 0, actual: unbudgetedActual, children: [] },
  ];
}
