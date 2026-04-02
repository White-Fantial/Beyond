/**
 * Admin Integration Recovery Service
 *
 * Orchestration layer for admin-initiated recovery actions on connections.
 * Delegates to existing service / job runner — never duplicates business logic.
 */

import { prisma } from "@/lib/prisma";
import {
  auditAdminConnectionForceReconnectRequested,
  auditAdminConnectionValidationRequested,
  auditAdminConnectionValidationSucceeded,
  auditAdminConnectionValidationFailed,
  auditAdminConnectionCatalogSyncRequested,
  auditAdminConnectionRefreshCheckRequested,
} from "@/lib/audit";
import { sanitizeObject } from "@/lib/admin/logs/sanitize";
import type {
  AdminConnectionRecoveryContext,
  AdminRecoveryJobResult,
  AdminValidationResult,
} from "@/types/admin-analytics";

// ─── Context ──────────────────────────────────────────────────────────────────

export async function getAdminConnectionRecoveryContext(
  connectionId: string
): Promise<AdminConnectionRecoveryContext> {
  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    include: {
      credentials: { where: { isActive: true }, orderBy: { createdAt: "desc" }, take: 5 },
    },
  });

  const canRefreshCredentials = conn.credentials.some((c) => c.canRefresh);
  const capabilitiesJson = conn.capabilitiesJson as Record<string, unknown> | null;
  const supportsCatalogSync =
    conn.type === "POS" ||
    (capabilitiesJson && capabilitiesJson["catalogSync"] === true) ||
    conn.provider === "LOYVERSE";

  return {
    connectionId: conn.id,
    tenantId: conn.tenantId,
    storeId: conn.storeId,
    provider: conn.provider as string,
    type: conn.type as string,
    status: conn.status as string,
    authScheme: conn.authScheme as string | null,
    canRefreshCredentials: Boolean(canRefreshCredentials),
    supportsCatalogSync: Boolean(supportsCatalogSync),
    lastConnectedAt: conn.lastConnectedAt,
    lastAuthValidatedAt: conn.lastAuthValidatedAt,
    lastSyncAt: conn.lastSyncAt,
    lastSyncStatus: conn.lastSyncStatus,
    lastErrorCode: conn.lastErrorCode,
    lastErrorMessage: conn.lastErrorMessage
      ? sanitizeErrorMessage(conn.lastErrorMessage)
      : null,
    isReauthRequired: conn.status === "REAUTH_REQUIRED",
  };
}

// ─── Force Reconnect ──────────────────────────────────────────────────────────

export async function requestForceReconnect(params: {
  connectionId: string;
  targetStatus: "REAUTH_REQUIRED" | "CONNECTING";
  reason: string;
  actorUserId: string;
}): Promise<{ ok: boolean; newStatus: string }> {
  const { connectionId, targetStatus, reason, actorUserId } = params;

  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    select: { tenantId: true, storeId: true, provider: true, status: true },
  });

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: targetStatus,
      ...(targetStatus === "REAUTH_REQUIRED" ? { reauthRequiredAt: new Date() } : {}),
    },
  });

  await prisma.connectionActionLog.create({
    data: {
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      connectionId,
      provider: conn.provider,
      actionType: targetStatus === "REAUTH_REQUIRED" ? "REAUTHORIZE" : "CONNECT_START",
      status: "REQUESTED",
      actorUserId,
      message: `Admin force reconnect: ${reason || "No reason provided"}`,
    },
  });

  await auditAdminConnectionForceReconnectRequested(
    connectionId,
    conn.tenantId,
    conn.storeId,
    actorUserId,
    { targetStatus, reason, previousStatus: conn.status as string }
  );

  return { ok: true, newStatus: targetStatus };
}

// ─── Run Validation ───────────────────────────────────────────────────────────

