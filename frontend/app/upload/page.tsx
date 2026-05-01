/**
 * Upload wizard — guides the user through a 7-step flow to parse a CSV,
 * set the country, organise categories, review AI suggestions, assign groups,
 * and confirm the import.
 */

"use client";

import { Fragment, useEffect, useState } from "react";
import StepFilePicker from "./StepFilePicker";
import StepSummary from "./StepSummary";
import StepCountry from "./StepCountry";
import StepCategories from "./StepCategories";
import StepReview from "./StepReview";
import StepGroup from "./StepGroup";
import StepConfirm from "./StepConfirm";
import StepCreditCardAIReview from "./StepCreditCardAIReview";
import StepCreditCardCategories from "./StepCreditCardCategories";
import { DEFAULT_STEPS, PARSER_STEPS, type StepDefinition } from "./stepConfig";
import type {
  Category,
  CategoryAssignment,
  GroupType,
  ParsedTransaction,
  ParsedUploadResult,
} from "./types";

const STEP_ICONS: Record<string, React.ReactNode> = {
  file: (
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
  summary: (
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
  country: (
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
  categories: (
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
  "cc-categories": (
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
  review: (
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
  "cc-review": (
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
  group: (
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
  confirm: (
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
  newCategoryNames: string[];
  existingTaxonomy: Category[];
}

export default function UploadPage() {
  const [currentStepId, setCurrentStepId] = useState<string>("file");
  const [activeSteps, setActiveSteps] = useState<StepDefinition[]>(DEFAULT_STEPS);
  const [skippedStepIds, setSkippedStepIds] = useState<Set<string>>(new Set());
  const [state, setState] = useState<WizardState>({
    uploadResult: null,
    filename: "",
    taxonomy: [],
    assignments: [],
    transactions: [],
    primaryGroup: null,
    newCategoryNames: [],
    existingTaxonomy: [],
  });

  useEffect(() => {
    async function loadTaxonomy() {
      try {
        const res = await fetch("/api/categories", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          // The API returns { categories: Category[] } based on StepCategories.tsx logic
          // Actually StepCategories.tsx says data: Category[] but wait... 
          // let me double check that API response shape.
          setState((prev) => ({ ...prev, existingTaxonomy: Array.isArray(data) ? data : (data.categories || []) }));
        }
      } catch (err) {
        console.error("Failed to load taxonomy", err);
      }
    }
    loadTaxonomy();
  }, []);

  const currentIndex = activeSteps.findIndex((s) => s.id === currentStepId);
  const currentStep = activeSteps[currentIndex];

  function goTo(stepId: string) {
    setCurrentStepId(stepId);
  }

  function goBack() {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      const prevStep = activeSteps[prevIndex];
      if (skippedStepIds.has(prevStep.id)) {
        // Skip backwards too
        const prevPrevIndex = prevIndex - 1;
        if (prevPrevIndex >= 0) {
          setCurrentStepId(activeSteps[prevPrevIndex].id);
        }
      } else {
        setCurrentStepId(prevStep.id);
      }
    }
  }

  function goNext() {
    const nextIndex = currentIndex + 1;
    if (nextIndex < activeSteps.length) {
      setCurrentStepId(activeSteps[nextIndex].id);
    }
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
              Step {currentIndex + 1} of {activeSteps.length}
            </p>
            <p className="text-xl text-white font-semibold mt-0.5">
              {currentStep?.label}
            </p>
          </div>

          {/* Desktop step indicator */}
          <nav className="hidden md:flex items-center">
            {activeSteps.map((s, index) => {
              const isCurrent = s.id === currentStepId;
              const isCompleted = currentIndex > index;
              const isSkipped = skippedStepIds.has(s.id);

              return (
                <Fragment key={s.id}>
                  <div className="flex-none w-16 md:w-20 flex flex-col items-center gap-2">
                    <div
                      className={`flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-full transition-colors ${
                        isCurrent
                          ? "bg-white text-[#064E3B]"
                          : isSkipped
                          ? "bg-transparent border border-dashed border-white/30 text-white/30"
                          : isCompleted
                          ? "bg-white/40 text-white/80"
                          : s.conditional
                          ? "bg-transparent border border-dashed border-white/20 text-white/20"
                          : "bg-white/10 text-white/50"
                      } ${isSkipped ? "relative overflow-hidden" : ""}`}
                    >
                      {isSkipped && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-[140%] h-px bg-white/40 rotate-45" />
                        </div>
                      )}
                      {isCompleted && !isSkipped ? (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-5 h-5 md:w-6 md:h-6"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        STEP_ICONS[s.id]
                      )}
                    </div>
                    <span
                      className={`text-[9px] md:text-[11px] tracking-widest uppercase text-center leading-tight ${
                        isCurrent
                          ? "font-bold text-white"
                          : isSkipped
                          ? "text-white/20"
                          : "text-white/40"
                      }`}
                    >
                      {isSkipped ? "Skipped" : s.label}
                    </span>
                  </div>
                  {index < activeSteps.length - 1 && (
                    <div
                      className={`h-px flex-1 mb-5 ${
                        currentIndex > index ? "bg-white/40" : "bg-white/15"
                      }`}
                    />
                  )}
                </Fragment>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Step content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {currentStepId === "file" && (
            <StepFilePicker
              onSuccess={(result, file) => {
                setState((prev) => ({
                  ...prev,
                  uploadResult: result,
                  filename: file.name,
                  transactions: result.transactions,
                }));
                // Set active steps based on parser format
                const format = result.transactions[0]?.sourceFormat || "travelspend";
                setActiveSteps(PARSER_STEPS[format] || DEFAULT_STEPS);
                setSkippedStepIds(new Set());
                setCurrentStepId("summary");
              }}
            />
          )}

          {currentStepId === "summary" && state.uploadResult && (
            <StepSummary
              result={state.uploadResult}
              onBack={goBack}
              onContinue={goNext}
            />
          )}

          {currentStepId === "country" && (
            <StepCountry
              transactions={state.transactions}
              onBack={goBack}
              onContinue={(updated) => {
                setState((prev) => ({ ...prev, transactions: updated }));
                goNext();
              }}
            />
          )}

          {currentStepId === "categories" && state.uploadResult && (
            <StepCategories
              parsedCategories={state.uploadResult.categories}
              onBack={goBack}
              onContinue={(taxonomy, assignments) => {
                setState((prev) => ({ ...prev, taxonomy, assignments }));
                goNext();
              }}
            />
          )}

          {currentStepId === "review" && (
            <StepReview
              transactions={state.transactions}
              taxonomy={state.taxonomy}
              onBack={goBack}
              onContinue={(updated) => {
                setState((prev) => ({ ...prev, transactions: updated }));
                goNext();
              }}
            />
          )}

          {currentStepId === "cc-review" && (
            <StepCreditCardAIReview
              transactions={state.transactions}
              existingTaxonomy={state.existingTaxonomy}
              onBack={goBack}
              onContinue={(updated, newCategoryNames) => {
                setState((prev) => ({ ...prev, transactions: updated, newCategoryNames }));
                if (newCategoryNames.length === 0) {
                  setSkippedStepIds((prev) => new Set([...prev, "cc-categories"]));
                  // Explicitly jump to next step if skipping
                  const nextIndex = currentIndex + 1;
                  const nextStep = activeSteps[nextIndex];
                  if (nextStep?.id === "cc-categories") {
                    setCurrentStepId(activeSteps[nextIndex + 1].id);
                  } else {
                    goNext();
                  }
                } else {
                  goNext();
                }
              }}
            />
          )}

          {currentStepId === "cc-categories" && (
            <StepCreditCardCategories
              newCategoryNames={state.newCategoryNames}
              existingTaxonomy={state.existingTaxonomy}
              onBack={goBack}
              onContinue={(taxonomy) => {
                setState((prev) => ({ ...prev, taxonomy }));
                goNext();
              }}
            />
          )}

          {currentStepId === "group" && (
            <StepGroup
              transactions={state.transactions}
              onBack={goBack}
              onContinue={(updated, primaryGroup) => {
                setState((prev) => ({
                  ...prev,
                  transactions: updated,
                  primaryGroup,
                }));
                goNext();
              }}
            />
          )}

          {currentStepId === "confirm" && state.uploadResult && state.primaryGroup && (
            <StepConfirm
              uploadResult={state.uploadResult}
              transactions={state.transactions}
              filename={state.filename}
              primaryGroup={state.primaryGroup}
              onBack={goBack}
            />
          )}
        </div>
      </div>
    </div>
  );
}
