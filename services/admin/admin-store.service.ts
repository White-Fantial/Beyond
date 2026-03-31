import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminStoreListItem,
  AdminStoreListParams,
  AdminStoreDetail,
  PaginatedResult,
} from "@/types/admin";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import {
  mapStoreListItem,
  mapStoreMembershipRow,
  mapStoreConnectionRow,
} from "@/lib/admin/mappers";

export async function listAdminStores(
  params: AdminStoreListParams
): Promise<PaginatedResult<AdminStoreListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { code: { contains: q, mode: "insensitive" as const } },
            { tenant: { displayName: { contains: q, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [stores, total] = await Promise.all([
    prisma.store.findMany({
      where,
      select: {
        id: true,
        name: true,
        code: true,
        tenantId: true,
        status: true,
        timezone: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
        _count: { select: { connections: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.store.count({ where }),
  ]);

  return {
    items: stores.map((s) =>
      mapStoreListItem({ ...s, status: s.status as string }, s._count.connections)
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminStoreDetail(storeId: string): Promise<AdminStoreDetail> {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: {
      id: true,
      tenantId: true,
      name: true,
      displayName: true,
      code: true,
      status: true,
      timezone: true,
      currency: true,
      countryCode: true,
      createdAt: true,
      updatedAt: true,
      tenant: { select: { displayName: true } },
    },
  });

  if (!store) notFound();

  const [memberships, connections, activeConnectionCount] = await Promise.all([
    prisma.storeMembership.findMany({
      where: { storeId },
      select: {
        id: true,
        role: true,
        status: true,
        createdAt: true,
        membership: {
          select: {
            userId: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.connection.findMany({
      where: { storeId },
      select: {
        id: true,
        provider: true,
        type: true,
        status: true,
        authScheme: true,
        externalStoreName: true,
        lastConnectedAt: true,
        lastSyncAt: true,
        lastSyncStatus: true,
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.connection.count({ where: { storeId, status: "CONNECTED" } }),
  ]);

  return {
    id: store.id,
    tenantId: store.tenantId,
    tenantDisplayName: store.tenant.displayName,
    name: store.name,
    displayName: store.displayName,
    code: store.code,
    status: store.status as string,
    timezone: store.timezone,
    currency: store.currency,
    countryCode: store.countryCode,
    createdAt: store.createdAt,
    updatedAt: store.updatedAt,
    membershipCount: memberships.length,
    connectionCount: connections.length,
    activeConnectionCount,
    memberships: memberships.map((sm) =>
      mapStoreMembershipRow({ ...sm, role: sm.role as string, status: sm.status as string })
    ),
    connections: connections.map((c) =>
      mapStoreConnectionRow({
        ...c,
        provider: c.provider as string,
        type: c.type as string,
        status: c.status as string,
        authScheme: c.authScheme as string | null,
      })
    ),
  };
}

const ALLOWED_STORE_STATUSES = ["ACTIVE", "INACTIVE", "ARCHIVED"] as const;
type AllowedStoreStatus = (typeof ALLOWED_STORE_STATUSES)[number];

export async function setAdminStoreStatus(
  storeId: string,
  status: string
): Promise<void> {
  if (!ALLOWED_STORE_STATUSES.includes(status as AllowedStoreStatus)) {
    throw new Error(`Invalid store status: ${status}`);
  }
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { id: true } });
  if (!store) notFound();
  await prisma.store.update({
    where: { id: storeId },
    data: { status: status as never, updatedAt: new Date() },
  });
}