export async function runConnectionValidation(params: {
  connectionId: string;
  reason?: string;
  actorUserId: string;
}): Promise<AdminValidationResult> {
  const { connectionId, reason, actorUserId } = params;

  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { credentials: { where: { isActive: true } } },
  });

  await auditAdminConnectionValidationRequested(
    connectionId,
    conn.tenantId,
    conn.storeId,
    actorUserId,
    { reason }
  );

  await prisma.connectionActionLog.create({
    data: {
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      connectionId,
      provider: conn.provider,
      actionType: "SYNC_TEST",
      status: "STARTED",
      actorUserId,
      message: `Admin validation requested: ${reason || "No reason provided"}`,
    },
  });

  try {
    const hasCredentials = conn.credentials.length > 0;
    const isExpired = conn.credentials.some(
      (c) => c.expiresAt && c.expiresAt < new Date()
    );
    const requiresReauth = conn.status === "REAUTH_REQUIRED";

    let success = false;
    let message = "";
    let newStatus: string | undefined;

    if (!hasCredentials) {
      success = false;
      message = "연결에 Active 자격 증명이 없습니다.";
    } else if (requiresReauth) {
      success = false;
      message = "Re-authenticate이 필요한 Status입니다. 먼저 재연결을 수행해주세요.";
    } else if (isExpired) {
      success = false;
      message = "자격 증명이 만료되었습니다. 토큰 갱신 또는 재연결이 필요합니다.";
      await prisma.connection.update({
        where: { id: connectionId },
        data: { status: "REAUTH_REQUIRED", reauthRequiredAt: new Date() },
      });
      newStatus = "REAUTH_REQUIRED";
    } else if (conn.status === "CONNECTED") {
      success = true;
      message = "연결이 Healthy Status입니다.";
      await prisma.connection.update({
        where: { id: connectionId },
        data: { lastAuthValidatedAt: new Date() },
      });
    } else {
      success = false;
      message = `현재 연결 Status: ${conn.status}. 연결 Status를 확인하세요.`;
    }

    const lastAuthValidatedAt = (
      await prisma.connection.findUnique({
        where: { id: connectionId },
        select: { lastAuthValidatedAt: true },
      })
    )?.lastAuthValidatedAt;

    if (success) {
      await auditAdminConnectionValidationSucceeded(
        connectionId,
        conn.tenantId,
        conn.storeId,
        actorUserId,
        { message }
      );
    } else {
      await auditAdminConnectionValidationFailed(
        connectionId,
        conn.tenantId,
        conn.storeId,
        actorUserId,
        { message }
      );
    }

    await prisma.connectionActionLog.create({
      data: {
        tenantId: conn.tenantId,
        storeId: conn.storeId,
        connectionId,
        provider: conn.provider,
        actionType: "SYNC_TEST",
        status: success ? "SUCCESS" : "FAILED",
        actorUserId,
        message,
      },
    });

    return { success, message, connectionStatus: newStatus ?? conn.status as string, lastAuthValidatedAt };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "알 수 없는 Error";
    await auditAdminConnectionValidationFailed(
      connectionId,
      conn.tenantId,
      conn.storeId,
      actorUserId,
      { error: errorMsg }
    );
    return { success: false, message: `검증 중 Error 발생: ${sanitizeErrorMessage(errorMsg)}` };
  }
}

// ─── Trigger Catalog Sync ─────────────────────────────────────────────────────

export async function triggerCatalogSyncForConnection(params: {
  connectionId: string;
  reason?: string;
  actorUserId: string;
}): Promise<AdminRecoveryJobResult> {
  const { connectionId, reason, actorUserId } = params;

  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    select: {
      tenantId: true,
      storeId: true,
      provider: true,
      type: true,
      status: true,
      capabilitiesJson: true,
    },
  });

  const capabilitiesJson = conn.capabilitiesJson as Record<string, unknown> | null;
  const supportsCatalogSync =
    conn.type === "POS" ||
    (capabilitiesJson && capabilitiesJson["catalogSync"] === true) ||
    conn.provider === "LOYVERSE";

  if (!supportsCatalogSync) {
    throw new Error(
      `Provider ${conn.provider} does not support catalog sync for this connection type.`
    );
  }

  const jobRun = await prisma.jobRun.create({
    data: {
      jobType: "CATALOG_SYNC",
      status: "QUEUED",
      triggerSource: "ADMIN_MANUAL",
      triggeredByUserId: actorUserId,
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      provider: conn.provider as string,
      relatedEntityType: "Connection",
      relatedEntityId: connectionId,
      inputJson: {
        connectionId,
        tenantId: conn.tenantId,
        storeId: conn.storeId,
        provider: conn.provider as string,
        reason: reason ?? "Admin manual trigger",
      },
      queuedAt: new Date(),
    },
  });

  await auditAdminConnectionCatalogSyncRequested(
    connectionId,
    conn.tenantId,
    conn.storeId,
    actorUserId,
    { jobRunId: jobRun.id, reason }
  );

  return {
    jobRunId: jobRun.id,
    jobType: "CATALOG_SYNC",
    status: "QUEUED",
    message: `Catalog Sync 작업이 대기열에 Add되었습니다. (Job ID: ${jobRun.id})`,
  };
}

