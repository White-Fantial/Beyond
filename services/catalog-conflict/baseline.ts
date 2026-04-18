/**
 * services/catalog-conflict/baseline.ts
 *
 * Phase 6: Baseline resolution helpers.
 *
 * Determines the "last common baseline" for a given internal entity + connection.
 * The baseline is the best known point from which both internal and external
 * changes are measured.
 *
 * Strategy (in priority order):
 *   1. lastPublishedAt on the ChannelEntityMapping (publish was a sync point)
 *   2. The detectedAt of the earliest OPEN external change for this entity
 *      (external diverged from here)
 *   3. internal entity updatedAt (fallback — less precise)
 *
 * TODO Phase 7:
 *   - Replace with a proper merge-base model (git-style common ancestor)
 *   - Store explicit baseline snapshots per entity per connection
 */

import { prisma } from "@/lib/prisma";

export interface BaselineResult {
  /**
   * The baseline timestamp: changes AFTER this on both sides constitute a conflict.
   * Null means no reliable baseline could be determined.
   */
  baselineAt: Date | null;
  /** Which strategy was used to derive the baseline. */
  strategy: "LAST_PUBLISH" | "EXTERNAL_CHANGE_DETECTION" | "INTERNAL_UPDATED_AT" | "NONE";
}

/**
 * Resolve the baseline for an internal entity relative to a specific connection.
 *
 * @param connectionId      The external channel connection.
 * @param internalEntityId  Internal entity UUID.
 * @param entityType        e.g. "PRODUCT"
 */
export async function resolveBaseline(
  connectionId: string,
  internalEntityId: string,
  entityType: string
): Promise<BaselineResult> {
  // 1. Check mapping for lastPublishedAt
  const mapping = await prisma.channelEntityMapping.findFirst({
    where: {
      connectionId,
      internalEntityId,
      internalEntityType: entityType as never,
      status: { in: ["ACTIVE", "NEEDS_REVIEW"] },
    },
    select: { lastPublishedAt: true },
    orderBy: { lastPublishedAt: "desc" },
  });

  if (mapping?.lastPublishedAt) {
    return { baselineAt: mapping.lastPublishedAt, strategy: "LAST_PUBLISH" };
  }

  // 2. Earliest OPEN/ACKNOWLEDGED external change for this internal entity
  const earliestChange = await prisma.externalCatalogChange.findFirst({
    where: {
      connectionId,
      internalEntityId,
      status: { in: ["OPEN", "ACKNOWLEDGED"] },
    },
    orderBy: { detectedAt: "asc" },
    select: { detectedAt: true },
  });

  if (earliestChange) {
    return { baselineAt: earliestChange.detectedAt, strategy: "EXTERNAL_CHANGE_DETECTION" };
  }

  // 3. Fallback to internal entity updatedAt
  const entityRecord = await findInternalEntityUpdatedAt(internalEntityId, entityType);
  if (entityRecord) {
    return { baselineAt: entityRecord, strategy: "INTERNAL_UPDATED_AT" };
  }

  return { baselineAt: null, strategy: "NONE" };
}

async function findInternalEntityUpdatedAt(
  internalEntityId: string,
  entityType: string
): Promise<Date | null> {
  switch (entityType) {
    case "PRODUCT": {
      const r = await prisma.catalogProduct.findUnique({ where: { id: internalEntityId }, select: { updatedAt: true } });
      return r?.updatedAt ?? null;
    }
    case "CATEGORY": {
      const r = await prisma.catalogCategory.findUnique({ where: { id: internalEntityId }, select: { updatedAt: true } });
      return r?.updatedAt ?? null;
    }
    case "MODIFIER_GROUP": {
      const r = await prisma.catalogModifierGroup.findUnique({ where: { id: internalEntityId }, select: { updatedAt: true } });
      return r?.updatedAt ?? null;
    }
    case "MODIFIER_OPTION": {
      const r = await prisma.catalogModifierOption.findUnique({ where: { id: internalEntityId }, select: { updatedAt: true } });
      return r?.updatedAt ?? null;
    }
    default:
      return null;
  }
}

/**
 * Returns whether the internal entity has changed AFTER the given baseline date,
 * based on InternalCatalogChange log entries.
 */
export async function hasInternalChangedAfterBaseline(
  tenantId: string,
  storeId: string,
  internalEntityId: string,
  entityType: string,
  fieldPath: string,
  baselineAt: Date | null
): Promise<boolean> {
  if (!baselineAt) {
    // No baseline — assume internal may have changed (conservative)
    return true;
  }

  const count = await prisma.internalCatalogChange.count({
    where: {
      tenantId,
      storeId,
      entityType: entityType as never,
      internalEntityId,
      fieldPath,
      changedAt: { gt: baselineAt },
    },
  });

  if (count > 0) return true;

  // Fallback: check entity updatedAt against baseline
  const updatedAt = await findInternalEntityUpdatedAt(internalEntityId, entityType);
  if (updatedAt && updatedAt > baselineAt) {
    // Entity was updated after baseline — treat as changed (conservative)
    return true;
  }

  return false;
}
