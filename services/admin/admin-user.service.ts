import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import bcrypt from "bcryptjs";
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
import {
  auditAdminUserCreated,
  auditAdminUserUpdated,
  auditAdminUserStatusChanged,
  auditAdminUserPlatformRoleChanged,
} from "@/lib/audit";

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

const ALLOWED_PLATFORM_ROLES = ["USER", "PLATFORM_ADMIN", "PLATFORM_SUPPORT"] as const;
type AllowedPlatformRole = (typeof ALLOWED_PLATFORM_ROLES)[number];

// ─── Write operations ─────────────────────────────────────────────────────────

export interface CreateAdminUserInput {
  name: string;
  email: string;
  password: string;
  platformRole?: string;
  status?: string;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { name, email, password, platformRole = "USER", status = "ACTIVE" } = input;

  if (!name?.trim()) throw new Error("Name은 필수입니다.");
  if (!email?.trim()) throw new Error("Email은 필수입니다.");
  if (!password || password.length < 8) throw new Error("Password는 최소 8자 이상이어야 합니다.");
  if (!ALLOWED_PLATFORM_ROLES.includes(platformRole as AllowedPlatformRole)) {
    throw new Error(`올바르지 않은 플랫폼 Role입니다: ${platformRole}`);
  }
  if (!ALLOWED_USER_STATUSES.includes(status as AllowedUserStatus)) {
    throw new Error(`올바르지 않은 Status값입니다: ${status}`);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
  if (existing) throw new Error("이미 사용 중인 Email입니다.");

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      platformRole: platformRole as never,
      status: status as never,
    },
    select: { id: true },
  });

  await auditAdminUserCreated(user.id, actorUserId, { name: name.trim(), email: normalizedEmail, platformRole, status });
  return { id: user.id };
}

export interface UpdateAdminUserInput {
  name?: string;
  email?: string;
  phone?: string | null;
}

export async function updateAdminUser(
  userId: string,
  input: UpdateAdminUserInput,
  actorUserId: string
): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, phone: true },
  });
  if (!user) notFound();

  const data: Record<string, unknown> = {};

  if (input.name !== undefined) {
    if (!input.name.trim()) throw new Error("Name은 필수입니다.");
    data.name = input.name.trim();
  }
  if (input.email !== undefined) {
    const normalizedEmail = input.email.trim().toLowerCase();
    if (normalizedEmail !== user.email) {
      const existing = await prisma.user.findUnique({ where: { email: normalizedEmail }, select: { id: true } });
      if (existing) throw new Error("이미 사용 중인 Email입니다.");
    }
    data.email = normalizedEmail;
  }
  if (input.phone !== undefined) {
    data.phone = input.phone;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.user.update({ where: { id: userId }, data: { ...data, updatedAt: new Date() } });
  await auditAdminUserUpdated(userId, actorUserId, {
    before: { name: user.name, email: user.email, phone: user.phone },
    after: data,
  });
}

export async function updateAdminUserPlatformRole(
  userId: string,
  platformRole: string,
  actorUserId: string
): Promise<void> {
  if (!ALLOWED_PLATFORM_ROLES.includes(platformRole as AllowedPlatformRole)) {
    throw new Error(`올바르지 않은 플랫폼 Role입니다: ${platformRole}`);
  }
  // Cannot demote self
  if (userId === actorUserId && platformRole !== "PLATFORM_ADMIN") {
    throw new Error("자신의 PLATFORM_ADMIN 권한은 제거할 수 없습니다.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, platformRole: true, email: true },
  });
  if (!user) notFound();

  // Cannot modify another PLATFORM_ADMIN's role (unless it's yourself — blocked above)
  if (user.platformRole === "PLATFORM_ADMIN" && userId !== actorUserId) {
    throw new Error("다른 PLATFORM_ADMIN의 Role은 ");
  }

  await prisma.user.update({
    where: { id: userId },
    data: { platformRole: platformRole as never, updatedAt: new Date() },
  });
  await auditAdminUserPlatformRoleChanged(userId, actorUserId, {
    before: user.platformRole,
    after: platformRole,
  });
}

export async function setAdminUserStatus(
  userId: string,
  status: string,
  actorUserId?: string,
  selfGuardUserId?: string
): Promise<void> {
  if (!ALLOWED_USER_STATUSES.includes(status as AllowedUserStatus)) {
    throw new Error(`Invalid user status: ${status}`);
  }
  // Cannot suspend/archive self
  if (selfGuardUserId && selfGuardUserId === userId && (status === "SUSPENDED" || status === "ARCHIVED")) {
    throw new Error("자신의 계정을 Suspended하거나 보관할 수 없습니다.");
  }
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, status: true } });
  if (!user) notFound();
  await prisma.user.update({
    where: { id: userId },
    data: { status: status as never, updatedAt: new Date() },
  });
  if (actorUserId) {
    await auditAdminUserStatusChanged(userId, actorUserId, { before: user.status, after: status });
  }
}
