import { prisma } from "@/lib/prisma";
import { getSession } from "./session";
import { getImpersonationState } from "./impersonation";
import {
  STORE_ROLE_PERMISSIONS,
  MEMBERSHIP_ROLE_PERMISSIONS,
  PLATFORM_ROLES,
  type PlatformRoleKey,
  type MembershipRoleKey,
  type StoreRoleKey,
  type PermissionKey,
} from "./constants";

export interface StoreMembershipContext {
  storeId: string;
  storeName: string;
  membershipId: string;
  storeRole: StoreRoleKey;
  permissions: PermissionKey[];
}

export interface TenantMembershipContext {
  tenantId: string;
  membershipId: string;
  membershipRole: MembershipRoleKey;
  storeMemberships: StoreMembershipContext[];
}

export interface UserAuthContext {
  userId: string;
  email: string;
  name: string;
  platformRole: PlatformRoleKey;
  isPlatformAdmin: boolean;
  isPlatformSupport: boolean;
  tenantMemberships: TenantMembershipContext[];
  // Flattened store memberships across all tenants
  storeMemberships: StoreMembershipContext[];
  permissions: PermissionKey[];
  /** Present only when a PLATFORM_ADMIN is impersonating another user. */
  impersonation?: {
    actorUserId: string;
    actorEmail: string;
    actorName: string;
    startedAt: string;
  };
}

export async function getCurrentUserAuthContext(): Promise<UserAuthContext | null> {
  const session = await getSession();
  if (!session) return null;

  // When impersonating, load the effective user instead of the actor.
  const impersonation = await getImpersonationState();
  const targetUserId = impersonation ? impersonation.effectiveUserId : session.userId;

  const ctx = await buildUserAuthContext(targetUserId);
  if (!ctx) return null;

  return impersonation
    ? {
        ...ctx,
        impersonation: {
          actorUserId: impersonation.actorUserId,
          actorEmail: impersonation.actorEmail,
          actorName: impersonation.actorName,
          startedAt: impersonation.startedAt,
        },
      }
    : ctx;
}

/**
 * Returns the auth context for the *actor* (the real logged-in user),
 * ignoring any active impersonation overlay. Used by admin-area guards so
 * that PLATFORM_ADMIN retains access to /admin while impersonating.
 */
export async function getActorUserAuthContext(): Promise<UserAuthContext | null> {
  const session = await getSession();
  if (!session) return null;
  return buildUserAuthContext(session.userId);
}

async function buildUserAuthContext(userId: string): Promise<UserAuthContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        where: { status: "ACTIVE" },
        include: {
          storeMemberships: {
            where: { status: "ACTIVE" },
            include: { store: true },
          },
        },
      },
    },
  });

  if (!user || user.status === "ARCHIVED" || user.status === "SUSPENDED") return null;

  const platformRole = user.platformRole as PlatformRoleKey;
  const isPlatformAdmin = platformRole === PLATFORM_ROLES.PLATFORM_ADMIN;
  const isPlatformSupport = platformRole === PLATFORM_ROLES.PLATFORM_SUPPORT;

  const tenantMemberships: TenantMembershipContext[] = user.memberships.map((m) => {
    const membershipRole = m.role as MembershipRoleKey;
    const storeMemberships: StoreMembershipContext[] = m.storeMemberships.map((sm) => {
      const storeRole = sm.role as StoreRoleKey;
      return {
        storeId: sm.storeId,
        storeName: sm.store.name,
        membershipId: sm.membershipId,
        storeRole,
        permissions: STORE_ROLE_PERMISSIONS[storeRole] ?? [],
      };
    });
    return {
      tenantId: m.tenantId,
      membershipId: m.id,
      membershipRole,
      storeMemberships,
    };
  });

  const allStoreMemberships = tenantMemberships.flatMap((tm) => tm.storeMemberships);

  const allPermissions = new Set<PermissionKey>();
  if (isPlatformAdmin) {
    allPermissions.add("PLATFORM_ADMIN");
  } else {
    // All authenticated non-admin users can access the customer app
    allPermissions.add("CUSTOMER_APP");
  }
  tenantMemberships.forEach((tm) => {
    (MEMBERSHIP_ROLE_PERMISSIONS[tm.membershipRole] ?? []).forEach((p) => allPermissions.add(p));
    tm.storeMemberships.forEach((sm) => sm.permissions.forEach((p) => allPermissions.add(p)));
  });

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    platformRole,
    isPlatformAdmin,
    isPlatformSupport,
    tenantMemberships,
    storeMemberships: allStoreMemberships,
    permissions: Array.from(allPermissions),
  };
}

export async function getUserStoreMembershipsForStore(
  userId: string,
  storeId: string
): Promise<StoreMembershipContext[]> {
  const storeMemberships = await prisma.storeMembership.findMany({
    where: {
      storeId,
      status: "ACTIVE",
      membership: { userId, status: "ACTIVE" },
    },
    include: { store: true },
  });

  return storeMemberships.map((sm) => {
    const storeRole = sm.role as StoreRoleKey;
    return {
      storeId: sm.storeId,
      storeName: sm.store.name,
      membershipId: sm.membershipId,
      storeRole,
      permissions: STORE_ROLE_PERMISSIONS[storeRole] ?? [],
    };
  });
}

export async function getPrimaryStoreMembership(userId: string): Promise<StoreMembershipContext | null> {
  const sm = await prisma.storeMembership.findFirst({
    where: {
      status: "ACTIVE",
      membership: { userId, status: "ACTIVE" },
    },
    include: { store: true },
    orderBy: { createdAt: "asc" },
  });

  if (!sm) return null;
  const storeRole = sm.role as StoreRoleKey;
  return {
    storeId: sm.storeId,
    storeName: sm.store.name,
    membershipId: sm.membershipId,
    storeRole,
    permissions: STORE_ROLE_PERMISSIONS[storeRole] ?? [],
  };
}
