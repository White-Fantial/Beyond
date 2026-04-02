/**
 * Owner Staff Service — staff list, invite, role change, deactivate, remove.
 *
 * Safety rules:
 *  - The last OWNER of a store/tenant cannot be demoted or removed.
 *  - An actor cannot demote themselves if they are the last OWNER.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import type { OwnerStaffRow } from "@/types/owner";

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listOwnerStoreStaff(
  storeId: string,
  tenantId: string
): Promise<OwnerStaffRow[]> {
  const sms = await prisma.storeMembership.findMany({
    where: { storeId, tenantId, status: { not: "REMOVED" } },
    include: {
      membership: {
        include: {
          user: { select: { id: true, name: true, email: true, createdAt: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return sms.map((sm) => ({
    storeMembershipId: sm.id,
    membershipId: sm.membershipId,
    userId: sm.membership.userId,
    name: sm.membership.user.name,
    email: sm.membership.user.email,
    tenantMembershipRole: sm.membership.role,
    storeRole: sm.role,
    status: sm.status,
    isPrimaryStoreOwner: sm.role === "OWNER",
    invitedAt:
      sm.membership.status === "INVITED" ? sm.membership.user.createdAt.toISOString() : null,
    lastLoginAt: null, // TODO: track last login
  }));
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export interface InviteStaffInput {
  storeId: string;
  tenantId: string;
  actorUserId: string;
  email: string;
  name?: string;
  storeRole: string;
}

export async function inviteOwnerStoreStaff(input: InviteStaffInput): Promise<void> {
  const { storeId, tenantId, actorUserId, email, name, storeRole } = input;

  // Check if user already exists
  let user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email,
        name: name ?? email,
        passwordHash: "",
        status: "INVITED",
      },
    });
  }

  // Ensure tenant membership
  let membership = await prisma.membership.findFirst({
    where: { tenantId, userId: user.id },
  });

  if (!membership) {
    membership = await prisma.membership.create({
      data: {
        tenantId,
        userId: user.id,
        role: "STAFF",
        status: "INVITED",
      },
    });
  }

  // Upsert store membership
  await prisma.storeMembership.upsert({
    where: { membershipId_storeId: { membershipId: membership.id, storeId } },
    create: {
      tenantId,
      membershipId: membership.id,
      storeId,
      role: storeRole as Parameters<typeof prisma.storeMembership.create>[0]["data"]["role"],
      status: "ACTIVE",
    },
    update: {
      role: storeRole as Parameters<typeof prisma.storeMembership.update>[0]["data"]["role"],
      status: "ACTIVE",
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STAFF_INVITED",
    targetType: "StoreMembership",
    targetId: user.id,
    metadata: { email, storeRole },
  });
}

// ─── Update role ──────────────────────────────────────────────────────────────

export interface UpdateStaffRoleInput {
  storeMembershipId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  newRole: string;
}

export async function updateOwnerStoreStaffRole(input: UpdateStaffRoleInput): Promise<void> {
  const { storeMembershipId, storeId, tenantId, actorUserId, newRole } = input;

  const sm = await prisma.storeMembership.findUniqueOrThrow({
    where: { id: storeMembershipId },
  });

  // Guard: cannot demote if last OWNER
  if (sm.role === "OWNER" && newRole !== "OWNER") {
    await assertNotLastOwner(storeId, storeMembershipId);
  }

  await prisma.storeMembership.update({
    where: { id: storeMembershipId },
    data: {
      role: newRole as Parameters<typeof prisma.storeMembership.update>[0]["data"]["role"],
    },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STAFF_ROLE_UPDATED",
    targetType: "StoreMembership",
    targetId: storeMembershipId,
    metadata: { oldRole: sm.role, newRole },
  });
}

// ─── Deactivate / Reactivate ──────────────────────────────────────────────────

export interface ToggleStaffStatusInput {
  storeMembershipId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
  activate: boolean;
}

export async function toggleOwnerStoreStaffStatus(input: ToggleStaffStatusInput): Promise<void> {
  const { storeMembershipId, storeId, tenantId, actorUserId, activate } = input;

  const sm = await prisma.storeMembership.findUniqueOrThrow({
    where: { id: storeMembershipId },
  });

  if (!activate && sm.role === "OWNER") {
    await assertNotLastOwner(storeId, storeMembershipId);
  }

  await prisma.storeMembership.update({
    where: { id: storeMembershipId },
    data: { status: activate ? "ACTIVE" : "INACTIVE" },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: activate ? "OWNER_STAFF_REACTIVATED" : "OWNER_STAFF_DEACTIVATED",
    targetType: "StoreMembership",
    targetId: storeMembershipId,
    metadata: {},
  });
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export interface RemoveStaffInput {
  storeMembershipId: string;
  storeId: string;
  tenantId: string;
  actorUserId: string;
}

export async function removeOwnerStoreStaff(input: RemoveStaffInput): Promise<void> {
  const { storeMembershipId, storeId, tenantId, actorUserId } = input;

  const sm = await prisma.storeMembership.findUniqueOrThrow({
    where: { id: storeMembershipId },
  });

  if (sm.role === "OWNER") {
    await assertNotLastOwner(storeId, storeMembershipId);
  }

  await prisma.storeMembership.update({
    where: { id: storeMembershipId },
    data: { status: "REMOVED" },
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "OWNER_STAFF_REMOVED",
    targetType: "StoreMembership",
    targetId: storeMembershipId,
    metadata: {},
  });
}

// ─── Guard helper ─────────────────────────────────────────────────────────────

async function assertNotLastOwner(storeId: string, excludeSmId: string): Promise<void> {
  const ownerCount = await prisma.storeMembership.count({
    where: {
      storeId,
      role: "OWNER",
      status: "ACTIVE",
      id: { not: excludeSmId },
    },
  });

  if (ownerCount === 0) {
    throw new Error("LAST_OWNER_DEMOTION_BLOCKED");
  }
}
