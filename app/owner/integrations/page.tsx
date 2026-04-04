import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import { getOwnerTenantConnectionCards } from "@/services/owner/owner-integrations.service";
import ConnectionGroupList from "@/components/owner/integrations/ConnectionGroupList";

export default async function OwnerIntegrationsPage() {
  const ctx = await requireOwnerPortalAccess();

  const ownerMembership =
    ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

  const tenantId = ownerMembership?.tenantId ?? "";
  const cards = tenantId ? await getOwnerTenantConnectionCards(tenantId) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage POS, delivery, and payment platform connections across your stores.
        </p>
      </div>
      <ConnectionGroupList cards={cards} />
    </div>
  );
}
