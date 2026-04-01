/**
 * Admin Job Service — orchestration layer for the Platform Admin Jobs Console.
 *
 * This service is responsible for:
 * 1. Listing and querying JobRun records.
 * 2. Creating manual job run records.
 * 3. Creating retry job run records (new run, parentRunId linked).
 * 4. Executing safe job types by delegating to existing domain services.
 * 5. Maintaining status transitions: QUEUED → RUNNING → SUCCEEDED / FAILED.
 * 6. Writing audit log entries for every action.
 *
 * It never bypasses idempotency rules or safety guards defined in domain services.
 */

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { buildPaginationMeta } from "@/lib/admin/filters";
import { canRetryJobRun, canManuallyRunJobType } from "@/lib/admin/jobs/guards";
import { normalizeJobRunListItem, normalizeJobRunDetail } from "@/lib/admin/jobs/normalize";
import {
  auditJobManualRunRequested,
  auditJobRunCreated,
  auditJobRunStarted,
  auditJobRunSucceeded,
  auditJobRunFailed,
  auditJobRunRetried,
} from "@/lib/audit";
import { runLoyverseFullCatalogSync } from "@/services/catalog-sync.service";
import { refreshConnectionCredentials } from "@/services/integration.service";
import { forwardOrderToPos } from "@/services/order.service";
import { decryptJson } from "@/lib/integrations/crypto";
import type { ParsedAdminJobFilters } from "@/lib/admin/jobs/filters";
import type {
  AdminJobRunListItem,
  AdminJobRunDetail,
  ManualJobRunInput,
} from "@/types/admin-jobs";
import type { PaginatedResult } from "@/types/admin";
import type { JobType, JobRunStatus } from "@prisma/client";
import type { DecryptedCredentialPayload } from "@/domains/integration/types";

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listAdminJobRuns(
  filters: ParsedAdminJobFilters
): Promise<PaginatedResult<AdminJobRunListItem>> {
  const {
    jobType,
    status,
    tenantId,
    storeId,
    provider,
    triggerSource,
    failedOnly,
    from,
    to,
    page,
    pageSize,
    skip,
  } = filters;

  const where = {
    ...(jobType ? { jobType } : {}),
    ...(status ? { status } : {}),
    ...(failedOnly ? { status: "FAILED" as JobRunStatus } : {}),
    ...(tenantId ? { tenantId } : {}),
    ...(storeId ? { storeId } : {}),
    ...(provider ? { provider } : {}),
    ...(triggerSource ? { triggerSource } : {}),
    ...(from || to
      ? {
          createdAt: {
            ...(from ? { gte: from } : {}),
            ...(to ? { lte: to } : {}),
          },
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.jobRun.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      include: {
        triggeredByUser: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.jobRun.count({ where }),
  ]);

  // Fetch tenant/store names for the rows that have them
  const tenantIds = [...new Set(rows.map((r) => r.tenantId).filter(Boolean) as string[])];
  const storeIds = [...new Set(rows.map((r) => r.storeId).filter(Boolean) as string[])];

  const [tenants, stores] = await Promise.all([
    tenantIds.length
      ? prisma.tenant.findMany({
          where: { id: { in: tenantIds } },
          select: { id: true, displayName: true },
        })
      : [],
    storeIds.length
      ? prisma.store.findMany({
          where: { id: { in: storeIds } },
          select: { id: true, name: true },
        })
      : [],
  ]);

  const tenantMap = new Map(tenants.map((t) => [t.id, t]));
  const storeMap = new Map(stores.map((s) => [s.id, s]));

  const items = rows.map((row) =>
    normalizeJobRunListItem({
      ...row,
      tenant: row.tenantId ? tenantMap.get(row.tenantId) ?? null : null,
      store: row.storeId ? storeMap.get(row.storeId) ?? null : null,
    })
  );

  return { items, pagination: buildPaginationMeta(total, page, pageSize) };
}

// ─── Detail ───────────────────────────────────────────────────────────────────

export async function getAdminJobRunDetail(
  jobRunId: string
): Promise<AdminJobRunDetail | null> {
  const row = await prisma.jobRun.findUnique({
    where: { id: jobRunId },
    include: {
      triggeredByUser: { select: { id: true, name: true, email: true } },
      childRuns: {
        select: { id: true, status: true, triggerSource: true, createdAt: true, finishedAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!row) return null;

  const [tenantData, storeData] = await Promise.all([
    row.tenantId
      ? prisma.tenant.findUnique({ where: { id: row.tenantId }, select: { id: true, displayName: true } })
      : null,
    row.storeId
      ? prisma.store.findUnique({ where: { id: row.storeId }, select: { id: true, name: true } })
      : null,
  ]);

  return normalizeJobRunDetail({
    ...row,
    tenant: tenantData ?? null,
    store: storeData ?? null,
  });
}

// ─── Create manual job run ────────────────────────────────────────────────────

export async function createManualJobRun(
  input: ManualJobRunInput,
  actorUserId: string
): Promise<AdminJobRunDetail> {
  if (!canManuallyRunJobType(input.jobType)) {
    throw new Error(`Job type ${input.jobType} is not allowed for manual run.`);
  }

  const now = new Date();

  const run = await prisma.jobRun.create({
    data: {
      jobType: input.jobType,
      status: "QUEUED",
      triggerSource: "ADMIN_MANUAL",
      triggeredByUserId: actorUserId,
      tenantId: input.tenantId ?? null,
      storeId: input.storeId ?? null,
      provider: input.provider ?? null,
      relatedEntityType: input.relatedEntityType ?? null,
      relatedEntityId: input.relatedEntityId ?? null,
      inputJson: buildInputJson(input) as Prisma.InputJsonValue,
      queuedAt: now,
    },
    include: {
      triggeredByUser: { select: { id: true, name: true, email: true } },
      childRuns: true,
    },
  });

  await auditJobManualRunRequested(run.id, actorUserId, {
    jobType: input.jobType,
    tenantId: input.tenantId,
    storeId: input.storeId,
    provider: input.provider,
  });
  await auditJobRunCreated(run.id, actorUserId, {
    jobType: input.jobType,
    triggerSource: "ADMIN_MANUAL",
  });

  // Execute immediately
  await executeJobRun(run.id, actorUserId);

  const detail = await getAdminJobRunDetail(run.id);
  if (!detail) throw new Error(`JobRun ${run.id} not found after creation.`);
  return detail;
}

// ─── Retry job run ────────────────────────────────────────────────────────────

export async function retryAdminJobRun(
  originalRunId: string,
  actorUserId: string
): Promise<AdminJobRunDetail> {
  const originalRun = await prisma.jobRun.findUnique({ where: { id: originalRunId } });
  if (!originalRun) throw new Error(`JobRun ${originalRunId} not found.`);

  if (!canRetryJobRun(originalRun.status, originalRun.jobType)) {
    throw new Error(
      `JobRun ${originalRunId} cannot be retried (status=${originalRun.status}, type=${originalRun.jobType}).`
    );
  }

  const now = new Date();

  // Create a NEW run — never mutate the original
  const retryRun = await prisma.jobRun.create({
    data: {
      jobType: originalRun.jobType,
      status: "QUEUED",
      triggerSource: "ADMIN_RETRY",
      triggeredByUserId: actorUserId,
      parentRunId: originalRunId,
      tenantId: originalRun.tenantId,
      storeId: originalRun.storeId,
      provider: originalRun.provider,
      relatedEntityType: originalRun.relatedEntityType,
      relatedEntityId: originalRun.relatedEntityId,
      inputJson: (originalRun.inputJson ?? Prisma.JsonNull) as Prisma.InputJsonValue,
      queuedAt: now,
    },
    include: {
      triggeredByUser: { select: { id: true, name: true, email: true } },
      childRuns: true,
    },
  });

  await auditJobRunCreated(retryRun.id, actorUserId, {
    jobType: retryRun.jobType,
    triggerSource: "ADMIN_RETRY",
    parentRunId: originalRunId,
  });
  await auditJobRunRetried(retryRun.id, originalRunId, actorUserId, {
    jobType: retryRun.jobType,
  });

  // Execute immediately
  await executeJobRun(retryRun.id, actorUserId);

  const detail = await getAdminJobRunDetail(retryRun.id);
  if (!detail) throw new Error(`JobRun ${retryRun.id} not found after retry creation.`);
  return detail;
}

// ─── Execute ──────────────────────────────────────────────────────────────────

async function executeJobRun(jobRunId: string, actorUserId?: string): Promise<void> {
  const run = await prisma.jobRun.findUnique({ where: { id: jobRunId } });
  if (!run) throw new Error(`JobRun ${jobRunId} not found.`);

  await markJobRunRunning(jobRunId);
  await auditJobRunStarted(jobRunId, { jobType: run.jobType });

  try {
    const input = (run.inputJson ?? {}) as Record<string, unknown>;
    let result: Record<string, unknown> = {};

    switch (run.jobType) {
      case "CATALOG_SYNC":
        result = await runCatalogSyncJob(run.id, input);
        break;
      case "CONNECTION_VALIDATE":
        result = await runConnectionValidationJob(run.id, input);
        break;
      case "CONNECTION_REFRESH_CHECK":
        result = await runConnectionRefreshCheckJob(run.id, input);
        break;
      case "ORDER_RECOVERY_RETRY":
        result = await runOrderRecoveryRetryJob(run.id, input);
        break;
      case "ORDER_RECONCILIATION_RETRY":
        result = await runOrderReconciliationRetryJob(run.id, input);
        break;
      case "ANALYTICS_REBUILD":
        result = await runAnalyticsRebuildJob(run.id, input);
        break;
      default:
        throw new Error(`Unknown job type: ${run.jobType}`);
    }

    await markJobRunSucceeded(jobRunId, result);
    await auditJobRunSucceeded(jobRunId, actorUserId, {
      jobType: run.jobType,
      resultSummary: typeof result.summary === "string" ? result.summary : undefined,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    const errorCode = err instanceof Error && "code" in err ? String((err as Record<string, unknown>).code) : "JOB_EXECUTION_FAILED";
    await markJobRunFailed(jobRunId, { errorCode, errorMessage });
    await auditJobRunFailed(jobRunId, actorUserId, {
      jobType: run.jobType,
      errorCode,
      errorMessage: errorMessage.slice(0, 500),
    });
  }
}

// ─── Status transitions ───────────────────────────────────────────────────────

async function markJobRunRunning(jobRunId: string): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status: "RUNNING", startedAt: new Date() },
  });
}

async function markJobRunSucceeded(
  jobRunId: string,
  result: Record<string, unknown>
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: { status: "SUCCEEDED", finishedAt: new Date(), resultJson: result as Prisma.InputJsonValue },
  });
}

async function markJobRunFailed(
  jobRunId: string,
  error: { errorCode: string; errorMessage: string }
): Promise<void> {
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      errorCode: error.errorCode,
      errorMessage: error.errorMessage,
    },
  });
}

