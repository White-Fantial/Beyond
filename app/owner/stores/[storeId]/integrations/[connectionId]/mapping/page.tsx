/**
 * Catalog Mapping Review Page — Phase 3.
 *
 * Located at:
 *   /owner/stores/[storeId]/integrations/[connectionId]/mapping
 *
 * Shows the mapping review summary and a filterable list of entity mappings
 * for a specific connection.  Supports:
 *   - Tab/filter by entity type (Products, Categories, Modifier Groups, Options)
 *   - Filter by status (All, Needs Review, Unmatched, Broken)
 *   - Per-row actions: Approve, Unlink
 *   - Buttons to trigger Auto-Match and Validate
 */

import { prisma } from "@/lib/prisma";
import {
  listMappingsByConnection,
  getMappingReviewSummary,
} from "@/services/catalog-mapping.service";
import MappingReviewCard from "@/components/owner/catalog/mapping/MappingReviewCard";
import MappingTable from "@/components/owner/catalog/mapping/MappingTable";
import Link from "next/link";
import type { CatalogEntityType, CatalogMappingStatus } from "@/types/catalog-mapping";

interface PageProps {
  params: { storeId: string; connectionId: string };
  searchParams: { status?: string; entityType?: string };
}

const ENTITY_TYPE_TABS: { label: string; value: CatalogEntityType | "" }[] = [
  { label: "All", value: "" },
  { label: "Products", value: "PRODUCT" },
  { label: "Categories", value: "CATEGORY" },
  { label: "Modifier Groups", value: "MODIFIER_GROUP" },
  { label: "Modifier Options", value: "MODIFIER_OPTION" },
];

const STATUS_FILTERS: { label: string; value: CatalogMappingStatus | "" }[] = [
  { label: "All", value: "" },
  { label: "Active", value: "ACTIVE" },
  { label: "Needs Review", value: "NEEDS_REVIEW" },
  { label: "Unmatched", value: "UNMATCHED" },
  { label: "Broken", value: "BROKEN" },
];

export default async function MappingReviewPage({ params, searchParams }: PageProps) {
  const { storeId, connectionId } = params;
  const selectedEntityType = (searchParams.entityType as CatalogEntityType) || undefined;
  const selectedStatus = (searchParams.status as CatalogMappingStatus) || undefined;

  // Load connection info.
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { provider: true, displayName: true, lastSyncAt: true, storeId: true },
  });

  if (!connection || connection.storeId !== storeId) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-10 text-sm text-gray-500">
        Connection not found or does not belong to this store.
      </div>
    );
  }

  // Load data.
  const [summary, mappings] = await Promise.all([
    getMappingReviewSummary(connectionId),
    listMappingsByConnection(connectionId, {
      entityType: selectedEntityType,
      status: selectedStatus,
      perPage: 100,
    }),
  ]);

  const basePath = `/owner/stores/${storeId}/integrations/${connectionId}/mapping`;

  function tabHref(entityType: CatalogEntityType | "") {
    const sp = new URLSearchParams();
    if (entityType) sp.set("entityType", entityType);
    if (selectedStatus) sp.set("status", selectedStatus);
    return `${basePath}?${sp.toString()}`;
  }

  function statusHref(status: CatalogMappingStatus | "") {
    const sp = new URLSearchParams();
    if (selectedEntityType) sp.set("entityType", selectedEntityType);
    if (status) sp.set("status", status);
    return `${basePath}?${sp.toString()}`;
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-10 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs text-gray-400 mb-1">
            <Link href={`/owner/stores/${storeId}/integrations`} className="hover:underline">
              ← Integrations
            </Link>
          </div>
          <h1 className="text-xl font-bold text-gray-900">
            Catalog Mapping — {connection.displayName ?? connection.provider}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Review and manage how external catalog entities are linked to your internal catalog.
          </p>
          {connection.lastSyncAt && (
            <p className="text-xs text-gray-400 mt-1">
              Last import: {new Date(connection.lastSyncAt).toLocaleString("en-US")}
            </p>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 mt-1">
          <form action="/api/catalog/mappings/auto-match" method="post">
            <input type="hidden" name="connectionId" value={connectionId} />
            <button
              type="submit"
              className="text-sm font-medium px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700"
            >
              Auto-Match
            </button>
          </form>
          <form action="/api/catalog/mappings/validate" method="post">
            <input type="hidden" name="connectionId" value={connectionId} />
            <button
              type="submit"
              className="text-sm font-medium px-3 py-1.5 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Validate
            </button>
          </form>
        </div>
      </div>

      {/* Summary cards */}
      <MappingReviewCard summary={summary} />

      {/* Entity type tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {ENTITY_TYPE_TABS.map((tab) => {
          const active = (selectedEntityType ?? "") === tab.value;
          return (
            <Link
              key={tab.value}
              href={tabHref(tab.value)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                active
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Status filter chips */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((sf) => {
          const active = (selectedStatus ?? "") === sf.value;
          return (
            <Link
              key={sf.value}
              href={statusHref(sf.value)}
              className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors ${
                active
                  ? "bg-gray-800 text-white border-gray-800"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {sf.label}
            </Link>
          );
        })}
      </div>

      {/* Mapping table */}
      <MappingTable mappings={mappings} />

      {/* Phase notes */}
      <div className="rounded-md bg-blue-50 border border-blue-200 p-4 text-xs text-blue-700">
        <strong>Phase 3 — Mapping Review</strong>: Review and approve auto-matched entities.
        Manually link unmatched external entities to existing internal catalog items.
        Broken mappings must be resolved before publish or sync can be enabled (Phase 4+).
      </div>
    </div>
  );
}
