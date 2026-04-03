import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { prisma } from "@/lib/prisma";
import { listAlertRules } from "@/services/owner/owner-alert-rule.service";
import AlertRulesClient from "@/components/owner/alert-rules/AlertRulesClient";

export default async function AlertRulesPage() {
  const ctx = await requireOwnerPortalAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [{ items: rules }, stores] = await Promise.all([
    listAlertRules(tenantId, 1, 100),
    prisma.store.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Alert Rules</h1>
        <p className="mt-1 text-sm text-gray-500">
          Define thresholds for key metrics. When a threshold is crossed, all owners and admins
          receive an in-app notification.
        </p>
      </div>

      <AlertRulesClient initialRules={rules} stores={stores} />
    </div>
  );
}
