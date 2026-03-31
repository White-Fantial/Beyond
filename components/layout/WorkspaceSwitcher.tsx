import { getSession } from "@/lib/auth/session";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import type { MembershipRoleKey } from "@/lib/auth/constants";
import Link from "next/link";

type PortalKey = "customer" | "backoffice" | "owner" | "admin";

interface Portal {
  key: PortalKey;
  label: string;
  href: string;
}

interface WorkspaceSwitcherProps {
  currentPortal: PortalKey;
  /** storeId from URL params (backoffice layouts). Falls back to session primaryStoreId. */
  storeId?: string;
}

export default async function WorkspaceSwitcher({ currentPortal, storeId }: WorkspaceSwitcherProps) {
  const session = await getSession();
  if (!session) return null;

  const { platformRole, primaryMembershipRole, primaryStoreId } = session;
  const effectiveStoreId = storeId ?? primaryStoreId;
  const isOwnerMember =
    primaryMembershipRole !== null &&
    OWNER_PORTAL_MEMBERSHIP_ROLES.includes(primaryMembershipRole as MembershipRoleKey);

  const portals: Portal[] = [];

  if (platformRole === "PLATFORM_ADMIN") {
    portals.push({ key: "admin", label: "Admin Console", href: "/admin" });
  } else {
    // All authenticated non-admin users can access the customer app
    portals.push({ key: "customer", label: "Customer App", href: "/app" });

    // STAFF+ (has a store) or OWNER membership → Back Office
    if (effectiveStoreId || isOwnerMember) {
      const backofficeHref = effectiveStoreId
        ? `/backoffice/store/${effectiveStoreId}/orders`
        : "/backoffice/select-store";
      portals.push({ key: "backoffice", label: "Back Office", href: backofficeHref });
    }

    // OWNER membership → Owner Console
    if (isOwnerMember) {
      portals.push({ key: "owner", label: "Owner Console", href: "/owner" });
    }
  }

  // Nothing to switch if only one portal is available
  if (portals.length <= 1) return null;

  const currentLabel = portals.find((p) => p.key === currentPortal)?.label ?? currentPortal;
  const otherPortals = portals.filter((p) => p.key !== currentPortal);

  return (
    <div className="flex items-center gap-2 text-sm flex-wrap">
      <span className="text-gray-500">Current:</span>
      <span className="font-semibold text-gray-800">{currentLabel}</span>
      {otherPortals.length > 0 && (
        <>
          <span className="text-gray-300 select-none">|</span>
          <span className="text-gray-500">Switch to:</span>
          <div className="flex items-center gap-3">
            {otherPortals.map((portal) => (
              <Link
                key={portal.key}
                href={portal.href}
                className="text-brand-600 hover:text-brand-800 hover:underline font-medium"
              >
                {portal.label}
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
