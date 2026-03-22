/**
 * Shared formatting utilities for currency and date display.
 */

/**
 * Formats a number for chart axis labels. When a currency is provided,
 * displays the narrow symbol (e.g. "$1,234" rather than "CA$1,234" or "1,234 CAD").
 */
export function formatAmount(amount: number, currency?: string, decimals = 0): string {
  if (currency) {
    return new Intl.NumberFormat("en-CA", {
      style: "currency",
      currency,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }
  return new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: string, decimals = 0): string {
  return `${new Intl.NumberFormat("en-CA", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount)} ${currency}`;
}

export function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${months[parseInt(month, 10) - 1]} ${parseInt(day, 10)}, ${year}`;
}
