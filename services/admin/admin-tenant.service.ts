import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminTenantListItem,
  AdminTenantListParams,
  AdminTenantDetail,
  PaginatedResult,
  TenantConnectionSummaryRow,
} from "@/types/admin";
import {
  normalizeListParams,
  buildPaginationMeta,
} from "@/lib/admin/filters";
import {
  mapTenantListItem,
  mapTenantStoreRow,
  mapTenantMembershipRow,
} from "@/lib/admin/mappers";

export async function listAdminTenants(
  params: AdminTenantListParams
): Promise<PaginatedResult<AdminTenantListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(q
      ? {
          OR: [
            { displayName: { contains: q, mode: "insensitive" as const } },
            { slug: { contains: q, mode: "insensitive" as const } },
            { legalName: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        slug: true,
        status: true,
        timezone: true,
        currency: true,
        createdAt: true,
        _count: { select: { stores: true, memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.tenant.count({ where }),
  ]);

  return {
    items: tenants.map((t) =>
      mapTenantListItem(
        { ...t, status: t.status as string },
        t._count.stores,
        t._count.memberships
      )
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminTenantDetail(tenantId: string): Promise<AdminTenantDetail> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      id: true,
      slug: true,
      legalName: true,
      displayName: true,
      status: true,
      timezone: true,
      currency: true,
      countryCode: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!tenant) notFound();

  const [
    stores,
    memberships,
    connections,
    userCount,
    connectionCount,
  ] = await Promise.all([
    prisma.store.findMany({
      where: { tenantId },
      select: { id: true, name: true, code: true, status: true, timezone: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.membership.findMany({
      where: { tenantId },
      select: {
        id: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        user: { select: { name: true, email: true } },
      },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    }),
    prisma.connection.findMany({
      where: { tenantId },
      select: { provider: true, status: true },
    }),
    prisma.membership.count({ where: { tenantId } }).then(async () => {
      // distinct user count
      const result = await prisma.membership.findMany({
        where: { tenantId },
        select: { userId: true },
        distinct: ["userId"],
      });
      return result.length;
    }),
    prisma.connection.count({ where: { tenantId } }),
  ]);

  // Build connection summary
  const connMap = new Map<string, { total: number; connected: number }>();
  for (const c of connections) {
    const key = c.provider as string;
    const entry = connMap.get(key) ?? { total: 0, connected: 0 };
    entry.total += 1;
    if (c.status === "CONNECTED") entry.connected += 1;
    connMap.set(key, entry);
  }
  const connectionSummary: TenantConnectionSummaryRow[] = Array.from(connMap.entries()).map(
    ([provider, { total, connected }]) => ({ provider, total, connected })
  );

  return {
    id: tenant.id,
    slug: tenant.slug,
    legalName: tenant.legalName,
    displayName: tenant.displayName,
    status: tenant.status as string,
    timezone: tenant.timezone,
    currency: tenant.currency,
    countryCode: tenant.countryCode,
    createdAt: tenant.createdAt,
    updatedAt: tenant.updatedAt,
    storeCount: stores.length,
    membershipCount: memberships.length,
    userCount,
    connectionCount,
    stores: stores.map((s) => mapTenantStoreRow({ ...s, status: s.status as string })),
    memberships: memberships.map((m) =>
      mapTenantMembershipRow({ ...m, role: m.role as string, status: m.status as string })
    ),
    connectionSummary,
  };
}
