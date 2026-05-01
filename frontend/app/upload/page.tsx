/**
 * Upload wizard — guides the user through a 7-step flow to parse a CSV,
 * set the country, organise categories, review AI suggestions, assign groups,
 * and confirm the import.
 */

"use client";

import { Fragment, useState } from "react";
import StepFilePicker from "./StepFilePicker";
import StepSummary from "./StepSummary";
import StepCountry from "./StepCountry";
import StepCategories from "./StepCategories";
import StepReview from "./StepReview";
import StepGroup from "./StepGroup";
import StepConfirm from "./StepConfirm";
import type {
  Category,
  CategoryAssignment,
  Group,
  GroupType,
  ParsedTransaction,
  ParsedUploadResult,
} from "./types";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

const STEP_LABELS: Record<Step, string> = {
  1: "Select file",
  2: "Review summary",
  3: "Set country",
  4: "Organise categories",
  5: "Review suggestions",
  6: "Assign group",
  7: "Confirm",
};

/** SVG icon for each step, matching the upload wizard mockup. */
const STEP_ICONS: Record<Step, React.ReactNode> = {
  1: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  ),
  2: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  3: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  ),
  4: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </svg>
  ),
  5: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M19 8h2M3 8h2" />
      <path d="M19 12l1.5 1.5M3.5 13.5 5 12" />
    </svg>
  ),
  6: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  7: (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-5 h-5 md:w-6 md:h-6"
    >
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  ),
};

interface WizardState {
  uploadResult: ParsedUploadResult | null;
  filename: string;
  taxonomy: Category[];
  assignments: CategoryAssignment[];
  transactions: ParsedTransaction[];
  primaryGroup: { id: string; name: string; groupType: GroupType } | null;
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>({
    uploadResult: null,
    filename: "",
    taxonomy: [],
    assignments: [],
    transactions: [],
    primaryGroup: null,
  });

  function goTo(s: Step) {
    setStep(s);
  }

  return (
    <div className="min-h-screen">
      {/* Dark green header with title and step indicator */}
      <div className="bg-[#064E3B] px-2 pt-10 pb-0 md:pb-10">
        <div className="max-w-6xl mx-auto px-6">
          <h1 className="text-4xl font-bold text-white mb-1">Import Data</h1>
          <p className="text-white/60 mb-10">
            Upload and categorize your spending data.
          </p>

          {/* Mobile step indicator */}
          <div className="md:hidden">
            <p className="text-sm tracking-widest uppercase text-white/40">
              Step {step} of 7
            </p>
            <p className="text-xl text-white font-semibold mt-0.5">
              {STEP_LABELS[step]}
            </p>
          </div>

          {/* Desktop step indicator */}
          <nav className="hidden md:flex items-center">
            {([1, 2, 3, 4, 5, 6, 7] as Step[]).map((s, index) => (
              <Fragment key={s}>
                <div className="flex-none w-16 md:w-20 flex flex-col items-center gap-2">
                  <div
                    className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-colors ${
                      s === step
                        ? "bg-white text-[#064E3B]"
                        : "bg-white/10 text-white/50"
                    }`}
                  >
                    {STEP_ICONS[s]}
                  </div>
                  <span
                    className={`text-[9px] md:text-[11px] tracking-widest uppercase text-center leading-tight ${
                      s === step ? "font-bold text-white" : "text-white/40"
                    }`}
                  >
                    {STEP_LABELS[s]}
                  </span>
                </div>
                {index < 6 && (
                  <div
                    className={`h-px flex-1 mb-5 ${
                      s < step ? "bg-white/40" : "bg-white/15"
                    }`}
                  />
                )}
              </Fragment>
            ))}
          </nav>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {step === 1 && (
            <StepFilePicker
              onSuccess={(result, file) => {
                setState((prev) => ({
                  ...prev,
                  uploadResult: result,
                  filename: file.name,
                  transactions: result.transactions,
                }));
                goTo(2);
              }}
            />
          )}

          {step === 2 && state.uploadResult && (
            <StepSummary
              result={state.uploadResult}
              onBack={() => goTo(1)}
              onContinue={() => goTo(3)}
            />
          )}

          {step === 3 && (
            <StepCountry
              transactions={state.transactions}
              onBack={() => goTo(2)}
              onContinue={(updated) => {
                setState((prev) => ({ ...prev, transactions: updated }));
                goTo(4);
              }}
            />
          )}

          {step === 4 && state.uploadResult && (
            <StepCategories
              parsedCategories={state.uploadResult.categories}
              onBack={() => goTo(3)}
              onContinue={(taxonomy, assignments) => {
                setState((prev) => ({ ...prev, taxonomy, assignments }));
                goTo(5);
              }}
            />
          )}

          {step === 5 && (
            <StepReview
              transactions={state.transactions}
              taxonomy={state.taxonomy}
              onBack={() => goTo(4)}
              onContinue={(updated) => {
                setState((prev) => ({ ...prev, transactions: updated }));
                goTo(6);
              }}
            />
          )}

          {step === 6 && (
            <StepGroup
              transactions={state.transactions}
              onBack={() => goTo(5)}
              onContinue={(updated, primaryGroup) => {
                setState((prev) => ({
                  ...prev,
                  transactions: updated,
                  primaryGroup,
                }));
                goTo(7);
              }}
            />
          )}

          {step === 7 && state.uploadResult && state.primaryGroup && (
            <StepConfirm
              uploadResult={state.uploadResult}
              transactions={state.transactions}
              filename={state.filename}
              primaryGroup={state.primaryGroup}
              onBack={() => goTo(6)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