// ─── Job type executors ───────────────────────────────────────────────────────

async function runCatalogSyncJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const tenantId = String(input.tenantId ?? "");
  const storeId = String(input.storeId ?? "");

  if (!tenantId || !storeId) {
    throw new Error("CATALOG_SYNC requires tenantId and storeId.");
  }

  // Find active Loyverse connection and credentials for this store
  const connection = await prisma.connection.findFirst({
    where: {
      tenantId,
      storeId,
      provider: "LOYVERSE",
      status: { in: ["CONNECTED", "ERROR"] },
    },
    include: {
      credentials: { where: { isActive: true } },
    },
  });

  if (!connection) {
    throw Object.assign(new Error("No active Loyverse connection found for this store."), {
      code: "NO_CONNECTION",
    });
  }

  if (!connection.credentials.length) {
    throw Object.assign(new Error("No active credentials found for this connection."), {
      code: "NO_CREDENTIALS",
    });
  }

  const cred = decryptJson<DecryptedCredentialPayload>(connection.credentials[0].configEncrypted);
  if (!cred.accessToken) {
    throw Object.assign(new Error("No access token found in credentials."), {
      code: "NO_ACCESS_TOKEN",
    });
  }

  const syncResult = await runLoyverseFullCatalogSync({
    tenantId,
    storeId,
    connectionId: connection.id,
    accessToken: cred.accessToken,
  });

  return {
    summary: `Catalog sync complete. Categories: +${syncResult.categories.created}/~${syncResult.categories.updated}, Products: +${syncResult.products.created}/~${syncResult.products.updated}`,
    ...syncResult,
  };
}

