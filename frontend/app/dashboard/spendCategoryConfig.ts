/**
 * Defines spend category bands for classifying daily trip spending.
 * Bands are evaluated in order; the first matching band wins.
 */

export interface SpendBand {
  label: "Cheap" | "Moderate" | "Expensive";
  /** Maximum per-day spend (exclusive upper bound). Undefined means no upper bound. */
  maxPerDay?: number;
  /** Tailwind background colour for the badge. */
  badgeClass: string;
  /** Tailwind text colour for the badge. */
  textClass: string;
}

export const SPEND_BANDS: SpendBand[] = [
  {
    label: "Cheap",
    maxPerDay: 230,
    badgeClass: "bg-green-100",
    textClass: "text-green-800",
  },
  {
    label: "Moderate",
    maxPerDay: 300,
    badgeClass: "bg-yellow-100",
    textClass: "text-yellow-800",
  },
  {
    label: "Expensive",
    badgeClass: "bg-red-100",
    textClass: "text-red-800",
  },
];

/** Returns the spend band for a given per-day amount. */
export function getSpendBand(perDay: number): SpendBand {
  for (const band of SPEND_BANDS) {
    if (band.maxPerDay === undefined || perDay < band.maxPerDay) {
      return band;
    }
  }
  return SPEND_BANDS[SPEND_BANDS.length - 1];
}
