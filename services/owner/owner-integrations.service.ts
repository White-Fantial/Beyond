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
