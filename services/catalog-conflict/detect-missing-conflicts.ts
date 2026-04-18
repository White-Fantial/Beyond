/**
 * services/catalog-conflict/detect-missing-conflicts.ts
 *
 * Phase 6: Missing-entity conflict detection.
 *
 * Detects:
 *   - MISSING_ON_EXTERNAL: mapping exists but external entity is absent from latest import
 *   - MISSING_ON_INTERNAL: external change exists but internal entity is missing/deleted
 */

import { prisma } from "@/lib/prisma";
import type { ConflictFieldCandidate } from "@/types/catalog-conflicts";
import type { CatalogConflictType, CatalogConflictScope } from "@/types/catalog-conflicts";

export interface MissingConflictResult {
  conflictType: CatalogConflictType;
  scope: CatalogConflictScope;
  summary: string;
  candidates: ConflictFieldCandidate[];
}

/**
 * Check whether the external entity referenced by a mapping still exists in the latest import.
 * If it's missing, returns a MISSING_ON_EXTERNAL candidate.
 */
export async function detectMissingOnExternal(
  connectionId: string,
  externalEntityId: string,
  externalEntityType: string
): Promise<boolean> {
  // Check if external entity exists in current external catalog mirror
  switch (externalEntityType) {
    case "PRODUCT": {
      const r = await prisma.externalCatalogProduct.findUnique({
        where: { connectionId_externalId: { connectionId, externalId: externalEntityId } },
        select: { id: true },
      });
      return r === null;
    }
    case "CATEGORY": {
      const r = await prisma.externalCatalogCategory.findUnique({
        where: { connectionId_externalId: { connectionId, externalId: externalEntityId } },
        select: { id: true },
      });
      return r === null;
    }
    case "MODIFIER_GROUP": {
      const r = await prisma.externalCatalogModifierGroup.findUnique({
        where: { connectionId_externalId: { connectionId, externalId: externalEntityId } },
        select: { id: true },
      });
      return r === null;
    }
    case "MODIFIER_OPTION": {
      const r = await prisma.externalCatalogModifierOption.findUnique({
        where: { connectionId_externalId: { connectionId, externalId: externalEntityId } },
        select: { id: true },
      });
      return r === null;
    }
    default:
      return false;
  }
}

/**
 * Check whether the internal entity referenced by a change/mapping still exists.
 * If it's missing or deleted, returns true.
 */
export async function detectMissingOnInternal(
  internalEntityId: string,
  internalEntityType: string
): Promise<boolean> {
  switch (internalEntityType) {
    case "PRODUCT": {
      const r = await prisma.catalogProduct.findUnique({
        where: { id: internalEntityId },
        select: { id: true, deletedAt: true },
      });
      return r === null || r.deletedAt !== null;
    }
    case "CATEGORY": {
      const r = await prisma.catalogCategory.findUnique({
        where: { id: internalEntityId },
        select: { id: true, deletedAt: true },
      });
      return r === null || r.deletedAt !== null;
    }
    case "MODIFIER_GROUP": {
      const r = await prisma.catalogModifierGroup.findUnique({
        where: { id: internalEntityId },
        select: { id: true, deletedAt: true },
      });
      return r === null || r.deletedAt !== null;
    }
    case "MODIFIER_OPTION": {
      const r = await prisma.catalogModifierOption.findUnique({
        where: { id: internalEntityId },
        select: { id: true, deletedAt: true },
      });
      return r === null || r.deletedAt !== null;
    }
    default:
      return false;
  }
}

/** Maps entity type string to CatalogConflictScope. */
export function entityTypeToScope(entityType: string): CatalogConflictScope {
  switch (entityType) {
    case "CATEGORY":       return "CATEGORY";
    case "PRODUCT":        return "PRODUCT";
    case "MODIFIER_GROUP": return "MODIFIER_GROUP";
    case "MODIFIER_OPTION": return "MODIFIER_OPTION";
    default:               return "PRODUCT";
  }
}