async function runConnectionValidationJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const connectionId = String(input.connectionId ?? input.relatedEntityId ?? "");

  if (!connectionId) {
    throw Object.assign(new Error("CONNECTION_VALIDATE requires connectionId."), {
      code: "MISSING_CONNECTION_ID",
    });
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { credentials: { where: { isActive: true } } },
  });

  if (!connection) {
    throw Object.assign(new Error(`Connection ${connectionId} not found.`), {
      code: "CONNECTION_NOT_FOUND",
    });
  }

  const hasCredentials = connection.credentials.length > 0;
  const isConnected = connection.status === "CONNECTED";
  const isExpired = connection.credentials.some(
    (c) => c.expiresAt && c.expiresAt < new Date()
  );
  const needsRefresh = connection.credentials.some(
    (c) => c.refreshAfter && c.refreshAfter < new Date()
  );
  const requiresReauth = connection.status === "REAUTH_REQUIRED";

  return {
    summary: `Validation complete. Status: ${connection.status}`,
    connectionId,
    provider: connection.provider,
    status: connection.status,
    isConnected,
    hasCredentials,
    isExpired,
    needsRefresh,
    requiresReauth,
    lastAuthValidatedAt: connection.lastAuthValidatedAt?.toISOString() ?? null,
    lastErrorCode: connection.lastErrorCode ?? null,
  };
}

async function runConnectionRefreshCheckJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const connectionId = String(input.connectionId ?? input.relatedEntityId ?? "");

  if (!connectionId) {
    throw Object.assign(new Error("CONNECTION_REFRESH_CHECK requires connectionId."), {
      code: "MISSING_CONNECTION_ID",
    });
  }

  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: { credentials: { where: { isActive: true } } },
  });

  if (!connection) {
    throw Object.assign(new Error(`Connection ${connectionId} not found.`), {
      code: "CONNECTION_NOT_FOUND",
    });
  }

  // Only proceed if token refresh is supported and needed
  const needsRefresh = connection.credentials.some(
    (c) => c.canRefresh && c.refreshAfter && c.refreshAfter <= new Date()
  );

  if (!needsRefresh) {
    return {
      summary: `No refresh needed for connection ${connectionId} (status: ${connection.status}).`,
      connectionId,
      provider: connection.provider,
      status: connection.status,
      refreshAttempted: false,
    };
  }

  // Delegate to existing integration service — reuses all safety guards
  await refreshConnectionCredentials(connectionId);

  const refreshedConnection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { status: true, lastAuthValidatedAt: true, lastErrorCode: true },
  });

  return {
    summary: `Refresh complete. New status: ${refreshedConnection?.status ?? "unknown"}`,
    connectionId,
    provider: connection.provider,
    previousStatus: connection.status,
    newStatus: refreshedConnection?.status,
    refreshAttempted: true,
    lastAuthValidatedAt: refreshedConnection?.lastAuthValidatedAt?.toISOString() ?? null,
  };
}

async function runOrderRecoveryRetryJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const orderId = String(input.orderId ?? input.relatedEntityId ?? "");

  if (!orderId) {
    throw Object.assign(new Error("ORDER_RECOVERY_RETRY requires orderId."), {
      code: "MISSING_ORDER_ID",
    });
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    throw Object.assign(new Error(`Order ${orderId} not found.`), {
      code: "ORDER_NOT_FOUND",
    });
  }

  // Only attempt recovery if POS forwarding is required and it failed
  if (!order.posForwardingRequired) {
    return {
      summary: `Order ${orderId} does not require POS forwarding. Skipping.`,
      orderId,
      posSubmissionStatus: order.posSubmissionStatus,
      action: "SKIPPED",
    };
  }

  if (order.posSubmissionStatus === "ACCEPTED") {
    return {
      summary: `Order ${orderId} already successfully forwarded to POS. Skipping.`,
      orderId,
      posSubmissionStatus: order.posSubmissionStatus,
      action: "SKIPPED",
    };
  }

  if (!order.posConnectionId) {
    throw Object.assign(new Error("Order has no POS connection ID for forwarding."), {
      code: "NO_POS_CONNECTION",
    });
  }

  // Delegate to forwardOrderToPos — reuses existing idempotency and safety logic
  await forwardOrderToPos({
    orderId,
    posConnectionId: order.posConnectionId,
    requestPayload: { retriggeredByJobRunId: jobRunId, source: "admin_recovery_retry" },
  });

  return {
    summary: `Order ${orderId} POS forwarding re-triggered.`,
    orderId,
    posConnectionId: order.posConnectionId,
    action: "FORWARDED",
  };
}

async function runOrderReconciliationRetryJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const storeId = String(input.storeId ?? "");
  const tenantId = String(input.tenantId ?? "");

  if (!storeId || !tenantId) {
    throw Object.assign(new Error("ORDER_RECONCILIATION_RETRY requires tenantId and storeId."), {
      code: "MISSING_PARAMS",
    });
  }

  // Find orders with PENDING or FAILED POS submission that require forwarding
  const failedOrders = await prisma.order.findMany({
    where: {
      tenantId,
      storeId,
      posForwardingRequired: true,
      posSubmissionStatus: { in: ["PENDING", "FAILED"] },
    },
    take: 20,
    orderBy: { orderedAt: "desc" },
  });

  if (failedOrders.length === 0) {
    return {
      summary: "No orders requiring POS reconciliation found.",
      storeId,
      ordersProcessed: 0,
      action: "SKIPPED",
    };
  }

  const results = { forwarded: 0, skipped: 0, failed: 0 };

  for (const order of failedOrders) {
    if (!order.posConnectionId) {
      results.skipped++;
      continue;
    }
    try {
      await forwardOrderToPos({
        orderId: order.id,
        posConnectionId: order.posConnectionId,
        requestPayload: { retriggeredByJobRunId: jobRunId, source: "admin_reconciliation_retry" },
      });
      results.forwarded++;
    } catch {
      results.failed++;
    }
  }

  return {
    summary: `Reconciliation complete. Forwarded: ${results.forwarded}, Skipped: ${results.skipped}, Failed: ${results.failed}`,
    storeId,
    ordersFound: failedOrders.length,
    ...results,
  };
}

async function runAnalyticsRebuildJob(
  jobRunId: string,
  input: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const storeId = String(input.storeId ?? "");
  const tenantId = String(input.tenantId ?? "");

  if (!storeId || !tenantId) {
    throw Object.assign(new Error("ANALYTICS_REBUILD requires tenantId and storeId."), {
      code: "MISSING_PARAMS",
    });
  }

  // Compute basic sales summary for the store
  const [orderSummary, periodSummary] = await Promise.all([
    prisma.order.aggregate({
      where: {
        tenantId,
        storeId,
        status: { in: ["COMPLETED", "ACCEPTED", "READY"] },
      },
      _count: { id: true },
      _sum: { subtotalAmount: true, taxAmount: true, discountAmount: true },
    }),
    prisma.order.groupBy({
      by: ["sourceChannel"],
      where: {
        tenantId,
        storeId,
        status: { in: ["COMPLETED", "ACCEPTED", "READY"] },
      },
      _count: { id: true },
      _sum: { subtotalAmount: true },
    }),
  ]);

  const channelBreakdown = periodSummary.reduce<Record<string, unknown>>(
    (acc, row) => {
      acc[row.sourceChannel] = {
        count: row._count.id,
        subtotalAmount: row._sum.subtotalAmount ?? 0,
      };
      return acc;
    },
    {}
  );

  const rebuildResult = {
    tenantId,
    storeId,
    rebuiltAt: new Date().toISOString(),
    totalOrders: orderSummary._count.id,
    totalSubtotal: orderSummary._sum.subtotalAmount ?? 0,
    totalTax: orderSummary._sum.taxAmount ?? 0,
    totalDiscount: orderSummary._sum.discountAmount ?? 0,
    channelBreakdown,
  };

  // Persist the result as a store-level analytics snapshot in the JobRun result
  // (In a future phase, this would be stored in a dedicated analytics table.)
  await prisma.jobRun.update({
    where: { id: jobRunId },
    data: {
      resultJson: rebuildResult as unknown as Prisma.InputJsonValue,
    },
  });

  return {
    summary: `Analytics rebuild complete. Total orders: ${rebuildResult.totalOrders}`,
    ...rebuildResult,
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function buildInputJson(input: ManualJobRunInput): Record<string, unknown> {
  return {
    jobType: input.jobType,
    tenantId: input.tenantId,
    storeId: input.storeId,
    provider: input.provider,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    notes: input.notes,
  };
}
