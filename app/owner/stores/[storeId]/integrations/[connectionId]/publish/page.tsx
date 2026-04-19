/**
 * Catalog Publish Page — Phase 4.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/publish
 *
 * Shows:
 *   - Connection and provider summary
 *   - Publish summary (last success, last failure, pending/running count)
 *   - Per-entity publish control table with row actions
 *   - Recent publish job history
 *
 * Architecture note:
 *   This page only shows outbound publish operations (internal → external).
 *   External → internal sync is Phase 5+.
 *   External normalized catalog is still primarily refreshed via import,
 *   not assumed authoritative from publish success alone.
 *
 * TODO Phase 5: add "external change detection" indicator per entity
 * TODO Phase 6: add conflict status column
 */

import { prisma } from "@/lib/prisma";
import { getPublishJobs } from "@/services/catalog-publish.service";
import PublishControlPanel from "@/components/owner/catalog/publish/PublishControlPanel";
import PublishJobsTable from "@/components/owner/catalog/publish/PublishJobsTable";
import Link from "next/link";
import type { PublishEntityRowData } from "@/components/owner/catalog/publish/PublishEntityRow";
import type { CatalogEntityType } from "@/types/catalog-publish";
import type { CatalogMappingStatus } from "@/types/catalog-mapping";

interface PageProps {
  params: { storeId: string; connectionId: string };
}

const ENTITY_TYPES: CatalogEntityType[] = ["CATEGORY", "PRODUCT", "MODIFIER_GROUP", "MODIFIER_OPTION"];

async function buildPublishRows(storeId: string, connectionId: string): Promise<PublishEntityRowData[]> {
  const rows: PublishEntityRowData[] = [];

  for (const entityType of ENTITY_TYPES) {
    // Load all internal entities of this type for the store.
    let allEntities: { id: string; name?: string | null }[] = [];
    switch (entityType) {
      case "CATEGORY":
        allEntities = await prisma.catalogCategory.findMany({ where: { storeId }, select: { id: true, name: true } });
        break;
      case "PRODUCT":
        allEntities = await prisma.catalogProduct.findMany({ where: { storeId }, select: { id: true, name: true } });
        break;
      case "MODIFIER_GROUP":
        allEntities = await prisma.catalogModifierGroup.findMany({ where: { storeId }, select: { id: true, name: true } });
        break;
      case "MODIFIER_OPTION":
        allEntities = await prisma.catalogModifierOption.findMany({ where: { storeId }, select: { id: true, name: true } });
        break;
    }

    // Load all mappings for this entity type on this connection.
    const mappings = await prisma.channelEntityMapping.findMany({
      where: { connectionId, internalEntityType: entityType, status: { not: "ARCHIVED" } },
      select: {
        id: true,
        internalEntityId: true,
        externalEntityId: true,
        status: true,
        lastPublishStatus: true,
        lastPublishedAt: true,
      },
    });
    const mappingByInternalId = new Map(mappings.map((m) => [m.internalEntityId, m]));

    for (const entity of allEntities) {
      const mapping = mappingByInternalId.get(entity.id);
      rows.push({
        internalEntityId: entity.id,
        internalEntityType: entityType,
        internalEntityName: entity.name ?? null,
        mappingId: mapping?.id ?? null,
        mappingStatus: (mapping?.status as CatalogMappingStatus) ?? null,
        externalEntityId: mapping?.externalEntityId ?? null,
        lastPublishStatus: mapping?.lastPublishStatus ?? null,
        lastPublishedAt: mapping?.lastPublishedAt ?? null,
      });
    }
  }

  return rows;
}

