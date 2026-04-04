/**
 * Owner Integrations Service — provider connection cards for the owner portal.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type { OwnerConnectionCard } from "@/types/owner";

export async function getOwnerStoreConnectionCards(
  storeId: string,
  tenantId: string
): Promise<OwnerConnectionCard[]> {
  const connections = await prisma.connection.findMany({
    where: { storeId },
    select: {
      provider: true,
      type: true,
      status: true,
      authScheme: true,
      externalStoreName: true,
      externalMerchantId: true,
      lastConnectedAt: true,
      lastAuthValidatedAt: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      reauthRequiredAt: true,
      lastErrorMessage: true,
    },
  });

  const KNOWN_PROVIDERS: Array<{ provider: string; connectionType: string; label: string }> = [
    { provider: "LOYVERSE", connectionType: "POS", label: "Loyverse POS" },
    { provider: "UBER_EATS", connectionType: "DELIVERY", label: "Uber Eats" },
    { provider: "DOORDASH", connectionType: "DELIVERY", label: "DoorDash" },
  ];

  return KNOWN_PROVIDERS.map((def) => {
    const conn = connections.find(
      (c) => c.provider === def.provider && c.type === def.connectionType
    );
    return {
      provider: def.provider,
      connectionType: def.connectionType,
      label: def.label,
      status: conn?.status ?? "NOT_CONNECTED",
      authScheme: conn?.authScheme ?? null,
      externalStoreName: conn?.externalStoreName ?? null,
      externalMerchantId: conn?.externalMerchantId ?? null,
      lastConnectedAt: conn?.lastConnectedAt?.toISOString() ?? null,
      lastAuthValidatedAt: conn?.lastAuthValidatedAt?.toISOString() ?? null,
      lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
      lastSyncStatus: conn?.lastSyncStatus ?? null,
      reauthRequired: !!conn?.reauthRequiredAt,
      lastErrorMessage: conn?.lastErrorMessage ?? null,
    };
  });
}

export async function requestOwnerCatalogSync(
  storeId: string,
  tenantId: string,
  actorUserId: string
): Promise<{ message: string }> {
  // Log the request — actual sync is triggered by catalog-sync.service
  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_CATALOG_SYNC_REQUESTED",
    targetType: "Store",
    targetId: storeId,
    metadata: {},
  });

  // TODO: trigger actual catalog sync job
  return { message: "Catalog sync requested. Will process shortly." };
}

// ─── Phase 11: Tenant-level connection management ─────────────────────────────

export interface OwnerTenantConnectionCard {
  connectionId: string | null;
  provider: string;
  connectionType: string;
  label: string;
  storeId: string | null;
  storeName: string | null;
  status: string;
  authScheme: string | null;
  externalStoreName: string | null;
  externalMerchantId: string | null;
  lastConnectedAt: string | null;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  reauthRequired: boolean;
  lastErrorMessage: string | null;
}

export interface OwnerConnectionActionLogRow {
  id: string;
  actionType: string;
  status: string;
  provider: string;
  storeId: string;
  storeName: string;
  errorCode: string | null;
  message: string | null;
  createdAt: string;
}

export async function getOwnerTenantConnectionCards(
  tenantId: string
): Promise<OwnerTenantConnectionCard[]> {
  const stores = await prisma.store.findMany({
    where: { tenantId, status: { not: "ARCHIVED" } },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const connections = await prisma.connection.findMany({
    where: { tenantId },
    select: {
      id: true,
      storeId: true,
      provider: true,
      type: true,
      status: true,
      authScheme: true,
      externalStoreName: true,
      externalMerchantId: true,
      lastConnectedAt: true,
      lastSyncAt: true,
      lastSyncStatus: true,
      reauthRequiredAt: true,
      lastErrorMessage: true,
    },
  });

  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  const KNOWN_PROVIDERS: Array<{ provider: string; connectionType: string; label: string }> = [
    { provider: "LOYVERSE", connectionType: "POS", label: "Loyverse POS" },
    { provider: "LIGHTSPEED", connectionType: "POS", label: "Lightspeed POS" },
    { provider: "UBER_EATS", connectionType: "DELIVERY", label: "Uber Eats" },
    { provider: "DOORDASH", connectionType: "DELIVERY", label: "DoorDash" },
  ];

  const cards: OwnerTenantConnectionCard[] = [];

  for (const store of stores) {
    for (const def of KNOWN_PROVIDERS) {
      const conn = connections.find(
        (c) => c.storeId === store.id && c.provider === def.provider && c.type === def.connectionType
      );
      cards.push({
        connectionId: conn?.id ?? null,
        provider: def.provider,
        connectionType: def.connectionType,
        label: def.label,
        storeId: store.id,
        storeName: storeMap[store.id] ?? null,
        status: conn?.status ?? "NOT_CONNECTED",
        authScheme: conn?.authScheme ?? null,
        externalStoreName: conn?.externalStoreName ?? null,
        externalMerchantId: conn?.externalMerchantId ?? null,
        lastConnectedAt: conn?.lastConnectedAt?.toISOString() ?? null,
        lastSyncAt: conn?.lastSyncAt?.toISOString() ?? null,
        lastSyncStatus: conn?.lastSyncStatus ?? null,
        reauthRequired: !!conn?.reauthRequiredAt,
        lastErrorMessage: conn?.lastErrorMessage ?? null,
      });
    }
  }

  return cards;
}

export async function disconnectOwnerConnection(
  connectionId: string,
  tenantId: string,
  actorUserId: string
): Promise<void> {
  const conn = await prisma.connection.findFirst({
    where: { id: connectionId, tenantId },
    select: { id: true, storeId: true, provider: true },
  });
  if (!conn) throw new Error("CONNECTION_NOT_FOUND");

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "DISCONNECTED",
      disconnectedAt: new Date(),
    },
  });

  await logAuditEvent({
    tenantId,
    storeId: conn.storeId,
    actorUserId,
    action: "INTEGRATION_DISCONNECTED",
    targetType: "Connection",
    targetId: connectionId,
    metadata: { provider: conn.provider },
  });
}

export async function getOwnerConnectionActionLogs(
  connectionId: string,
  tenantId: string,
  limit = 20
): Promise<OwnerConnectionActionLogRow[]> {
  // Get store names for the tenant to resolve storeId -> name
  const stores = await prisma.store.findMany({
    where: { tenantId },
    select: { id: true, name: true },
  });
  const storeMap = Object.fromEntries(stores.map((s) => [s.id, s.name]));

  const logs = await prisma.connectionActionLog.findMany({
    where: { tenantId, connectionId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      actionType: true,
      status: true,
      provider: true,
      storeId: true,
      errorCode: true,
      message: true,
      createdAt: true,
    },
  });

  return logs.map((log) => ({
    id: log.id,
    actionType: log.actionType,
    status: log.status,
    provider: log.provider,
    storeId: log.storeId,
    storeName: storeMap[log.storeId] ?? "—",
    errorCode: log.errorCode,
    message: log.message,
    createdAt: log.createdAt.toISOString(),
  }));
}
