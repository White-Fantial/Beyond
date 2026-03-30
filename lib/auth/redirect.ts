import { ROLES, STORE_ROLE_REDIRECT_PATHS, type RoleKey } from "./constants";
import {
  getDefaultStoreMembership,
  getUserStoreMemberships,
} from "./context";
import type { SessionPayload } from "./session";

export async function resolvePostLoginRedirect(session: SessionPayload): Promise<string> {
  const { userId, platformRole, defaultStoreId } = session;
  const role = platformRole as RoleKey;

  // 1. ADMIN -> /admin
  if (role === ROLES.ADMIN) return "/admin";

  // 2. OWNER -> /owner
  if (role === ROLES.OWNER) return "/owner";

  // 3. CUSTOMER -> /app
  if (role === ROLES.CUSTOMER) return "/app";

  // 4. Operational roles: STAFF / SUPERVISOR / MANAGER -> store-scoped route
  const operationalRoles: RoleKey[] = [ROLES.STAFF, ROLES.SUPERVISOR, ROLES.MANAGER];
  if (operationalRoles.includes(role)) {
    const memberships = await getUserStoreMemberships(userId);

    if (memberships.length === 0) {
      return "/unauthorized";
    }

    if (memberships.length === 1) {
      const m = memberships[0];
      const path = STORE_ROLE_REDIRECT_PATHS[m.roleKey] ?? "orders";
      return `/backoffice/store/${m.storeId}/${path}`;
    }

    // Multiple memberships: check for default
    if (defaultStoreId) {
      const defaultMembership = memberships.find((m) => m.storeId === defaultStoreId);
      if (defaultMembership) {
        const path = STORE_ROLE_REDIRECT_PATHS[defaultMembership.roleKey] ?? "orders";
        return `/backoffice/store/${defaultMembership.storeId}/${path}`;
      }
    }

    const defaultM = await getDefaultStoreMembership(userId);
    if (defaultM) {
      const path = STORE_ROLE_REDIRECT_PATHS[defaultM.roleKey] ?? "orders";
      return `/backoffice/store/${defaultM.storeId}/${path}`;
    }

    // Multiple stores, no default -> store selector
    return "/backoffice/select-store";
  }

  return "/unauthorized";
}
