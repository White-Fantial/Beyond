import { redirect } from "next/navigation";
import { getCurrentUserAuthContext, type UserAuthContext } from "./context";
import type { PermissionKey } from "./constants";

export function userHasPermission(
  ctx: UserAuthContext,
  permission: PermissionKey,
  storeId?: string
): boolean {
  if (ctx.isPlatformAdmin) return true;

  if (storeId) {
    const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
    if (membership) {
      return membership.permissions.includes(permission);
    }
    return false;
  }

  return ctx.permissions.includes(permission);
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
  if (!membership.permissions.includes(permission) && !ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }
  return ctx;
}

export async function requireStoreAccess(storeId: string): Promise<UserAuthContext> {
  const ctx = await requireAuth();
  if (ctx.isPlatformAdmin) return ctx;
  const membership = ctx.storeMemberships.find((m) => m.storeId === storeId);
  const tenantMembership = ctx.tenantMemberships.find(
    (tm) => tm.storeMemberships.some((sm) => sm.storeId === storeId)
  );
  if (!membership && !tenantMembership) {
    redirect("/unauthorized");
  }
  return ctx;
}
