import { prisma } from "@/lib/prisma";
import type {
  AdminConnectionListItem,
  AdminConnectionListParams,
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
