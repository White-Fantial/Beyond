import { prisma } from "@/lib/prisma";
import { getSession, type SessionPayload } from "./session";
import { ROLES, ROLE_PERMISSIONS, type RoleKey, type PermissionKey } from "./constants";

export interface StoreMembershipContext {
  storeId: string;
  storeName: string;
  roleKey: RoleKey;
  isDefault: boolean;
  permissions: PermissionKey[];
}

export interface UserAuthContext {
  userId: string;
  email: string;
  name: string;
  platformRole: RoleKey;
  tenantId: string | null;
  defaultStoreId: string | null;
  isAdmin: boolean;
  isOwner: boolean;
  isCustomer: boolean;
  isOperationalUser: boolean;
  storeMemberships: StoreMembershipContext[];
  permissions: PermissionKey[];
}

export async function getCurrentUserAuthContext(): Promise<UserAuthContext | null> {
  const session = await getSession();
  if (!session) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId, deletedAt: null },
    include: {
      storeMemberships: {
        where: { isActive: true },
        include: { store: true, role: true },
      },
    },
  });

  if (!user) return null;

  const platformRole = user.platformRole as RoleKey;
  const platformPermissions = ROLE_PERMISSIONS[platformRole] ?? [];

  const storeMemberships: StoreMembershipContext[] = user.storeMemberships.map((m) => {
    const roleKey = m.role.key as RoleKey;
    return {
      storeId: m.storeId,
      storeName: m.store.name,
      roleKey,
      isDefault: m.isDefault,
      permissions: ROLE_PERMISSIONS[roleKey] ?? [],
    };
  });

  // Aggregate all permissions
  const allPermissions = new Set<PermissionKey>(platformPermissions);
  storeMemberships.forEach((m) => m.permissions.forEach((p) => allPermissions.add(p)));

  const operationalRoles: RoleKey[] = [ROLES.STAFF, ROLES.SUPERVISOR, ROLES.MANAGER];

  return {
    userId: user.id,
    email: user.email,
    name: user.name,
    platformRole,
    tenantId: user.tenantId,
    defaultStoreId: user.defaultStoreId,
    isAdmin: platformRole === ROLES.ADMIN,
    isOwner: platformRole === ROLES.OWNER,
    isCustomer: platformRole === ROLES.CUSTOMER,
    isOperationalUser: operationalRoles.includes(platformRole) || storeMemberships.length > 0,
    storeMemberships,
    permissions: Array.from(allPermissions),
  };
}

export async function getUserStoreMemberships(userId: string): Promise<StoreMembershipContext[]> {
  const memberships = await prisma.storeMembership.findMany({
    where: { userId, isActive: true },
    include: { store: true, role: true },
  });

  return memberships.map((m) => {
    const roleKey = m.role.key as RoleKey;
    return {
      storeId: m.storeId,
      storeName: m.store.name,
      roleKey,
      isDefault: m.isDefault,
      permissions: ROLE_PERMISSIONS[roleKey] ?? [],
    };
  });
}

export async function getDefaultStoreMembership(userId: string): Promise<StoreMembershipContext | null> {
  const membership = await prisma.storeMembership.findFirst({
    where: { userId, isDefault: true, isActive: true },
    include: { store: true, role: true },
  });

  if (!membership) {
    // Fall back to first active membership
    const first = await prisma.storeMembership.findFirst({
      where: { userId, isActive: true },
      include: { store: true, role: true },
    });
    if (!first) return null;
    const roleKey = first.role.key as RoleKey;
    return {
      storeId: first.storeId,
      storeName: first.store.name,
      roleKey,
      isDefault: first.isDefault,
      permissions: ROLE_PERMISSIONS[roleKey] ?? [],
    };
  }

  const roleKey = membership.role.key as RoleKey;
  return {
    storeId: membership.storeId,
    storeName: membership.store.name,
    roleKey,
    isDefault: membership.isDefault,
    permissions: ROLE_PERMISSIONS[roleKey] ?? [],
  };
}

export async function getUserPlatformRole(userId: string): Promise<RoleKey | null> {
  const user = await prisma.user.findUnique({ where: { id: userId, deletedAt: null } });
  if (!user) return null;
  return user.platformRole as RoleKey;
}
