/**
 * services/catalog-conflict/resolution.ts
 *
 * Phase 6: Conflict resolution helpers.
 *
 * NOTE: Resolution in Phase 6 only RECORDS the decision.
 * No data changes to internal catalog or external channel are made here.
 *
 * TODO Phase 7:
 *   - apply KEEP_INTERNAL as outbound publish plan
 *   - apply ACCEPT_EXTERNAL as internal patch plan
 *   - manual merge execution workflow
 *   - field ownership and auto-merge policies
 */

import { prisma } from "@/lib/prisma";
import type {
  CatalogConflictStatus,
  CatalogConflictResolutionStrategy,
  ResolveConflictInput,
  SetConflictStatusInput,
} from "@/types/catalog-conflicts";

/**
 * Records a resolution decision on a conflict.
 * Updates conflict status to RESOLVED and persists the strategy + note.
 */
export async function resolveConflict(input: ResolveConflictInput): Promise<void> {
  const { conflictId, resolutionStrategy, note, resolvedByUserId } = input;

  const conflict = await prisma.catalogConflict.findUnique({ where: { id: conflictId } });
  if (!conflict) throw new Error(`Conflict ${conflictId} not found`);

  const previousStatus = conflict.status as CatalogConflictStatus;
  const now = new Date();

  await prisma.$transaction([
    prisma.catalogConflict.update({
      where: { id: conflictId },
      data: {
        status: "RESOLVED",
        resolutionStrategy: resolutionStrategy as never,
        resolutionNote: note ?? null,
        resolvedAt: now,
        resolvedByUserId: resolvedByUserId ?? null,
      },
    }),
    prisma.catalogConflictResolutionLog.create({
      data: {
        conflictId,
        previousStatus: previousStatus as never,
        newStatus: "RESOLVED",
        strategy: resolutionStrategy as never,
        note: note ?? null,
        changedByUserId: resolvedByUserId ?? null,
      },
    }),
  ]);
}

/**
 * Sets the status of a conflict (e.g., IN_REVIEW, IGNORED).
 * Records a resolution log entry.
 */
export async function setConflictStatus(input: SetConflictStatusInput): Promise<void> {
  const { conflictId, newStatus, note, changedByUserId } = input;

  const conflict = await prisma.catalogConflict.findUnique({ where: { id: conflictId } });
  if (!conflict) throw new Error(`Conflict ${conflictId} not found`);

  const previousStatus = conflict.status as CatalogConflictStatus;

  const updateData: Record<string, unknown> = { status: newStatus };
  if (newStatus === "IGNORED") {
    updateData["resolutionStrategy"] = "IGNORE" satisfies CatalogConflictResolutionStrategy;
    updateData["resolvedAt"] = new Date();
    updateData["resolvedByUserId"] = changedByUserId ?? null;
  }

  await prisma.$transaction([
    prisma.catalogConflict.update({
      where: { id: conflictId },
      data: updateData as never,
    }),
    prisma.catalogConflictResolutionLog.create({
      data: {
        conflictId,
        previousStatus: previousStatus as never,
        newStatus: newStatus as never,
        note: note ?? null,
        changedByUserId: changedByUserId ?? null,
      },
    }),
  ]);
}
