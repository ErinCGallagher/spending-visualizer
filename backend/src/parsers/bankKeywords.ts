/** Bank institution keywords used to detect card payment rows in credit card CSVs. */

export const BANK_KEYWORDS = [
  "ROYAL BANK OF CANADA",
  "TD CANADA TRUST",
  "SCOTIABANK",
  "BANK OF MONTREAL",
  "CIBC",
  "NATIONAL BANK",
  "DESJARDINS",
  "TANGERINE",
  "SIMPLII",
  "MERIDIAN",
  "ATB FINANCIAL",
];

export function isBankPayment(description: string | undefined | null): boolean {
  if (!description) return false;
  const upper = description.toUpperCase();
  return BANK_KEYWORDS.some((k) => upper.includes(k));
}
