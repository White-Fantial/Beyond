/**
 * Auth guards for the Owner portal (/owner/**).
 *
 * Two levels of access:
 *  - requireOwnerPortalAccess()  — OWNER, ADMIN, MANAGER memberships
 *  - requireOwnerAdminAccess()   — OWNER, ADMIN only (store settings, users, billing)
 */
import { redirect } from "next/navigation";
import { getCurrentUserAuthContext } from "@/lib/auth/context";
import {
  OWNER_PORTAL_MEMBERSHIP_ROLES,
  OWNER_ADMIN_MEMBERSHIP_ROLES,
  type MembershipRoleKey,
} from "@/lib/auth/constants";

/** Returns the highest tenant membership role for the current user, or null. */
function getHighestMembershipRole(
  tenantMemberships: { membershipRole: MembershipRoleKey }[]
): MembershipRoleKey | null {
  const order: MembershipRoleKey[] = ["OWNER", "ADMIN", "MANAGER", "STAFF", "ANALYST"];
  for (const role of order) {
    if (tenantMemberships.some((tm) => tm.membershipRole === role)) return role;
  }
  return null;
}

/**
 * Require OWNER, ADMIN, or MANAGER membership.
 * Used for dashboard, connections, catalog, operations, reports, logs.
 */
export async function requireOwnerPortalAccess() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) redirect("/login");

  if (ctx.isPlatformAdmin) return ctx;

  const hasAccess = ctx.tenantMemberships.some((tm) =>
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  );
  if (!hasAccess) redirect("/unauthorized");

  return ctx;
}

/**
 * Require OWNER or ADMIN membership only.
 * Used for store settings, users management, and billing.
 */
export async function requireOwnerAdminAccess() {
  const ctx = await getCurrentUserAuthContext();
  if (!ctx) redirect("/login");

  if (ctx.isPlatformAdmin) return ctx;

  const hasAccess = ctx.tenantMemberships.some((tm) =>
    OWNER_ADMIN_MEMBERSHIP_ROLES.includes(tm.membershipRole)
  );
  if (!hasAccess) redirect("/unauthorized");

  return ctx;
}

/**
 * Returns true if the current user has OWNER or ADMIN membership
 * (i.e. they can access restricted pages like store settings).
 */
export function isOwnerAdminRole(roles: MembershipRoleKey[]): boolean {
  return roles.some((r) => OWNER_ADMIN_MEMBERSHIP_ROLES.includes(r));
}

export { getHighestMembershipRole };
