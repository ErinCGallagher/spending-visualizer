const CREDIT_CARD_FORMATS = new Set(["wealthsimple", "amex", "scotiabank", "td"]);

export function isCreditCardFormat(sourceFormat: string | undefined): boolean {
  return CREDIT_CARD_FORMATS.has(sourceFormat ?? "");
}

export interface StepDefinition {
  id: string;
  label: string;
  conditional?: boolean; // step may be skipped; shown with visual indicator
}

export const DEFAULT_STEPS: StepDefinition[] = [
  { id: "file",    label: "Select file" },
  { id: "summary", label: "Review summary" },
  { id: "group",   label: "Assign group" },
  { id: "confirm", label: "Confirm" },
];

export const PARSER_STEPS: Record<string, StepDefinition[]> = {
  travelspend: [
    { id: "file",          label: "Select file" },
    { id: "summary",       label: "Review summary" },
    { id: "country",       label: "Set country" },
    { id: "categories",    label: "Organise categories" },
    { id: "review",        label: "Review suggestions" },
    { id: "group",         label: "Assign group" },
    { id: "confirm",       label: "Confirm" },
  ],
  wealthsimple: [
    { id: "file",          label: "Select file" },
    { id: "summary",       label: "Review summary" },
    { id: "cc-review",     label: "AI suggestions" },
    { id: "cc-categories", label: "Review categories", conditional: true },
    { id: "group",         label: "Assign group" },
    { id: "confirm",       label: "Confirm" },
  ],
  amex: [
    { id: "file",          label: "Select file" },
    { id: "summary",       label: "Review summary" },
    { id: "cc-review",     label: "AI suggestions" },
    { id: "cc-categories", label: "Review categories", conditional: true },
    { id: "group",         label: "Assign group" },
    { id: "confirm",       label: "Confirm" },
  ],
  scotiabank: [
    { id: "file",          label: "Select file" },
    { id: "summary",       label: "Review summary" },
    { id: "cc-review",     label: "AI suggestions" },
    { id: "cc-categories", label: "Review categories", conditional: true },
    { id: "group",         label: "Assign group" },
    { id: "confirm",       label: "Confirm" },
  ],
  td: [
    { id: "file",          label: "Select file" },
    { id: "summary",       label: "Review summary" },
    { id: "cc-review",     label: "AI suggestions" },
    { id: "cc-categories", label: "Review categories", conditional: true },
    { id: "group",         label: "Assign group" },
    { id: "confirm",       label: "Confirm" },
  ],
};
