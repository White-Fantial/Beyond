/**
 * services/catalog-sync-executor.service.ts
 *
 * Phase 7 — Policy-based Controlled Two-way Sync: Plan Executor.
 *
 * Applies CatalogSyncPlan items by routing each action to the appropriate
 * downstream service (inbound-apply or publish).
 */

import { prisma } from "@/lib/prisma";
import type {
  ApplySyncPlanOptions,
  CatalogSyncAction,
  CatalogSyncItemStatus,
  CatalogSyncPlanDto,
  CatalogSyncPlanStatus,
  ListSyncPlansOptions,
  SyncPlanPreview,
} from "@/types/catalog-sync";
import type { CatalogEntityType } from "@/types/catalog-external-changes";
import { applyExternalChangeToInternal } from "./catalog-inbound-apply.service";
import { publishEntityToConnection } from "./catalog-publish.service";
import { getSyncPlan, listSyncPlans, previewSyncPlan } from "./catalog-sync-planner.service";

export { getSyncPlan, listSyncPlans, previewSyncPlan };

// ─── Execution log helpers ────────────────────────────────────────────────────

async function logExecution(opts: {
  planId: string;
  planItemId: string;
  action: CatalogSyncAction;
  status: string;
  requestPayload?: unknown;
  responsePayload?: unknown;
  errorMessage?: string;
  errorCode?: string;
  startedAt: Date;
  completedAt: Date;
}): Promise<void> {
  await prisma.catalogSyncExecutionLog.create({
    data: {
      planId: opts.planId,
      planItemId: opts.planItemId,
      action: opts.action,
      status: opts.status,
      requestPayload: opts.requestPayload as Parameters<typeof prisma.catalogSyncExecutionLog.create>[0]["data"]["requestPayload"],
      responsePayload: opts.responsePayload as Parameters<typeof prisma.catalogSyncExecutionLog.create>[0]["data"]["responsePayload"],
      errorMessage: opts.errorMessage,
      errorCode: opts.errorCode,
      startedAt: opts.startedAt,
      completedAt: opts.completedAt,
    },
  });
}

// ─── Single item execution ────────────────────────────────────────────────────

