import { redirect } from "next/navigation";
import { getCurrentUserAuthContext, type UserAuthContext } from "./context";
import { ROLE_PERMISSIONS, type RoleKey, type PermissionKey } from "./constants";

export function userHasPermission(
  ctx: UserAuthContext,
  permission: PermissionKey,
  storeId?: string
): boolean {
  if (ctx.isAdmin) return true; // Admin has all platform permissions

  if (storeId) {
    const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
    if (membership) {
      return membership.permissions.includes(permission);
    }
    return false;
  }

  return ctx.permissions.includes(permission);
}

export function userHasRole(ctx: UserAuthContext, role: RoleKey): boolean {
  if (ctx.platformRole === role) return true;
  return ctx.storeMemberships.some((m) => m.roleKey === role);
}

export async function requireAuth(): Promise<UserAuthContext> {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) {
    redirect("/login");
  }
  return ctx;
}

export async function requirePermission(
  permission: PermissionKey,
  storeId?: string
): Promise<UserAuthContext> {
  const ctx = await requireAuth();
  if (!userHasPermission(ctx, permission, storeId)) {
    redirect("/unauthorized");
  }
  return ctx;
}

export async function requireStorePermission(
  storeId: string,
  permission: PermissionKey
): Promise<UserAuthContext> {
  const ctx = await requireAuth();
  const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
  if (!membership) {
    redirect("/unauthorized");
  }
  if (!membership.permissions.includes(permission) && !ctx.isAdmin) {
    redirect("/unauthorized");
  }
  return ctx;
}

export async function requireStoreAccess(storeId: string): Promise<UserAuthContext> {
  const ctx = await requireAuth();
  if (ctx.isAdmin) return ctx; // Admin can access any store for support (but via /admin)
  const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
  if (!membership && !ctx.isOwner) {
    redirect("/unauthorized");
  }
  return ctx;
}

export function roleHasPermission(roleKey: RoleKey, permission: PermissionKey): boolean {
  return ROLE_PERMISSIONS[roleKey]?.includes(permission) ?? false;
}
