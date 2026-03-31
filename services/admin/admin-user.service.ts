import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import type {
  AdminUserListItem,
  AdminUserListParams,
  AdminUserDetail,
  PaginatedResult,
} from "@/types/admin";
import { normalizeListParams, buildPaginationMeta } from "@/lib/admin/filters";
import {
  mapUserListItem,
  mapUserTenantMembershipRow,
  mapUserStoreMembershipRow,
} from "@/lib/admin/mappers";

export async function listAdminUsers(
  params: AdminUserListParams
): Promise<PaginatedResult<AdminUserListItem>> {
  const { q, status, page, pageSize, skip } = normalizeListParams(params);

  const where = {
    ...(q
      ? {
          OR: [
            { name: { contains: q, mode: "insensitive" as const } },
            { email: { contains: q, mode: "insensitive" as const } },
          ],
        }
      : {}),
    ...(status ? { status: status as never } : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        platformRole: true,
        status: true,
        createdAt: true,
        _count: { select: { memberships: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  // Get store counts per user in a single query
  const userIds = users.map((u) => u.id);
  const storeCounts = await prisma.storeMembership.groupBy({
    by: ["membershipId"],
    where: {
      membership: { userId: { in: userIds } },
    },
    _count: { id: true },
  });

  // Map membershipId → storeCount
  const membershipIdToStoreCount = new Map<string, number>();
  for (const sc of storeCounts) {
    membershipIdToStoreCount.set(sc.membershipId, sc._count.id);
  }

  // Need membership.id for each user to look up store counts
  const memberships = await prisma.membership.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true },
  });
  const userIdToStoreCount = new Map<string, number>();
  for (const m of memberships) {
    const storeCount = membershipIdToStoreCount.get(m.id) ?? 0;
    userIdToStoreCount.set(m.userId, (userIdToStoreCount.get(m.userId) ?? 0) + storeCount);
  }

  return {
    items: users.map((u) =>
      mapUserListItem(
        { ...u, platformRole: u.platformRole as string, status: u.status as string },
        u._count.memberships,
        userIdToStoreCount.get(u.id) ?? 0
      )
    ),
    pagination: buildPaginationMeta(total, page, pageSize),
  };
}

export async function getAdminUserDetail(userId: string): Promise<AdminUserDetail> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      platformRole: true,
      status: true,
      lastLoginAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) notFound();

  const [tenantMemberships, storeMemberships] = await Promise.all([
    prisma.membership.findMany({
      where: { userId },
      select: {
        id: true,
        tenantId: true,
        role: true,
        status: true,
        joinedAt: true,
        createdAt: true,
        tenant: { select: { displayName: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.storeMembership.findMany({
      where: { membership: { userId } },
      select: {
        id: true,
        storeId: true,
        role: true,
        status: true,
        createdAt: true,
        store: { select: { name: true, tenantId: true } },
        membership: {
          select: { tenant: { select: { displayName: true } } },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    platformRole: user.platformRole as string,
    status: user.status as string,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    tenantMemberships: tenantMemberships.map((m) =>
      mapUserTenantMembershipRow({ ...m, role: m.role as string, status: m.status as string })
    ),
    storeMemberships: storeMemberships.map((sm) =>
      mapUserStoreMembershipRow({ ...sm, role: sm.role as string, status: sm.status as string })
    ),
    tenantCount: tenantMemberships.length,
    storeCount: storeMemberships.length,
  };
}

const ALLOWED_USER_STATUSES = ["ACTIVE", "INVITED", "SUSPENDED", "ARCHIVED"] as const;
type AllowedUserStatus = (typeof ALLOWED_USER_STATUSES)[number];

export async function setAdminUserStatus(
  userId: string,
  status: string
): Promise<void> {
  if (!ALLOWED_USER_STATUSES.includes(status as AllowedUserStatus)) {
    throw new Error(`Invalid user status: ${status}`);
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
  if (!user) notFound();
  await prisma.user.update({
    where: { id: userId },
    data: { status: status as never, updatedAt: new Date() },
  });
}
