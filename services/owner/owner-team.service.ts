/**
 * Owner Team Service — tenant-level team management.
 *
 * Safety rules:
 *  - The last OWNER membership of a tenant cannot be demoted or removed.
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface OwnerTeamStoreAssignment {
  storeMembershipId: string;
  storeId: string;
  storeName: string;
  storeRole: string;
  status: string;
}

export interface OwnerTeamMember {
  membershipId: string;
  userId: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt: string | null;
  invitedAt: string | null;
  storeAssignments: OwnerTeamStoreAssignment[];
}

export interface InviteTeamMemberInput {
  tenantId: string;
  actorUserId: string;
  email: string;
  name?: string;
  role?: string;
}

export interface UpdateTeamMemberInput {
  membershipId: string;
  tenantId: string;
  actorUserId: string;
  role?: string;
  status?: string;
}

export interface RemoveTeamMemberInput {
  membershipId: string;
  tenantId: string;
  actorUserId: string;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listOwnerTeamMembers(tenantId: string): Promise<OwnerTeamMember[]> {
  const memberships = await prisma.membership.findMany({
    where: { tenantId, status: { not: "REMOVED" } },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      storeMemberships: {
        where: { status: { not: "REMOVED" } },
        include: { store: { select: { id: true, name: true } } },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return memberships.map(toTeamMember);
}

// ─── Get single ───────────────────────────────────────────────────────────────

export async function getOwnerTeamMember(
  membershipId: string,
  tenantId: string
): Promise<OwnerTeamMember | null> {
  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
    include: {
      user: { select: { id: true, name: true, email: true, createdAt: true } },
      storeMemberships: {
        where: { status: { not: "REMOVED" } },
        include: { store: { select: { id: true, name: true } } },
      },
    },
  });

  if (!membership) return null;
  return toTeamMember(membership);
}

// ─── Invite ───────────────────────────────────────────────────────────────────

export async function inviteOwnerTeamMember(
  input: InviteTeamMemberInput
): Promise<OwnerTeamMember> {
  const { tenantId, actorUserId, email, name, role = "STAFF" } = input;

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

  let membership = await prisma.membership.findFirst({
    where: { tenantId, userId: user.id },
  });

  if (!membership) {
    membership = await prisma.membership.create({
      data: {
        tenantId,
        userId: user.id,
        role: role as Parameters<typeof prisma.membership.create>[0]["data"]["role"],
        status: "INVITED",
        invitedByUserId: actorUserId,
      },
    });
  }

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "OWNER_TEAM_MEMBER_INVITED",
    targetType: "Membership",
    targetId: membership.id,
    metadata: { email, role },
  });

  const result = await getOwnerTeamMember(membership.id, tenantId);
  if (!result) throw new Error("Failed to fetch newly created team member");
  return result;
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateOwnerTeamMember(
  input: UpdateTeamMemberInput
): Promise<OwnerTeamMember> {
  const { membershipId, tenantId, actorUserId, role, status } = input;

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });

  if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");

  if (role && role !== "OWNER" && membership.role === "OWNER") {
    await assertNotLastOwner(tenantId, membershipId);
  }

  if (status === "INACTIVE" && membership.role === "OWNER") {
    await assertNotLastOwner(tenantId, membershipId);
  }

  const updateData: Record<string, unknown> = {};
  if (role) updateData.role = role;
  if (status) updateData.status = status;

  await prisma.membership.update({
    where: { id: membershipId },
    data: updateData as Parameters<typeof prisma.membership.update>[0]["data"],
  });

  let auditAction = "OWNER_TEAM_ROLE_CHANGED";
  if (!role && status === "INACTIVE") auditAction = "OWNER_TEAM_MEMBER_DEACTIVATED";
  else if (!role && status === "ACTIVE") auditAction = "OWNER_TEAM_MEMBER_REACTIVATED";

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: auditAction,
    targetType: "Membership",
    targetId: membershipId,
    metadata: { oldRole: membership.role, newRole: role, oldStatus: membership.status, newStatus: status },
  });

  const result = await getOwnerTeamMember(membershipId, tenantId);
  if (!result) throw new Error("Failed to fetch updated team member");
  return result;
}

// ─── Remove ───────────────────────────────────────────────────────────────────

export async function removeOwnerTeamMember(input: RemoveTeamMemberInput): Promise<void> {
  const { membershipId, tenantId, actorUserId } = input;

  const membership = await prisma.membership.findFirst({
    where: { id: membershipId, tenantId },
  });

  if (!membership) throw new Error("MEMBERSHIP_NOT_FOUND");

  if (membership.role === "OWNER") {
    await assertNotLastOwner(tenantId, membershipId);
  }

  await prisma.membership.update({
    where: { id: membershipId },
    data: { status: "REMOVED" },
  });

  await prisma.storeMembership.updateMany({
    where: { membershipId, tenantId },
    data: { status: "REMOVED" },
  });

  await logAuditEvent({
    tenantId,
    actorUserId,
    action: "OWNER_TEAM_MEMBER_REMOVED",
    targetType: "Membership",
    targetId: membershipId,
    metadata: {},
  });
}

// ─── Guard helper ─────────────────────────────────────────────────────────────

async function assertNotLastOwner(tenantId: string, excludeMembershipId: string): Promise<void> {
  const ownerCount = await prisma.membership.count({
    where: {
      tenantId,
      role: "OWNER",
      status: "ACTIVE",
      id: { not: excludeMembershipId },
    },
  });

  if (ownerCount === 0) {
    throw new Error("LAST_OWNER_DEMOTION_BLOCKED");
  }
}

// ─── Mapper ───────────────────────────────────────────────────────────────────

type MembershipWithRelations = {
  id: string;
  role: string;
  status: string;
  joinedAt: Date | null;
  createdAt: Date;
  user: { id: string; name: string; email: string; createdAt: Date };
  storeMemberships: Array<{
    id: string;
    storeId: string;
    role: string;
    status: string;
    store: { id: string; name: string };
  }>;
};

function toTeamMember(m: MembershipWithRelations): OwnerTeamMember {
  return {
    membershipId: m.id,
    userId: m.user.id,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    status: m.status,
    joinedAt: m.joinedAt?.toISOString() ?? null,
    invitedAt: m.status === "INVITED" ? m.createdAt.toISOString() : null,
    storeAssignments: m.storeMemberships.map((sm) => ({
      storeMembershipId: sm.id,
      storeId: sm.storeId,
      storeName: sm.store.name,
      storeRole: sm.role,
      status: sm.status,
    })),
  };
}
