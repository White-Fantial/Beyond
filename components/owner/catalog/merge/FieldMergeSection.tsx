"use client";

/**
 * FieldMergeSection.tsx
 *
 * Displays the field-level merge choices for a draft.
 * Each field shows baseline/internal/external values and the selected choice.
 */

import type { CatalogMergeDraftFieldDto, CatalogMergeFieldChoice } from "@/types/catalog-merge";

interface Props {
  fields: CatalogMergeDraftFieldDto[];
}

const CHOICE_LABELS: Record<CatalogMergeFieldChoice, string> = {
  TAKE_INTERNAL: "Keep Internal",
  TAKE_EXTERNAL: "Accept External",
  CUSTOM_VALUE:  "Custom Value",
};

const CHOICE_COLORS: Record<CatalogMergeFieldChoice, string> = {
  TAKE_INTERNAL: "bg-blue-50 text-blue-700 border-blue-200",
  TAKE_EXTERNAL: "bg-purple-50 text-purple-700 border-purple-200",
  CUSTOM_VALUE:  "bg-orange-50 text-orange-700 border-orange-200",
};

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

export default function FieldMergeSection({ fields }: Props) {
  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-2">Field Choices</h3>
        <p className="text-sm text-gray-400">No field choices have been set for this draft.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-base font-semibold text-gray-800">Field Choices</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {fields.length} field{fields.length !== 1 ? "s" : ""} with merge decisions
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {fields.map((field) => (
          <div key={field.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-sm font-medium text-gray-800">{field.fieldPath}</span>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
                  CHOICE_COLORS[field.choice] ?? "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {CHOICE_LABELS[field.choice] ?? field.choice}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-400 mb-0.5">Baseline</div>
                <div className="font-mono bg-gray-50 rounded px-2 py-1 text-gray-600 truncate">
                  {formatValue(field.baselineValue)}
                </div>
              </div>
              <div>
                <div className="text-blue-500 mb-0.5">Internal</div>
                <div className={`font-mono rounded px-2 py-1 truncate ${
                  field.choice === "TAKE_INTERNAL" ? "bg-blue-50 text-blue-800 font-semibold" : "bg-gray-50 text-gray-600"
                }`}>
                  {formatValue(field.internalValue)}
                </div>
              </div>
              <div>
                <div className="text-purple-500 mb-0.5">External</div>
                <div className={`font-mono rounded px-2 py-1 truncate ${
                  field.choice === "TAKE_EXTERNAL" ? "bg-purple-50 text-purple-800 font-semibold" : "bg-gray-50 text-gray-600"
                }`}>
                  {formatValue(field.externalValue)}
                </div>
              </div>
            </div>

            {field.choice === "CUSTOM_VALUE" && (
              <div className="text-xs">
                <div className="text-orange-500 mb-0.5">Custom value</div>
                <div className="font-mono bg-orange-50 rounded px-2 py-1 text-orange-800 font-semibold">
                  {formatValue(field.customValue)}
                </div>
              </div>
            )}

            {field.resolvedValue !== null && field.resolvedValue !== undefined && (
              <div className="text-xs">
                <span className="text-gray-400">→ Resolved: </span>
                <span className="font-mono text-gray-700">{formatValue(field.resolvedValue)}</span>
              </div>
            )}

            {field.note && (
              <div className="text-xs text-gray-400 italic">{field.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
