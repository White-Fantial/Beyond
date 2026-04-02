/**
 * Owner-portal authorization helpers.
 *
 * Validates that the acting user has OWNER-level access to a specific store
 * and that the store belongs to their tenant.
 */
import { redirect } from "next/navigation";
import { getCurrentUserAuthContext, type UserAuthContext } from "@/lib/auth/context";
import { MEMBERSHIP_ROLES, STORE_ROLES } from "@/lib/auth/constants";

const OWNER_MEMBERSHIP_ROLES = [MEMBERSHIP_ROLES.OWNER, MEMBERSHIP_ROLES.ADMIN] as const;
const OWNER_STORE_ROLES = [
  STORE_ROLES.OWNER,
  STORE_ROLES.ADMIN,
  STORE_ROLES.MANAGER,
] as const;

/**
 * Requires that the current user is authenticated and has OWNER or ADMIN
 * membership in a tenant that owns the given store.
 *
 * Returns the auth context on success; redirects on failure.
 */
export async function requireOwnerStoreAccess(storeId: string): Promise<UserAuthContext> {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) redirect("/login");

  if (ctx.isPlatformAdmin) return ctx;

  // Check that there is a tenant membership that has access to this store
  const tenantWithStore = ctx.tenantMemberships.find(
    (tm) =>
      OWNER_MEMBERSHIP_ROLES.includes(tm.membershipRole as (typeof OWNER_MEMBERSHIP_ROLES)[number]) &&
      tm.storeMemberships.some((sm) => sm.storeId === storeId)
  );

  if (!tenantWithStore) redirect("/unauthorized");

  return ctx;
}

/**
 * Verifies cross-tenant access: storeId must belong to the actor's tenant.
 * Returns tenantId or throws.
 */
export function resolveActorTenantId(ctx: UserAuthContext, storeId: string): string {
  if (ctx.isPlatformAdmin) {
    // Platform admin: use first tenant that has this store, or empty
    const tm = ctx.tenantMemberships.find((tm) =>
      tm.storeMemberships.some((sm) => sm.storeId === storeId)
    );
    return tm?.tenantId ?? ctx.tenantMemberships[0]?.tenantId ?? "";
  }

  const tm = ctx.tenantMemberships.find((tm) =>
    tm.storeMemberships.some((sm) => sm.storeId === storeId)
  );

  if (!tm) throw new Error("CROSS_TENANT_ACCESS_DENIED");
  return tm.tenantId;
}

/**
 * Returns whether the user has a store-level owner/admin role for the given store.
 */
export function hasOwnerStoreRole(ctx: UserAuthContext, storeId: string): boolean {
  if (ctx.isPlatformAdmin) return true;
  const sm = ctx.storeMemberships.find((m) => m.storeId === storeId);
  if (!sm) return false;
  return OWNER_STORE_ROLES.includes(sm.storeRole as (typeof OWNER_STORE_ROLES)[number]);
}
