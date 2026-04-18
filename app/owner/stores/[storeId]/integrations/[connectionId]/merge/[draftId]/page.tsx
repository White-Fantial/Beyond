/**
 * Merge Editor Page — Phase 8.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/merge/[draftId]
 *
 * The main 4-section merge editor:
 *   1. Header summary (entity info, status, apply target)
 *   2. Field merge section
 *   3. Structure merge section
 *   4. Validation + Plan preview section
 */

import { getMergeDraft } from "@/services/catalog-merge.service";
import { validateMergeDraftData } from "@/services/catalog-merge/validate";
import MergeEditorHeader from "@/components/owner/catalog/merge/MergeEditorHeader";
import FieldMergeSection from "@/components/owner/catalog/merge/FieldMergeSection";
import StructureMergeSection from "@/components/owner/catalog/merge/StructureMergeSection";
import MergePlanPreview from "@/components/owner/catalog/merge/MergePlanPreview";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
  params: { storeId: string; connectionId: string; draftId: string };
}

export default async function MergeEditorPage({ params }: PageProps) {
  const { storeId, connectionId, draftId } = params;

  const draft = await getMergeDraft(draftId);
  if (!draft) notFound();

  // Compute current validation state (non-mutating — for display only)
  const validation = validateMergeDraftData(draft);

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/owner/stores/${storeId}`} className="hover:text-gray-800">Store</Link>
        <span>/</span>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/merge`}
          className="hover:text-gray-800"
        >
          Merge Queue
        </Link>
        <span>/</span>
        <span className="text-gray-800 truncate max-w-xs">
          {draft.title ?? draftId}
        </span>
      </div>

      {/* Section 1: Header */}
      <MergeEditorHeader draft={draft} />

      {/* Section 2: Field choices */}
      <FieldMergeSection fields={draft.fieldChoices ?? []} />

      {/* Section 3: Structure choices */}
      <StructureMergeSection structures={draft.structureChoices ?? []} />

      {/* Section 4: Validation + Plan preview */}
      <MergePlanPreview
        validation={validation}
        generatedPlanId={draft.generatedPlanId}
        draftStatus={draft.status}
      />

      {/* Action hints */}
      <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 text-sm text-gray-500 space-y-1">
        <div className="font-medium text-gray-700">Available API actions:</div>
        <ul className="list-disc list-inside space-y-0.5 text-xs">
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/fields</code> — set field choice</li>
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/structures</code> — set structure choice</li>
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/validate</code> — validate draft</li>
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/generate-plan</code> — generate sync plan</li>
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/apply</code> — apply the plan</li>
          <li>POST <code>/api/catalog/merge-drafts/{draftId}/reset</code> — reset to DRAFT</li>
          <li>GET <code>/api/catalog/merge-drafts/{draftId}/preview</code> — preview resolved values</li>
        </ul>
      </div>

      {/* Execution logs */}
      {(draft.executionLogs ?? []).length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-base font-semibold text-gray-800">Execution History</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {draft.executionLogs!.map((log) => (
              <div key={log.id} className="px-4 py-3 text-sm flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                    log.status === "APPLIED" ? "bg-green-100 text-green-700" :
                    log.status === "FAILED"  ? "bg-red-100 text-red-700" :
                    "bg-gray-100 text-gray-600"
                  }`}>
                    {log.status}
                  </span>
                  {log.generatedPlanId && (
                    <span className="font-mono text-xs text-gray-400">{log.generatedPlanId}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(log.createdAt).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-4 text-sm">
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/merge`}
          className="text-blue-600 hover:underline"
        >
          ← Back to Merge Queue
        </Link>
        {draft.generatedPlanId && (
          <Link
            href={`/owner/stores/${storeId}/integrations/${connectionId}/sync`}
            className="text-blue-600 hover:underline"
          >
            View Sync Plans →
          </Link>
        )}
      </div>
    </div>
  );
}
