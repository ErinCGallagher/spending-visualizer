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

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return "N/A";
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return new Intl.DateTimeFormat("en-CA", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "Invalid Date";
  }
}