export default async function PublishPage({ params }: PageProps) {
  const { storeId, connectionId } = params;

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { provider: true, displayName: true, status: true, lastSyncAt: true, storeId: true, tenantId: true },
  });

  if (!connection || connection.storeId !== storeId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-gray-500">
        Connection not found or does not belong to this store.
      </div>
    );
  }

  const [rows, recentJobs] = await Promise.all([
    buildPublishRows(storeId, connectionId),
    getPublishJobs({ connectionId, limit: 20 }),
  ]);

  // Publish summary stats.
  const totalJobs = await prisma.catalogPublishJob.count({ where: { connectionId } });
  const pendingRunning = await prisma.catalogPublishJob.count({ where: { connectionId, status: { in: ["PENDING", "RUNNING"] } } });
  const lastSucceeded = await prisma.catalogPublishJob.findFirst({ where: { connectionId, status: "SUCCEEDED" }, orderBy: { completedAt: "desc" }, select: { completedAt: true } });
  const lastFailed = await prisma.catalogPublishJob.findFirst({ where: { connectionId, status: "FAILED" }, orderBy: { completedAt: "desc" }, select: { completedAt: true, errorMessage: true } });

  const basePath = `/owner/stores/${storeId}/integrations/${connectionId}`;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div>
        <nav className="text-xs text-gray-400 mb-2 flex gap-1">
          <Link href={`/owner/stores/${storeId}/integrations`} className="hover:underline">Integrations</Link>
          <span>/</span>
          <Link href={basePath} className="hover:underline">{connection.displayName ?? connection.provider}</Link>
          <span>/</span>
          <span className="text-gray-600">Publish</span>
        </nav>
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Publish to {connection.displayName ?? connection.provider}</h1>
            <p className="text-sm text-gray-500 mt-1">
              Push internal catalog changes to the external channel.
              Internal catalog is the canonical source.
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link
              href={`${basePath}/mapping`}
              className="text-sm px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Mapping Review
            </Link>
          </div>
        </div>
      </div>

      {/* Connection status warning */}
      {connection.status !== "CONNECTED" && (
        <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-3 text-sm text-yellow-800">
          ⚠️ Connection is not CONNECTED (status: {connection.status}). Publish operations will fail until the connection is restored.
        </div>
      )}

      {/* Publish summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryCard label="Total Jobs" value={String(totalJobs)} />
        <SummaryCard label="Pending / Running" value={String(pendingRunning)} highlight={pendingRunning > 0} />
        <SummaryCard
          label="Last Success"
          value={lastSucceeded?.completedAt ? new Date(lastSucceeded.completedAt).toLocaleString() : "Never"}
        />
        <SummaryCard
          label="Last Failure"
          value={lastFailed?.completedAt ? new Date(lastFailed.completedAt).toLocaleString() : "None"}
          error={!!lastFailed}
          tooltip={lastFailed?.errorMessage ?? undefined}
        />
      </div>

      {/* Publish control */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Publish Control</h2>
        <PublishControlPanel connectionId={connectionId} rows={rows} />
      </section>

      {/* Recent job history */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Recent Publish Jobs</h2>
          <span className="text-xs text-gray-400">Last 20 jobs</span>
        </div>
        <PublishJobsTable
          jobs={recentJobs.map((j) => ({
            ...j,
            requestPayload: j.requestPayload as Record<string, unknown> | null,
            responsePayload: j.responsePayload as Record<string, unknown> | null,
          }))}
        />
      </section>

      {/* Architecture note */}
      <div className="text-xs text-gray-400 border-t pt-4 space-y-1">
        <p>
          <strong>Phase 4 — One-way Publish:</strong> Publish pushes from internal catalog → external channel only.
          External → internal sync is not enabled yet (Phase 5+).
        </p>
        <p>
          External normalized catalog tables are refreshed via import, not from publish results.
          Publish success does not immediately make external tables authoritative.
        </p>
        <p>
          {/* TODO Phase 5: add external change detection after import */}
          {/* TODO Phase 6: add conflict detection */}
          {/* TODO Phase 7: policy-based two-way sync */}
        </p>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  highlight = false,
  error = false,
  tooltip,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  error?: boolean;
  tooltip?: string;
}) {
  return (
    <div
      className={`rounded-lg border p-4 ${error ? "border-red-200 bg-red-50" : highlight ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-white"}`}
      title={tooltip}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${error ? "text-red-700" : highlight ? "text-yellow-700" : "text-gray-800"}`}>
        {value}
      </p>
    </div>
  );
}
