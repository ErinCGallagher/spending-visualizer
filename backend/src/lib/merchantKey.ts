/** Normalises a credit card transaction description to a stable lookup key. */
export function toMerchantKey(description: string): string {
  return description.toLowerCase().trim().replace(/\s+/g, " ");
}
