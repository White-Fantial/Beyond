import { prisma } from "@/lib/prisma";
import {
  auditAdminConnectionStatusChanged,
  auditAdminCredentialRotated,
} from "@/lib/audit";
import type {
  AdminConnectionListItem,
  AdminConnectionListParams,
  AdminConnectionDetail,
  PaginatedResult,
} from "@/types/admin";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import { mapConnectionListItem } from "@/lib/admin/mappers";

export async function listAdminConnections(
  params: AdminConnectionListParams
): Promise<PaginatedResult<AdminConnectionListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams({
    ...params,
    status: params.status,
  });

  const provider = params.provider || undefined;

  const where = {
    ...(q
      ? {
          OR: [
            { externalStoreName: { contains: q, mode: "insensitive" as const } },
            { store: { name: { contains: q, mode: "insensitive" as const } } },
            { tenant: { displayName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
    ...(provider ? { provider: provider as never } : {}),
  };

  const [connections, total] = await Promise.all([
    prisma.connection.findMany({
      where,
      select: {
        id: true,
        tenantId: true,
        storeId: true,
        provider: true,
        type: true,
        status: true,
        externalStoreName: true,
        lastConnectedAt: true,
        lastSyncAt: true,
        lastSyncStatus: true,
        createdAt: true,
        store: { select: { name: true } },
        tenant: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.connection.count({ where }),
  ]);

  return {
    items: connections.map((c) =>
      mapConnectionListItem({
        ...c,
        provider: c.provider as string,
        type: c.type as string,
        status: c.status as string,
      })
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminConnectionDetail(connectionId: string): Promise<AdminConnectionDetail> {
  const c = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    include: {
      store: { select: { name: true } },
      tenant: { select: { displayName: true } },
      credentials: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      actionLogs: {
        orderBy: { createdAt: "desc" },
        take: 30,
      },
    },
  });

  return {
    id: c.id,
    tenantId: c.tenantId,
    tenantDisplayName: c.tenant.displayName,
    storeId: c.storeId,
    storeName: c.store.name,
    provider: c.provider as string,
    type: c.type as string,
    status: c.status as string,
    displayName: c.displayName,
    externalMerchantId: c.externalMerchantId,
    externalStoreId: c.externalStoreId,
    externalStoreName: c.externalStoreName,
    externalLocationId: c.externalLocationId,
    authScheme: c.authScheme as string | null,
    lastConnectedAt: c.lastConnectedAt,
    lastAuthValidatedAt: c.lastAuthValidatedAt,
    lastSyncAt: c.lastSyncAt,
    lastSyncStatus: c.lastSyncStatus,
    lastErrorCode: c.lastErrorCode,
    lastErrorMessage: c.lastErrorMessage,
    reauthRequiredAt: c.reauthRequiredAt,
    disconnectedAt: c.disconnectedAt,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    credentials: c.credentials.map((cr) => ({
      id: cr.id,
      credentialType: cr.credentialType as string,
      authScheme: cr.authScheme as string,
      label: cr.label,
      version: cr.version,
      isActive: cr.isActive,
      canRefresh: cr.canRefresh,
      requiresReauth: cr.requiresReauth,
      issuedAt: cr.issuedAt,
      expiresAt: cr.expiresAt,
      refreshAfter: cr.refreshAfter,
      lastUsedAt: cr.lastUsedAt,
      lastRefreshAt: cr.lastRefreshAt,
      lastRefreshStatus: cr.lastRefreshStatus,
      lastRefreshError: cr.lastRefreshError,
      rotatedAt: cr.rotatedAt,
      createdAt: cr.createdAt,
    })),
    recentActionLogs: c.actionLogs.map((l) => ({
      id: l.id,
      tenantId: l.tenantId,
      storeId: l.storeId,
      provider: l.provider as string,
      actionType: l.actionType as string,
      status: l.status,
      actorUserId: l.actorUserId,
      message: l.message,
      errorCode: l.errorCode,
      createdAt: l.createdAt,
    })),
  };
}

export async function updateAdminConnectionStatus(
  connectionId: string,
  status: string,
  actorUserId: string
): Promise<void> {
  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    select: { id: true, tenantId: true, storeId: true, provider: true },
  });

  const now = new Date();
  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: status as never,
      ...(status === "DISCONNECTED" ? { disconnectedAt: now } : {}),
      ...(status === "REAUTH_REQUIRED" ? { reauthRequiredAt: now } : {}),
      ...(status === "CONNECTED" ? { lastConnectedAt: now, reauthRequiredAt: null, disconnectedAt: null } : {}),
    },
  });

  const actionTypeMap: Record<string, string> = {
    DISCONNECTED: "DISCONNECT",
    REAUTH_REQUIRED: "REAUTHORIZE",
    CONNECTED: "CONNECT_SUCCESS",
  };
  const actionType = actionTypeMap[status] ?? "CONNECT_SUCCESS";

  // Write a ConnectionActionLog entry
  await prisma.connectionActionLog.create({
    data: {
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      connectionId: conn.id,
      provider: conn.provider,
      actionType: actionType as never,
      status: "SUCCESS",
      actorUserId,
      message: `Admin forced status change to ${status}`,
    },
  });

  await auditAdminConnectionStatusChanged(conn.id, conn.tenantId, conn.storeId, actorUserId, { newStatus: status });
}

export async function adminRotateCredential(
  connectionId: string,
  actorUserId: string
): Promise<void> {
  const conn = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    select: { id: true, tenantId: true, storeId: true, provider: true },
  });

  const now = new Date();

  // Deactivate all active credentials for this connection
  await prisma.connectionCredential.updateMany({
    where: { connectionId, isActive: true },
    data: {
      isActive: false,
      requiresReauth: true,
      rotatedAt: now,
    },
  });

  // Mark connection as requiring re-authentication
  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "REAUTH_REQUIRED",
      reauthRequiredAt: now,
    },
  });

  // Write a ConnectionActionLog entry
  await prisma.connectionActionLog.create({
    data: {
      tenantId: conn.tenantId,
      storeId: conn.storeId,
      connectionId: conn.id,
      provider: conn.provider,
      actionType: "REAUTHORIZE",
      status: "SUCCESS",
      actorUserId,
      message: "Admin rotated credentials — re-authentication required",
    },
  });

  await auditAdminCredentialRotated(conn.id, conn.tenantId, conn.storeId, actorUserId);
}

