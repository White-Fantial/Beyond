/**
 * services/external-change-detection/summary.ts
 *
 * Aggregation helpers for ExternalChangeSummary.
 */

import { prisma } from "@/lib/prisma";
import type { ExternalChangeSummary, CatalogEntityType } from "@/types/catalog-external-changes";

export async function buildExternalChangeSummary(connectionId: string): Promise<ExternalChangeSummary> {
  const openChanges = await prisma.externalCatalogChange.findMany({
    where: { connectionId, status: "OPEN" },
    select: {
      entityType: true,
      changeKind: true,
      internalEntityId: true,
    },
  });

  const byEntityType: Record<CatalogEntityType, number> = {
    CATEGORY: 0,
    PRODUCT: 0,
    MODIFIER_GROUP: 0,
    MODIFIER_OPTION: 0,
  };

  let mapped = 0;
  let unmapped = 0;
  let deleted = 0;
  let updated = 0;
  let created = 0;
  let structureChanges = 0;

  for (const c of openChanges) {
    byEntityType[c.entityType as CatalogEntityType] = (byEntityType[c.entityType as CatalogEntityType] ?? 0) + 1;

    if (c.internalEntityId) mapped++;
    else unmapped++;

    if (c.changeKind === "DELETED") deleted++;
    else if (c.changeKind === "UPDATED") updated++;
    else if (c.changeKind === "CREATED") created++;
    else if (c.changeKind === "STRUCTURE_UPDATED" || c.changeKind === "RELINKED") structureChanges++;
  }

  return {
    connectionId,
    totalOpen: openChanges.length,
    byEntityType,
    mapped,
    unmapped,
    deleted,
    updated,
    created,
    structureChanges,
  };
}
