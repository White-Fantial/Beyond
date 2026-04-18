"use client";

/**
 * StructureMergeSection.tsx
 *
 * Displays structure-level merge choices (categoryLinks, modifierGroupLinks, parentRelation).
 */

import type { CatalogMergeDraftStructureDto } from "@/types/catalog-merge";

interface Props {
  structures: CatalogMergeDraftStructureDto[];
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (Array.isArray(value)) return `[${(value as unknown[]).join(", ")}]`;
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

const CHOICE_COLORS: Record<string, string> = {
  KEEP_INTERNAL_SET: "bg-blue-50 text-blue-700 border-blue-200",
  TAKE_EXTERNAL_SET: "bg-purple-50 text-purple-700 border-purple-200",
  MERGE_SELECTED:    "bg-green-50 text-green-700 border-green-200",
  CUSTOM_STRUCTURE:  "bg-orange-50 text-orange-700 border-orange-200",
};

export default function StructureMergeSection({ structures }: Props) {
  if (structures.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 p-6">
        <h3 className="text-base font-semibold text-gray-800 mb-2">Structure Choices</h3>
        <p className="text-sm text-gray-400">No structure choices have been set for this draft.</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
        <h3 className="text-base font-semibold text-gray-800">Structure Choices</h3>
        <p className="text-xs text-gray-500 mt-0.5">
          {structures.length} structural relationship{structures.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {structures.map((s) => (
          <div key={s.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="font-mono text-sm font-medium text-gray-800">{s.fieldPath}</span>
              <span
                className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${
                  CHOICE_COLORS[s.choice] ?? "bg-gray-100 text-gray-600 border-gray-200"
                }`}
              >
                {s.choice.replace(/_/g, " ")}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-400 mb-0.5">Baseline</div>
                <div className="font-mono bg-gray-50 rounded px-2 py-1 text-gray-600 truncate">
                  {formatValue(s.baselineValue)}
                </div>
              </div>
              <div>
                <div className="text-blue-500 mb-0.5">Internal</div>
                <div className={`font-mono rounded px-2 py-1 truncate ${
                  s.choice === "KEEP_INTERNAL_SET" ? "bg-blue-50 text-blue-800 font-semibold" : "bg-gray-50 text-gray-600"
                }`}>
                  {formatValue(s.internalValue)}
                </div>
              </div>
              <div>
                <div className="text-purple-500 mb-0.5">External</div>
                <div className={`font-mono rounded px-2 py-1 truncate ${
                  s.choice === "TAKE_EXTERNAL_SET" ? "bg-purple-50 text-purple-800 font-semibold" : "bg-gray-50 text-gray-600"
                }`}>
                  {formatValue(s.externalValue)}
                </div>
              </div>
            </div>

            {(s.choice === "MERGE_SELECTED" || s.choice === "CUSTOM_STRUCTURE") && (
              <div className="text-xs">
                <div className="text-green-500 mb-0.5">Custom / merged value</div>
                <div className="font-mono bg-green-50 rounded px-2 py-1 text-green-800 font-semibold">
                  {formatValue(s.customValue)}
                </div>
              </div>
            )}

            {s.resolvedValue !== null && s.resolvedValue !== undefined && (
              <div className="text-xs">
                <span className="text-gray-400">→ Resolved: </span>
                <span className="font-mono text-gray-700">{formatValue(s.resolvedValue)}</span>
              </div>
            )}

            {s.note && (
              <div className="text-xs text-gray-400 italic">{s.note}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
