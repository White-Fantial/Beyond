"use client";

/**
 * MergePlanPreview.tsx
 *
 * Shows validation results and plan preview for a merge draft.
 */

import type { MergeValidationResult } from "@/types/catalog-merge";

interface Props {
  validation: MergeValidationResult;
  generatedPlanId: string | null;
  draftStatus: string;
}

export default function MergePlanPreview({ validation, generatedPlanId, draftStatus }: Props) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-base font-semibold text-gray-800">Validation & Plan Preview</h3>
      </div>

      <div className="p-4 space-y-4">
        {/* Validation status */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Validation</div>
          {validation.valid ? (
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <span className="text-green-500">✓</span>
              All checks passed — draft is valid.
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-red-600 text-sm font-medium">
                {validation.errors.length} validation error{validation.errors.length !== 1 ? "s" : ""}:
              </div>
              <ul className="space-y-1">
                {validation.errors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 flex gap-2">
                    <span className="font-mono text-red-400 shrink-0">{err.fieldPath}</span>
                    <span>{err.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Plan */}
        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Generated Plan</div>
          {generatedPlanId ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <span className="text-green-500">✓</span>
              Plan generated:{" "}
              <span className="font-mono text-xs text-gray-500">{generatedPlanId}</span>
            </div>
          ) : (
            <div className="text-sm text-gray-400">
              No plan generated yet.{" "}
              {draftStatus === "VALIDATED"
                ? 'Use "Generate Plan" to create a sync plan.'
                : "Validate the draft first."}
            </div>
          )}
        </div>

        {/* Status flow */}
        <div className="flex gap-2 items-center text-xs text-gray-400">
          {["DRAFT", "VALIDATED", "PLAN_GENERATED", "APPLIED"].map((step, i, arr) => (
            <span key={step} className="flex items-center gap-2">
              <span
                className={`px-2 py-0.5 rounded ${
                  draftStatus === step
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {step}
              </span>
              {i < arr.length - 1 && <span>→</span>}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
