/**
 * Merge Queue Page — Phase 8.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/merge
 *
 * Shows all merge drafts for this connection with status and links to the editor.
 */

import { prisma } from "@/lib/prisma";
import { listMergeDrafts } from "@/services/catalog-merge.service";
import MergeDraftTable from "@/components/owner/catalog/merge/MergeDraftTable";
import Link from "next/link";
import type { CatalogMergeDraftStatus } from "@/types/catalog-merge";

interface PageProps {
  params: Promise<{ storeId: string; connectionId: string }>;
  searchParams: Promise<{
    status?: string | string[];
    limit?: string | string[];
    offset?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function MergeQueuePage({ params, searchParams }: PageProps) {
  const { storeId, connectionId } = await params;
  const query = await searchParams;

  const [connection, drafts] = await Promise.all([
    prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, provider: true, displayName: true },
    }),
    listMergeDrafts({
      connectionId,
      status: firstParam(query.status) as CatalogMergeDraftStatus | undefined,
      limit: parseInt(firstParam(query.limit) ?? "50", 10),
      offset: parseInt(firstParam(query.offset) ?? "0", 10),
    }),
  ]);

  // Count by status
  const statusCounts = drafts.reduce<Record<string, number>>((acc, d) => {
    acc[d.status] = (acc[d.status] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/owner/stores/${storeId}`} className="hover:text-gray-800">Store</Link>
        <span>/</span>
        <Link href={`/owner/stores/${storeId}/integrations/${connectionId}/conflicts`} className="hover:text-gray-800">
          {connection?.displayName ?? connection?.provider ?? connectionId}
        </Link>
        <span>/</span>
        <span className="text-gray-800">Merge Queue</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Merge Queue</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage advanced merge drafts for{" "}
            <span className="font-medium">{connection?.provider ?? connectionId}</span>.
            Each draft represents a manual merge decision that can be validated and applied.
          </p>
        </div>
      </div>

      {/* Status summary */}
      {drafts.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {(["DRAFT", "VALIDATED", "PLAN_GENERATED", "APPLIED", "INVALID", "CANCELLED"] as const).map((s) => (
            statusCounts[s] ? (
              <div key={s} className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-1">
                <span className="font-semibold text-gray-800">{statusCounts[s]}</span> {s}
              </div>
            ) : null
          ))}
        </div>
      )}

      {/* Draft table */}
      <MergeDraftTable drafts={drafts} connectionId={connectionId} storeId={storeId} />

      {/* Navigation */}
      <div className="flex gap-4 text-sm">
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/conflicts`}
          className="text-blue-600 hover:underline"
        >
          ← Conflict Center
        </Link>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/sync`}
          className="text-blue-600 hover:underline"
        >
          Sync Plans →
        </Link>
      </div>
    </div>
  );
}
