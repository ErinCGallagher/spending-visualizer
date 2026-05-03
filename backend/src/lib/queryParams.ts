/** Pure helpers for parsing and validating transaction query parameters. */

export const VALID_GROUP_TYPE_VALUES = ["trip", "daily", "business"] as const;

const GROUP_TYPE_LABELS: Record<typeof VALID_GROUP_TYPE_VALUES[number], string> = {
  trip: "Trip",
  daily: "Daily Living",
  business: "Business",
};

export const GROUP_TYPE_OPTIONS = VALID_GROUP_TYPE_VALUES.map((value) => ({
  value,
  label: GROUP_TYPE_LABELS[value],
}));

export interface TransactionQueryParams {
  from: string | undefined;
  to: string | undefined;
  category: string | undefined;
  paymentMethod: string | undefined;
  traveller: string | undefined;
  groupId: string | undefined;
  groupType: string[];
  search: string | undefined;
  page: number;
  limit: number;
}

export interface ParamError {
  field: string;
  message: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateGroupTypes(groupTypes: string[]): string | null {
  for (const gt of groupTypes) {
    if (!(VALID_GROUP_TYPE_VALUES as readonly string[]).includes(gt)) {
      return `Invalid groupType: ${gt}. Must be one of: ${VALID_GROUP_TYPE_VALUES.join(", ")}`;
    }
  }
  return null;
}

/**
 * Parses raw Express query params for the transactions list endpoint.
 * Returns the parsed params and any validation errors. The caller
 * should return 400 if errors is non-empty.
 */
export function parseTransactionQuery(raw: Record<string, unknown>): {
  params: TransactionQueryParams;
  errors: ParamError[];
} {
  const errors: ParamError[] = [];

  const from = typeof raw.from === "string" ? raw.from : undefined;
  const to = typeof raw.to === "string" ? raw.to : undefined;
  const category = typeof raw.category === "string" ? raw.category : undefined;
  const paymentMethod = typeof raw.paymentMethod === "string" ? raw.paymentMethod : undefined;
  const traveller = typeof raw.traveller === "string" ? raw.traveller : undefined;
  const groupId = typeof raw.groupId === "string" ? raw.groupId : undefined;
  const groupType = [raw.groupType ?? []].flat().filter(Boolean) as string[];
  const search = typeof raw.search === "string" ? raw.search : undefined;

  if (from !== undefined && !ISO_DATE.test(from)) {
    errors.push({ field: "from", message: "Must be ISO date (YYYY-MM-DD)" });
  }
  if (to !== undefined && !ISO_DATE.test(to)) {
    errors.push({ field: "to", message: "Must be ISO date (YYYY-MM-DD)" });
  }
  if (category !== undefined && !UUID.test(category)) {
    errors.push({ field: "category", message: "Must be a valid UUID" });
  }
  if (groupId !== undefined && !UUID.test(groupId)) {
    errors.push({ field: "groupId", message: "Must be a valid UUID" });
  }
  const groupTypeError = validateGroupTypes(groupType);
  if (groupTypeError) {
    errors.push({ field: "groupType", message: `Must be one of: ${VALID_GROUP_TYPE_VALUES.join(", ")}` });
  }

  let page = 1;
  if (raw.page !== undefined) {
    const p = Number(raw.page);
    if (!Number.isInteger(p) || p < 1) {
      errors.push({ field: "page", message: "Must be a positive integer" });
    } else {
      page = p;
    }
  }

  let limit = 50;
  if (raw.limit !== undefined) {
    const l = Number(raw.limit);
    if (!Number.isInteger(l) || l < 1 || l > 200) {
      errors.push({ field: "limit", message: "Must be an integer between 1 and 200" });
    } else {
      limit = l;
    }
  }

  return {
    params: { from, to, category, paymentMethod, traveller, groupId, groupType, search, page, limit },
    errors,
  };
}
