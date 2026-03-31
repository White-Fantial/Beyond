import { prisma } from "@/lib/prisma";
import type { AdminDashboardSummary } from "@/types/admin";
import { mapRecentTenant, mapRecentUser, mapRecentStore } from "@/lib/admin/mappers";

export async function getAdminDashboardSummary(): Promise<AdminDashboardSummary> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalTenants,
    totalStores,
    totalUsers,
    totalConnections,
    newTenantsLast7Days,
    newUsersLast7Days,
    newStoresLast7Days,
    recentTenantRows,
    recentUserRows,
    recentStoreRows,
  ] = await Promise.all([
    prisma.tenant.count(),
    prisma.store.count(),
    prisma.user.count(),
    prisma.connection.count(),
    prisma.tenant.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.store.count({ where: { createdAt: { gte: sevenDaysAgo } } }),
    prisma.tenant.findMany({
      select: { id: true, displayName: true, slug: true, status: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true, platformRole: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.store.findMany({
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return {
    totalTenants,
    totalStores,
    totalUsers,
    totalConnections,
    newTenantsLast7Days,
    newUsersLast7Days,
    newStoresLast7Days,
    recentTenants: recentTenantRows.map((t) =>
      mapRecentTenant({ ...t, status: t.status as string })
    ),
    recentUsers: recentUserRows.map((u) =>
      mapRecentUser({ ...u, platformRole: u.platformRole as string })
    ),
    recentStores: recentStoreRows.map(mapRecentStore),
  };
}
