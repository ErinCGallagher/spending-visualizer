/**
 * Upload wizard — guides the user through a 6-step flow to parse a CSV,
 * organise categories, review AI suggestions, assign groups, and confirm the import.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import StepFilePicker from "./StepFilePicker";
import StepSummary from "./StepSummary";
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

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const STEP_LABELS: Record<Step, string> = {
  1: "Select file",
  2: "Review summary",
  3: "Organise categories",
  4: "Review suggestions",
  5: "Assign group",
  6: "Confirm",
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
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Back to dashboard
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Import transactions</h1>

        {/* Step indicator */}
        <nav className="flex items-center mb-8">
          {([1, 2, 3, 4, 5, 6] as Step[]).map((s, index) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-medium ${
                    s === step
                      ? "bg-emerald-800 text-white"
                      : s < step
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  {s}
                </div>
                <span
                  className={`mt-1 text-xs ${
                    s === step ? "font-bold text-emerald-800" : "text-gray-400"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {index < 5 && (
                <div
                  className={`h-0.5 w-8 mb-4 ${
                    s < step ? "bg-emerald-300" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </nav>

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

          {step === 3 && state.uploadResult && (
            <StepCategories
              parsedCategories={state.uploadResult.categories}
              onBack={() => goTo(2)}
              onContinue={(taxonomy, assignments) => {
                setState((prev) => ({ ...prev, taxonomy, assignments }));
                goTo(4);
              }}
            />
          )}

          {step === 4 && (
            <StepReview
              transactions={state.transactions}
              taxonomy={state.taxonomy}
              onBack={() => goTo(3)}
              onContinue={(updated) => {
                setState((prev) => ({ ...prev, transactions: updated }));
                goTo(5);
              }}
            />
          )}

          {step === 5 && (
            <StepGroup
              transactions={state.transactions}
              onBack={() => goTo(4)}
              onContinue={(updated, primaryGroup) => {
                setState((prev) => ({ ...prev, transactions: updated, primaryGroup }));
                goTo(6);
              }}
            />
          )}

          {step === 6 && state.uploadResult && state.primaryGroup && (
            <StepConfirm
              uploadResult={state.uploadResult}
              transactions={state.transactions}
              filename={state.filename}
              primaryGroup={state.primaryGroup}
              onBack={() => goTo(5)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