export async function applySyncPlanItem(planItemId: string): Promise<{ success: boolean; error?: string }> {
  const item = await prisma.catalogSyncPlanItem.findUniqueOrThrow({
    where: { id: planItemId },
    include: { plan: true },
  });

  if (item.status === "BLOCKED" || item.status === "SKIPPED") {
    return { success: false, error: `Item status is ${item.status} — cannot apply` };
  }

  const startedAt = new Date();

  try {
    switch (item.action as CatalogSyncAction) {
      case "APPLY_INTERNAL_PATCH": {
        if (!item.internalEntityId || !item.internalEntityType) {
          throw new Error("Missing internalEntityId or internalEntityType");
        }

        // Build field patches from preview values
        const fieldPatches: Record<string, unknown> = {};
        if (item.fieldPath && item.previewAfterValue !== null && item.previewAfterValue !== undefined) {
          fieldPatches[item.fieldPath] = item.previewAfterValue;
        }

        const result = await applyExternalChangeToInternal({
          tenantId: item.plan.tenantId,
          storeId: item.plan.storeId,
          connectionId: item.plan.connectionId,
          internalEntityType: item.internalEntityType as CatalogEntityType,
          internalEntityId: item.internalEntityId,
          fieldPatches,
          externalChangeId: item.externalChangeId ?? undefined,
        });

        await logExecution({
          planId: item.planId,
          planItemId: item.id,
          action: item.action as CatalogSyncAction,
          status: "APPLIED",
          requestPayload: { fieldPatches },
          responsePayload: result,
          startedAt,
          completedAt: new Date(),
        });

        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: { status: "APPLIED" },
        });

        return { success: true };
      }

      case "APPLY_EXTERNAL_PATCH": {
        if (!item.internalEntityId || !item.internalEntityType) {
          throw new Error("Missing internalEntityId or internalEntityType");
        }

        const result = await publishEntityToConnection({
          tenantId: item.plan.tenantId,
          storeId: item.plan.storeId,
          connectionId: item.plan.connectionId,
          internalEntityType: item.internalEntityType as CatalogEntityType,
          internalEntityId: item.internalEntityId,
          action: "UPDATE",
        });

        const success = result.status === "SUCCEEDED" || result.status === "SKIPPED";

        await logExecution({
          planId: item.planId,
          planItemId: item.id,
          action: item.action as CatalogSyncAction,
          status: success ? "APPLIED" : "FAILED",
          requestPayload: { entityId: item.internalEntityId, entityType: item.internalEntityType },
          responsePayload: result,
          errorMessage: success ? undefined : result.errorMessage ?? "Publish failed",
          startedAt,
          completedAt: new Date(),
        });

        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: {
            status: success ? "APPLIED" : "FAILED",
            publishJobId: result.jobId ?? undefined,
          },
        });

        return success ? { success: true } : { success: false, error: result.errorMessage ?? "Publish failed" };
      }

      case "ARCHIVE_INTERNAL_ENTITY":
      case "ARCHIVE_EXTERNAL_ENTITY": {
        // Limited support: log only
        await logExecution({
          planId: item.planId,
          planItemId: item.id,
          action: item.action as CatalogSyncAction,
          status: "SKIPPED",
          requestPayload: { note: "Archive actions have limited support" },
          responsePayload: null,
          startedAt,
          completedAt: new Date(),
        });

        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: { status: "SKIPPED" },
        });

        return { success: true };
      }

      case "LINK_MAPPING":
      case "UNLINK_MAPPING": {
        if (item.mappingId) {
          // LINK_MAPPING → activate the mapping; UNLINK_MAPPING → archive it
          await prisma.channelEntityMapping.update({
            where: { id: item.mappingId },
            data: {
              status: item.action === "LINK_MAPPING" ? "ACTIVE" : "ARCHIVED",
            },
          });
        }

        await logExecution({
          planId: item.planId,
          planItemId: item.id,
          action: item.action as CatalogSyncAction,
          status: "APPLIED",
          requestPayload: { mappingId: item.mappingId },
          responsePayload: null,
          startedAt,
          completedAt: new Date(),
        });

        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: { status: "APPLIED" },
        });

        return { success: true };
      }

      case "CREATE_INTERNAL_ENTITY":
      case "CREATE_EXTERNAL_ENTITY": {
        // Stub — full implementation requires entity graph traversal
        await logExecution({
          planId: item.planId,
          planItemId: item.id,
          action: item.action as CatalogSyncAction,
          status: "SKIPPED",
          requestPayload: { note: "Create entity actions require manual review" },
          responsePayload: null,
          startedAt,
          completedAt: new Date(),
        });

        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: { status: "SKIPPED" },
        });

        return { success: true };
      }

      case "SKIP":
      default: {
        await prisma.catalogSyncPlanItem.update({
          where: { id: item.id },
          data: { status: "SKIPPED" },
        });
        return { success: true };
      }
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);

    await logExecution({
      planId: item.planId,
      planItemId: item.id,
      action: item.action as CatalogSyncAction,
      status: "FAILED",
      errorMessage,
      startedAt,
      completedAt: new Date(),
    });

    await prisma.catalogSyncPlanItem.update({
      where: { id: item.id },
      data: { status: "FAILED", blockedReason: errorMessage },
    });

    return { success: false, error: errorMessage };
  }
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export async function retrySyncPlanItem(planItemId: string): Promise<{ success: boolean; error?: string }> {
  const item = await prisma.catalogSyncPlanItem.findUnique({
    where: { id: planItemId },
    select: { status: true },
  });

  if (!item || item.status !== "FAILED") {
    return { success: false, error: `Item status is ${item?.status ?? "not found"} — only FAILED items can be retried` };
  }

  // Reset to READY then apply
  await prisma.catalogSyncPlanItem.update({
    where: { id: planItemId },
    data: { status: "READY", blockedReason: null },
  });

  return applySyncPlanItem(planItemId);
}

