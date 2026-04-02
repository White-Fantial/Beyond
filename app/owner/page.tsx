import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getOwnerDashboard } from "@/services/owner/owner-dashboard.service";
import { OWNER_PORTAL_MEMBERSHIP_ROLES } from "@/lib/auth/constants";
import OwnerOverviewGrid from "@/components/owner/OwnerOverviewGrid";
import OwnerStoreSummaryTable from "@/components/owner/OwnerStoreSummaryTable";
import OwnerAlertsPanel from "@/components/owner/OwnerAlertsPanel";
import Card from "@/components/ui/Card";

export default async function OwnerRootPage() {
  const ctx = await requireOwnerPortalAccess();

  // Resolve the owner's primary tenant
  const ownerMembership =
    ctx.tenantMemberships.find((tm) =>
      OWNER_PORTAL_MEMBERSHIP_ROLES.includes(tm.membershipRole)
    ) ?? ctx.tenantMemberships[0];

  // Platform admins without any tenant membership see a minimal message
  if (!ownerMembership) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 text-center text-gray-500 text-sm">
        No tenant context available. Assign a tenant membership to view the dashboard.
      </div>
    );
  }

  const dashboard = await getOwnerDashboard({
    tenantId: ownerMembership.tenantId,
    actorUserId: ctx.userId,
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Business Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tenant-wide summary across all your stores.
        </p>
      </div>

      {/* Business Overview */}
      <section aria-label="Business Overview">
        <OwnerOverviewGrid overview={dashboard.businessOverview} />
      </section>

      {/* Alerts */}
      <section aria-label="Alerts">
        <Card title="Alerts">
          <OwnerAlertsPanel alerts={dashboard.alerts} />
        </Card>
      </section>

      {/* Store Summary */}
      <section aria-label="Store Summary">
        <Card title="Store Summary" description="Daily performance per store.">
          <OwnerStoreSummaryTable stores={dashboard.storeSummaries} />
        </Card>
      </section>
    </div>
  );
}

