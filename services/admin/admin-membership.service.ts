import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import {
  auditAdminTenantMembershipCreated,
  auditAdminTenantMembershipUpdated,
  auditAdminStoreMembershipCreated,
  auditAdminStoreMembershipUpdated,
} from "@/lib/audit";

const ALLOWED_MEMBERSHIP_ROLES = ["OWNER", "ADMIN", "MANAGER", "STAFF", "ANALYST"] as const;
const ALLOWED_MEMBERSHIP_STATUSES = ["INVITED", "ACTIVE", "SUSPENDED", "REMOVED"] as const;
const ALLOWED_STORE_ROLES = ["OWNER", "ADMIN", "MANAGER", "SUPERVISOR", "STAFF"] as const;
const ALLOWED_STORE_MEMBERSHIP_STATUSES = ["ACTIVE", "INACTIVE", "REMOVED"] as const;

type AllowedMembershipRole = (typeof ALLOWED_MEMBERSHIP_ROLES)[number];
type AllowedMembershipStatus = (typeof ALLOWED_MEMBERSHIP_STATUSES)[number];
type AllowedStoreRole = (typeof ALLOWED_STORE_ROLES)[number];
type AllowedStoreMembershipStatus = (typeof ALLOWED_STORE_MEMBERSHIP_STATUSES)[number];

// ─── Tenant Memberships ───────────────────────────────────────────────────────

export interface CreateTenantMembershipInput {
  tenantId: string;
  userId: string;
  role: string;
  status?: string;
}

export async function createTenantMembership(
  input: CreateTenantMembershipInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { tenantId, userId, role, status = "ACTIVE" } = input;

  if (!tenantId?.trim()) throw new Error("테넌트 ID는 필수입니다.");
  if (!userId?.trim()) throw new Error("사용자 ID는 필수입니다.");
  if (!ALLOWED_MEMBERSHIP_ROLES.includes(role as AllowedMembershipRole)) {
    throw new Error(`올바르지 않은 멤버십 역할입니다: ${role}`);
  }
  if (!ALLOWED_MEMBERSHIP_STATUSES.includes(status as AllowedMembershipStatus)) {
    throw new Error(`올바르지 않은 상태값입니다: ${status}`);
  }

  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!tenant) throw new Error("테넌트를 찾을 수 없습니다.");
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  const existing = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  if (existing) throw new Error("해당 사용자는 이미 이 테넌트에 멤버십이 있습니다.");

  const membership = await prisma.membership.create({
    data: {
      tenantId,
      userId,
      role: role as never,
      status: status as never,
      joinedAt: status === "ACTIVE" ? new Date() : null,
    },
    select: { id: true },
  });

  await auditAdminTenantMembershipCreated(membership.id, tenantId, actorUserId, { userId, role, status });
  return { id: membership.id };
}

export interface UpdateTenantMembershipInput {
  role?: string;
  status?: string;
}

export async function updateTenantMembership(
  membershipId: string,
  input: UpdateTenantMembershipInput,
  actorUserId: string
): Promise<void> {
  const membership = await prisma.membership.findUnique({
    where: { id: membershipId },
    select: { id: true, tenantId: true, role: true, status: true },
  });
  if (!membership) notFound();

  const data: Record<string, unknown> = {};

  if (input.role !== undefined) {
    if (!ALLOWED_MEMBERSHIP_ROLES.includes(input.role as AllowedMembershipRole)) {
      throw new Error(`올바르지 않은 멤버십 역할입니다: ${input.role}`);
    }
    data.role = input.role;
  }
  if (input.status !== undefined) {
    if (!ALLOWED_MEMBERSHIP_STATUSES.includes(input.status as AllowedMembershipStatus)) {
      throw new Error(`올바르지 않은 상태값입니다: ${input.status}`);
    }
    data.status = input.status;
    if (input.status === "ACTIVE" && membership.status !== "ACTIVE") {
      data.joinedAt = new Date();
    }
  }

  if (Object.keys(data).length === 0) return;

  await prisma.membership.update({ where: { id: membershipId }, data: { ...data, updatedAt: new Date() } });
  await auditAdminTenantMembershipUpdated(membershipId, membership.tenantId, actorUserId, {
    before: { role: membership.role, status: membership.status },
    after: data,
  });
}