// ─── Apply full plan ──────────────────────────────────────────────────────────

export async function applySyncPlan(
  planId: string,
  opts?: ApplySyncPlanOptions
): Promise<{ applied: number; failed: number; skipped: number }> {
  const statusFilter = opts?.statusFilter ?? ["READY"];

  const items = await prisma.catalogSyncPlanItem.findMany({
    where: {
      planId,
      status: { in: statusFilter },
    },
    orderBy: { createdAt: "asc" },
  });

  let applied = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of items) {
    const result = await applySyncPlanItem(item.id);
    if (result.success) {
      applied++;
    } else {
      failed++;
    }
  }

  // Count skipped items in final state
  const finalItems = await prisma.catalogSyncPlanItem.findMany({
    where: { planId },
    select: { status: true },
  });

  skipped = finalItems.filter((i) => i.status === "SKIPPED").length;

  // Recompute plan status
  const planStatus = computeFinalPlanStatus(finalItems.map((i) => i.status as CatalogSyncItemStatus));

  await prisma.catalogSyncPlan.update({
    where: { id: planId },
    data: { status: planStatus },
  });

  return { applied, failed, skipped };
}

function computeFinalPlanStatus(statuses: CatalogSyncItemStatus[]): CatalogSyncPlanStatus {
  if (statuses.every((s) => s === "APPLIED")) return "APPLIED";
  if (statuses.some((s) => s === "FAILED")) {
    return statuses.some((s) => s === "APPLIED") ? "FAILED" : "FAILED";
  }
  if (statuses.some((s) => s === "BLOCKED")) {
    return statuses.some((s) => s === "APPLIED" || s === "READY") ? "PARTIALLY_BLOCKED" : "BLOCKED";
  }
  return "APPLIED";
}

// ─── Cancel ───────────────────────────────────────────────────────────────────

export async function cancelSyncPlan(planId: string): Promise<void> {
  await prisma.catalogSyncPlan.update({
    where: { id: planId },
    data: { status: "CANCELLED" },
  });
}

// ─── Inbox summary ────────────────────────────────────────────────────────────

export async function getSyncInboxSummary(connectionId: string) {
  const [openExternalChanges, openConflicts, planItems, latestPlan] = await Promise.all([
    prisma.externalCatalogChange.count({
      where: { connectionId, status: "OPEN" },
    }),
    prisma.catalogConflict.count({
      where: { connectionId, status: { in: ["OPEN", "IN_REVIEW"] } },
    }),
    prisma.catalogSyncPlanItem.groupBy({
      by: ["status"],
      where: {
        plan: {
          connectionId,
          status: { in: ["DRAFT", "READY", "PARTIALLY_BLOCKED"] },
        },
      },
      _count: { _all: true },
    }),
    prisma.catalogSyncPlan.findFirst({
      where: { connectionId, status: { in: ["APPLIED"] } },
      orderBy: { updatedAt: "desc" },
      select: { id: true, updatedAt: true },
    }),
  ]);

  const countByStatus = Object.fromEntries(
    planItems.map((g) => [g.status, g._count._all])
  );

  const activePlan = await prisma.catalogSyncPlan.findFirst({
    where: { connectionId, status: { in: ["DRAFT", "READY", "PARTIALLY_BLOCKED"] } },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  return {
    connectionId,
    openExternalChanges,
    openConflicts,
    readyPlanItems: countByStatus["READY"] ?? 0,
    blockedPlanItems: countByStatus["BLOCKED"] ?? 0,
    failedPlanItems: countByStatus["FAILED"] ?? 0,
    lastSyncAt: latestPlan?.updatedAt.toISOString() ?? null,
    activePlanId: activePlan?.id ?? null,
  };
}
