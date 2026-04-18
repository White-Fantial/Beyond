/**
 * services/catalog-conflict/summary.ts
 *
 * Phase 6: Conflict summary aggregation.
 */

import { prisma } from "@/lib/prisma";
import type { ConflictSummary, CatalogConflictType, CatalogEntityType } from "@/types/catalog-conflicts";

export async function buildConflictSummary(connectionId: string): Promise<ConflictSummary> {
  const conflicts = await prisma.catalogConflict.findMany({
    where: { connectionId },
    select: {
      status: true,
      conflictType: true,
      internalEntityType: true,
    },
  });

  const byEntityType: Record<CatalogEntityType, number> = {
    CATEGORY: 0,
    PRODUCT: 0,
    MODIFIER_GROUP: 0,
    MODIFIER_OPTION: 0,
  };

  let totalOpen = 0;
  let totalInReview = 0;
  let totalResolved = 0;
  let totalIgnored = 0;
  let fieldConflicts = 0;
  let structureConflicts = 0;
  let missingIssues = 0;

  for (const c of conflicts) {
    const et = c.internalEntityType as CatalogEntityType;
    byEntityType[et] = (byEntityType[et] ?? 0) + 1;

    if (c.status === "OPEN")       totalOpen++;
    if (c.status === "IN_REVIEW")  totalInReview++;
    if (c.status === "RESOLVED")   totalResolved++;
    if (c.status === "IGNORED")    totalIgnored++;

    const ct = c.conflictType as CatalogConflictType;
    if (ct === "FIELD_VALUE_CONFLICT")    fieldConflicts++;
    if (ct === "STRUCTURE_CONFLICT")      structureConflicts++;
    if (ct === "PARENT_RELATION_CONFLICT") structureConflicts++;
    if (ct === "MISSING_ON_EXTERNAL" || ct === "MISSING_ON_INTERNAL") missingIssues++;
  }

  return {
    connectionId,
    totalOpen,
    totalInReview,
    totalResolved,
    totalIgnored,
    fieldConflicts,
    structureConflicts,
    missingIssues,
    byEntityType,
  };
}
