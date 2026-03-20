/**
 * Upload wizard — guides the user through a 5-step flow to parse a CSV,
 * organise categories, review AI suggestions, and confirm the import.
 */

"use client";

import { useState } from "react";
import StepFilePicker from "./StepFilePicker";
import StepSummary from "./StepSummary";
import StepCategories from "./StepCategories";
import StepReview from "./StepReview";
import StepConfirm from "./StepConfirm";
import type {
  Category,
  CategoryAssignment,
  ParsedTransaction,
  ParsedUploadResult,
} from "./types";

type Step = 1 | 2 | 3 | 4 | 5;

const STEP_LABELS: Record<Step, string> = {
  1: "Select file",
  2: "Review summary",
  3: "Organise categories",
  4: "Review suggestions",
  5: "Confirm",
};

interface WizardState {
  uploadResult: ParsedUploadResult | null;
  filename: string;
  taxonomy: Category[];
  assignments: CategoryAssignment[];
  transactions: ParsedTransaction[];
}

export default function UploadPage() {
  const [step, setStep] = useState<Step>(1);
  const [state, setState] = useState<WizardState>({
    uploadResult: null,
    filename: "",
    taxonomy: [],
    assignments: [],
    transactions: [],
  });

  function goTo(s: Step) {
    setStep(s);
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Import transactions</h1>

        {/* Step indicator */}
        <nav className="flex items-center mb-8">
          {([1, 2, 3, 4, 5] as Step[]).map((s, index) => (
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
                    s === step
                      ? "font-bold text-emerald-800"
                      : "text-gray-400"
                  }`}
                >
                  {STEP_LABELS[s]}
                </span>
              </div>
              {index < 4 && (
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

          {step === 5 && state.uploadResult && (
            <StepConfirm
              uploadResult={state.uploadResult}
              transactions={state.transactions}
              filename={state.filename}
              onBack={() => goTo(4)}
            />
          )}
        </div>
      </div>
    </main>
  );
}