// ─── Store Memberships ────────────────────────────────────────────────────────

export interface CreateStoreMembershipInput {
  membershipId: string;
  storeId: string;
  role: string;
  status?: string;
}

export async function createStoreMembership(
  input: CreateStoreMembershipInput,
  actorUserId: string
): Promise<{ id: string }> {
  const { membershipId, storeId, role, status = "ACTIVE" } = input;

  if (!membershipId?.trim()) throw new Error("멤버십 ID는 필수입니다.");
  if (!storeId?.trim()) throw new Error("매장 ID는 필수입니다.");
  if (!ALLOWED_STORE_ROLES.includes(role as AllowedStoreRole)) {
    throw new Error(`올바르지 않은 매장 역할입니다: ${role}`);
  }
  if (!ALLOWED_STORE_MEMBERSHIP_STATUSES.includes(status as AllowedStoreMembershipStatus)) {
    throw new Error(`올바르지 않은 상태값입니다: ${status}`);
  }

  const [membership, store] = await Promise.all([
    prisma.membership.findUnique({ where: { id: membershipId }, select: { id: true, tenantId: true } }),
    prisma.store.findUnique({ where: { id: storeId }, select: { id: true, tenantId: true } }),
  ]);
  if (!membership) throw new Error("테넌트 멤버십을 찾을 수 없습니다.");
  if (!store) throw new Error("매장을 찾을 수 없습니다.");

  // Validate cross-tenant integrity
  if (membership.tenantId !== store.tenantId) {
    throw new Error("매장 멤버십 생성 실패: 멤버십과 매장이 같은 테넌트에 속해야 합니다.");
  }

  const existing = await prisma.storeMembership.findUnique({
    where: { membershipId_storeId: { membershipId, storeId } },
    select: { id: true },
  });
  if (existing) throw new Error("해당 멤버십은 이미 이 매장에 연결되어 있습니다.");

  const storeMembership = await prisma.storeMembership.create({
    data: {
      tenantId: membership.tenantId,
      membershipId,
      storeId,
      role: role as never,
      status: status as never,
    },
    select: { id: true },
  });

  await auditAdminStoreMembershipCreated(storeMembership.id, membership.tenantId, storeId, actorUserId, { membershipId, role, status });
  return { id: storeMembership.id };
}

export interface UpdateStoreMembershipInput {
  role?: string;
  status?: string;
}

export async function updateStoreMembership(
  storeMembershipId: string,
  input: UpdateStoreMembershipInput,
  actorUserId: string
): Promise<void> {
  const sm = await prisma.storeMembership.findUnique({
    where: { id: storeMembershipId },
    select: { id: true, tenantId: true, storeId: true, role: true, status: true },
  });
  if (!sm) notFound();

  const data: Record<string, unknown> = {};

  if (input.role !== undefined) {
    if (!ALLOWED_STORE_ROLES.includes(input.role as AllowedStoreRole)) {
      throw new Error(`올바르지 않은 매장 역할입니다: ${input.role}`);
    }
    data.role = input.role;
  }
  if (input.status !== undefined) {
    if (!ALLOWED_STORE_MEMBERSHIP_STATUSES.includes(input.status as AllowedStoreMembershipStatus)) {
      throw new Error(`올바르지 않은 상태값입니다: ${input.status}`);
    }
    data.status = input.status;
  }

  if (Object.keys(data).length === 0) return;

  await prisma.storeMembership.update({ where: { id: storeMembershipId }, data: { ...data, updatedAt: new Date() } });
  await auditAdminStoreMembershipUpdated(storeMembershipId, sm.tenantId, sm.storeId, actorUserId, {
    before: { role: sm.role, status: sm.status },
    after: data,
  });
}
