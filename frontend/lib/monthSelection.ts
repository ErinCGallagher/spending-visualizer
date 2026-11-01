/**
 * Contiguous month-range selection for the month chips. A selection is an
 * ascending list of "YYYY-MM" keys with no gaps, so it can always be expressed
 * as one from/to date range.
 */

function monthIndex(key: string): number {
  const [year, month] = key.split("-").map(Number);
  return year * 12 + (month - 1);
}

/**
 * Tapping an end month turns it off; tapping the month just before or after the
 * range extends it. Any other tap (a gap, or inside the range) restarts the
 * selection at the tapped month so it never becomes non-contiguous.
 */
export function toggleMonthSelection(selected: string[], key: string): string[] {
  if (selected.length === 0) return [key];

  const first = selected[0];
  const last = selected[selected.length - 1];

  if (key === first || key === last) return selected.filter((m) => m !== key);

  const index = monthIndex(key);
  if (index === monthIndex(first) - 1) return [key, ...selected];
  if (index === monthIndex(last) + 1) return [...selected, key];

  return [key];
}

/** First day of the first month through last day of the last month; empty strings when nothing is selected. */
export function monthSelectionRange(selected: string[]): { from: string; to: string } {
  if (selected.length === 0) return { from: "", to: "" };

  const [lastYear, lastMonth] = selected[selected.length - 1].split("-").map(Number);
  const lastDay = new Date(lastYear, lastMonth, 0).getDate();

  return {
    from: `${selected[0]}-01`,
    to: `${selected[selected.length - 1]}-${String(lastDay).padStart(2, "0")}`,
  };
}
