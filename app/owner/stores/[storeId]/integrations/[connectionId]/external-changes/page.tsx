/**
 * External Change Detection Page — Phase 5.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/external-changes
 *
 * Shows detected external catalog changes for a specific connection with:
 *   - Summary cards (Open / Updated / Created / Missing / Structure / Mapped)
 *   - Filterable list of changes with field-level diff preview
 *   - Acknowledge / Ignore actions
 */

import { prisma } from "@/lib/prisma";
import { listExternalChanges, getExternalChangeSummary } from "@/services/external-change-detection.service";
import ExternalChangeSummaryCard from "@/components/owner/catalog/external-changes/ExternalChangeSummaryCard";
import ExternalChangeTable from "@/components/owner/catalog/external-changes/ExternalChangeTable";
import ExternalChangeFilters from "@/components/owner/catalog/external-changes/ExternalChangeFilters";
import Link from "next/link";
import type { CatalogEntityType, ExternalCatalogChangeKind, ExternalCatalogChangeStatus } from "@/types/catalog-external-changes";

interface PageProps {
  params: Promise<{ storeId: string; connectionId: string }>;
  searchParams: Promise<{
    status?: string | string[];
    entityType?: string | string[];
    changeKind?: string | string[];
    mappedOnly?: string | string[];
    limit?: string | string[];
    offset?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ExternalChangesPage({ params, searchParams }: PageProps) {
  const { storeId, connectionId } = await params;
  const query = await searchParams;

  const [connection, summary] = await Promise.all([
    prisma.connection.findUnique({ where: { id: connectionId }, select: { id: true, provider: true, displayName: true } }),
    getExternalChangeSummary(connectionId),
  ]);

  // Latest import run for this connection
  const latestImport = await prisma.catalogImportRun.findFirst({
    where: { connectionId, status: "SUCCEEDED" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, diffStatus: true, diffCompletedAt: true },
  });

  const changes = await listExternalChanges({
    connectionId,
    status: firstParam(query.status) as ExternalCatalogChangeStatus | undefined,
    entityType: firstParam(query.entityType) as CatalogEntityType | undefined,
    changeKind: firstParam(query.changeKind) as ExternalCatalogChangeKind | undefined,
    mappedOnly: firstParam(query.mappedOnly) === "true",
    limit: parseInt(firstParam(query.limit) ?? "50", 10),
    offset: parseInt(firstParam(query.offset) ?? "0", 10),
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Link href={`/owner/stores/${storeId}`} className="hover:text-gray-800">Store</Link>
        <span>/</span>
        <Link href={`/owner/stores/${storeId}/integrations/${connectionId}/mapping`} className="hover:text-gray-800">
          {connection?.displayName ?? connection?.provider ?? connectionId}
        </Link>
        <span>/</span>
        <span className="text-gray-800">External Changes</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">External Change Detection</h1>
          <p className="text-sm text-gray-500 mt-1">
            Changes detected between successive catalog imports from{" "}
            <span className="font-medium">{connection?.provider ?? connectionId}</span>.
            These do not automatically update the Beyond catalog.
          </p>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-0.5">
          {latestImport && (
            <>
              <div>Last import: {new Date(latestImport.startedAt).toLocaleString()}</div>
              {latestImport.diffCompletedAt && (
                <div>Last diff: {new Date(latestImport.diffCompletedAt).toLocaleString()} ({latestImport.diffStatus})</div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      <ExternalChangeSummaryCard summary={summary} />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <ExternalChangeFilters />
      </div>

      {/* Change list */}
      <ExternalChangeTable
        changes={changes}
        connectionId={connectionId}
        storeId={storeId}
      />

      {/* Navigation */}
      <div className="flex gap-4 text-sm">
        <Link href={`/owner/stores/${storeId}/integrations/${connectionId}/mapping`} className="text-blue-600 hover:underline">
          ← Mapping
        </Link>
        <Link href={`/owner/stores/${storeId}/integrations/${connectionId}/publish`} className="text-blue-600 hover:underline">
          Publish →
        </Link>
      </div>
    </div>
  );
}
