import { PLATFORM_ROLES, OWNER_PORTAL_MEMBERSHIP_ROLES } from "./constants";
import { getPrimaryStoreMembership } from "./context";
import type { SessionPayload } from "./session";
import type { MembershipRoleKey } from "./constants";

export async function resolvePostLoginRedirect(session: SessionPayload): Promise<string> {
  const { userId, platformRole, primaryMembershipRole, primaryStoreId } = session;

  // 1. Platform admin → /admin
  if (platformRole === PLATFORM_ROLES.PLATFORM_ADMIN) return "/admin";

  // 2. Tenant owner/admin → /owner
  if (
    primaryMembershipRole !== null &&
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(primaryMembershipRole as MembershipRoleKey)
  ) {
    return "/owner";
  }

  // 3. Has store access → /backoffice
  if (primaryStoreId) {
    return `/backoffice/store/${primaryStoreId}/orders`;
  }

  // 4. Look up store membership from DB (fallback)
  const storeCtx = await getPrimaryStoreMembership(userId);
  if (storeCtx) {
    return `/backoffice/store/${storeCtx.storeId}/orders`;
  }

  // 5. Default → /app (customer portal)
  return "/app";
}
