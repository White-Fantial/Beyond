import { prisma } from "@/lib/prisma";
import type { OwnerConnectionRow } from "@/types/owner";

export async function getOwnerConnections(tenantId: string): Promise<OwnerConnectionRow[]> {
  const connections = await prisma.connection.findMany({
    where: { tenantId },
    include: {
      store: { select: { name: true } },
      credentials: {
        where: { isActive: true },
        select: { expiresAt: true },
        orderBy: { expiresAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return connections.map((conn) => ({
    id: conn.id,
    name: conn.displayName ?? `${conn.provider} (${conn.type})`,
    provider: conn.provider,
    type: conn.type,
    status: conn.status,
    expiresAt: conn.credentials[0]?.expiresAt?.toISOString() ?? null,
    lastSync: conn.lastSyncAt?.toISOString() ?? null,
    storeName: conn.store.name,
  }));
}
