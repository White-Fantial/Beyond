/**
 * Conflict Center Page — Phase 6.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/conflicts
 *
 * Shows catalog conflicts between internal Beyond state and external channel changes with:
 *   - Summary cards (Open / In Review / Resolved / Ignored / Field / Structure / Missing)
 *   - Filterable list of conflicts with field-diff details
 *   - Review / Resolve / Ignore actions (decision-recording only — no data applied)
 *   - Links back to external-changes and mapping pages
 */

import { prisma } from "@/lib/prisma";
import {
  listConflicts,
  getConflictSummary,
} from "@/services/catalog-conflict.service";
import ConflictSummaryCard from "@/components/owner/catalog/conflicts/ConflictSummaryCard";
import ConflictTable from "@/components/owner/catalog/conflicts/ConflictTable";
import ConflictFilters from "@/components/owner/catalog/conflicts/ConflictFilters";
import Link from "next/link";
import type {
  CatalogConflictStatus,
  CatalogConflictType,
  CatalogEntityType,
} from "@/types/catalog-conflicts";

interface PageProps {
  params: Promise<{ storeId: string; connectionId: string }>;
  searchParams: Promise<{
    status?: string | string[];
    entityType?: string | string[];
    conflictType?: string | string[];
    mappedOnly?: string | string[];
    limit?: string | string[];
    offset?: string | string[];
  }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default async function ConflictsPage({ params, searchParams }: PageProps) {
  const { storeId, connectionId } = await params;
  const query = await searchParams;

  const [connection, summary] = await Promise.all([
    prisma.connection.findUnique({
      where: { id: connectionId },
      select: { id: true, provider: true, displayName: true },
    }),
    getConflictSummary(connectionId),
  ]);

  // Last import and external-changes timestamps for context
  const latestImport = await prisma.catalogImportRun.findFirst({
    where: { connectionId, status: "SUCCEEDED" },
    orderBy: { startedAt: "desc" },
    select: { startedAt: true, diffCompletedAt: true, diffStatus: true },
  });

  const conflicts = await listConflicts({
    connectionId,
    status:       firstParam(query.status)       as CatalogConflictStatus | undefined,
    entityType:   firstParam(query.entityType)   as CatalogEntityType     | undefined,
    conflictType: firstParam(query.conflictType) as CatalogConflictType   | undefined,
    mappedOnly:   firstParam(query.mappedOnly) === "true",
    limit:  parseInt(firstParam(query.limit)  ?? "50", 10),
    offset: parseInt(firstParam(query.offset) ?? "0",  10),
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
        <span className="text-gray-800">Conflict Center</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conflict Center</h1>
          <p className="text-sm text-gray-500 mt-1">
            Conflicts detected between the Beyond catalog and{" "}
            <span className="font-medium">{connection?.provider ?? connectionId}</span>.
            Review each conflict and record your resolution decision.
            <br />
            <span className="italic text-xs">
              Note: Decisions are recorded only — no data is automatically changed.
              Actual sync execution will be applied in a future update.
            </span>
          </p>
        </div>
        <div className="text-right text-xs text-gray-400 space-y-0.5 shrink-0">
          {latestImport && (
            <>
              <div>Last import: {new Date(latestImport.startedAt).toLocaleString()}</div>
              {latestImport.diffCompletedAt && (
                <div>
                  Last diff: {new Date(latestImport.diffCompletedAt).toLocaleString()}
                  {" "}({latestImport.diffStatus})
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Summary cards */}
      <ConflictSummaryCard summary={summary} />

      {/* Filters */}
      <div className="flex items-center justify-between gap-4">
        <ConflictFilters />
        <form method="POST" action="/api/catalog/conflicts/detect">
          <input type="hidden" name="connectionId" value={connectionId} />
          <button
            type="submit"
            className="text-sm px-3 py-1.5 rounded border border-gray-300 hover:bg-gray-50"
          >
            Re-detect conflicts
          </button>
        </form>
      </div>

      {/* Conflict list */}
      <ConflictTable conflicts={conflicts} connectionId={connectionId} storeId={storeId} />

      {/* Navigation */}
      <div className="flex gap-4 text-sm">
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/external-changes`}
          className="text-blue-600 hover:underline"
        >
          ← External Changes
        </Link>
        <Link
          href={`/owner/stores/${storeId}/integrations/${connectionId}/mapping`}
          className="text-blue-600 hover:underline"
        >
          Mapping →
        </Link>
      </div>
    </div>
  );
}
