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

  if (!tenantId?.trim()) throw new Error("Tenant ID is required.");
  if (!userId?.trim()) throw new Error("User ID is required.");
  if (!ALLOWED_MEMBERSHIP_ROLES.includes(role as AllowedMembershipRole)) {
    throw new Error(`Invalid membership role: ${role}`);
  }
  if (!ALLOWED_MEMBERSHIP_STATUSES.includes(status as AllowedMembershipStatus)) {
    throw new Error(`Invalid status value: ${status}`);
  }

  const [tenant, user] = await Promise.all([
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { id: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { id: true } }),
  ]);
  if (!tenant) throw new Error("Tenant not found.");
  if (!user) throw new Error("User not found.");

  const existing = await prisma.membership.findUnique({
    where: { tenantId_userId: { tenantId, userId } },
    select: { id: true },
  });
  if (existing) throw new Error("This user already has a membership in this tenant.");

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
      throw new Error(`Invalid membership role: ${input.role}`);
    }
    data.role = input.role;
  }
  if (input.status !== undefined) {
    if (!ALLOWED_MEMBERSHIP_STATUSES.includes(input.status as AllowedMembershipStatus)) {
      throw new Error(`Invalid status value: ${input.status}`);
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

  if (!membershipId?.trim()) throw new Error("Membership ID is required.");
  if (!storeId?.trim()) throw new Error("Store ID is required.");
  if (!ALLOWED_STORE_ROLES.includes(role as AllowedStoreRole)) {
    throw new Error(`Invalid store role: ${role}`);
  }
  if (!ALLOWED_STORE_MEMBERSHIP_STATUSES.includes(status as AllowedStoreMembershipStatus)) {
    throw new Error(`Invalid status value: ${status}`);
  }

  const [membership, store] = await Promise.all([
    prisma.membership.findUnique({ where: { id: membershipId }, select: { id: true, tenantId: true } }),
    prisma.store.findUnique({ where: { id: storeId }, select: { id: true, tenantId: true } }),
  ]);
  if (!membership) throw new Error("Tenant membership not found.");
  if (!store) throw new Error("Store not found.");

  // Validate cross-tenant integrity
  if (membership.tenantId !== store.tenantId) {
    throw new Error("Failed to create store membership: the membership and store must belong to the same tenant.");
  }

  const existing = await prisma.storeMembership.findUnique({
    where: { membershipId_storeId: { membershipId, storeId } },
    select: { id: true },
  });
  if (existing) throw new Error("This membership is already linked to this store.");

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
      throw new Error(`Invalid store role: ${input.role}`);
    }
    data.role = input.role;
  }
  if (input.status !== undefined) {
    if (!ALLOWED_STORE_MEMBERSHIP_STATUSES.includes(input.status as AllowedStoreMembershipStatus)) {
      throw new Error(`Invalid status value: ${input.status}`);
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

// ─── Read helpers for dropdowns ───────────────────────────────────────────────

/**
 * Returns active tenant memberships for a given tenant so the UI can populate
 * a dropdown when adding a store membership.
 */
export async function listActiveTenantMembershipsForDropdown(
  tenantId: string
): Promise<{ id: string; userName: string; userEmail: string }[]> {
  const memberships = await prisma.membership.findMany({
    where: { tenantId, status: { not: "REMOVED" } },
    select: {
      id: true,
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return memberships.map((m) => ({
    id: m.id,
    userName: m.user.name,
    userEmail: m.user.email,
  }));
}