// ─── Trigger Refresh Check ────────────────────────────────────────────────────

export async function triggerRefreshCheckForConnection(params: {
  connectionId: string;
  reason?: string;
  actorUserId: string;
}): Promise<AdminRecoveryJobResult> {
  const { connectionId, reason, actorUserId } = params;

  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    include: { credentials: { where: { isActive: true, canRefresh: true } } },
  });

  if (conn.credentials.length === 0) {
    throw new Error(
      "This connection has no refreshable active credentials."
    );
  }

  const jobRun = await prisma.jobRun.create({
    data: {
      jobType: "CONNECTION_REFRESH_CHECK",
      status: "QUEUED",
      triggerSource: "ADMIN_MANUAL",
      triggeredByUserId: actorUserId,
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      provider: conn.provider as string,
      relatedEntityType: "Connection",
      relatedEntityId: connectionId,
      inputJson: {
        connectionId,
        tenantId: conn.tenantId,
        storeId: conn.storeId,
        provider: conn.provider as string,
        reason: reason ?? "Admin manual trigger",
      },
      queuedAt: new Date(),
    },
  });

  await auditAdminConnectionRefreshCheckRequested(
    connectionId,
    conn.tenantId,
    conn.storeId,
    actorUserId,
    { jobRunId: jobRun.id, reason }
  );

  return {
    jobRunId: jobRun.id,
    jobType: "CONNECTION_REFRESH_CHECK",
    status: "QUEUED",
    message: `토큰 갱신 확인 작업이 대기열에 Add되었습니다. (Job ID: ${jobRun.id})`,
  };
}

// ─── Recent Jobs ──────────────────────────────────────────────────────────────

export async function listRecentConnectionRelatedJobs(
  connectionId: string,
  limit = 10
) {
  const jobs = await prisma.jobRun.findMany({
    where: {
      OR: [
        { relatedEntityType: "Connection", relatedEntityId: connectionId },
        { inputJson: { path: ["connectionId"], equals: connectionId } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      jobType: true,
      status: true,
      triggerSource: true,
      triggeredByUserId: true,
      queuedAt: true,
      startedAt: true,
      finishedAt: true,
      errorCode: true,
      errorMessage: true,
      createdAt: true,
    },
  });

  return jobs.map((j) => ({
    ...j,
    jobType: j.jobType as string,
    status: j.status as string,
    triggerSource: j.triggerSource as string,
    errorMessage: j.errorMessage ? sanitizeErrorMessage(j.errorMessage) : null,
  }));
}

// ─── Recent Logs ──────────────────────────────────────────────────────────────

export async function listRecentConnectionRelatedLogs(
  connectionId: string,
  limit = 10
) {
  const [actionLogs, auditLogs] = await Promise.all([
    prisma.connectionActionLog.findMany({
      where: { connectionId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        actionType: true,
        status: true,
        actorUserId: true,
        message: true,
        errorCode: true,
        createdAt: true,
      },
    }),
    prisma.auditLog.findMany({
      where: {
        targetType: "Connection",
        targetId: connectionId,
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        action: true,
        actorUserId: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    actionLogs: actionLogs.map((l) => ({
      ...l,
      actionType: l.actionType as string,
      message: l.message ? sanitizeErrorMessage(l.message) : null,
    })),
    auditLogs,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sanitizeErrorMessage(message: string): string {
  // Remove potential credential leaks from error messages
  const sanitized = sanitizeObject({ message }) as { message: string };
  return sanitized.message ?? message;
}
