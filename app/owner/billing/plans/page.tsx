import Link from "next/link";
import { requireOwnerAdminAccess } from "@/lib/owner/auth-guard";
import { getPlanCatalog } from "@/services/owner/owner-billing.service";
import PlanChangeFlow from "@/components/owner/billing/PlanChangeFlow";

export default async function PlansPage() {
  const ctx = await requireOwnerAdminAccess();
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const catalog = await getPlanCatalog(tenantId);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link href="/owner/billing" className="text-xs text-gray-500 hover:text-gray-700">
          ← Billing
        </Link>
        <h1 className="text-xl font-bold text-gray-900">Plans</h1>
      </div>

      {catalog.currentPlan && (
        <div className="mb-4 text-sm text-gray-600">
          You are currently on the{" "}
          <span className="font-semibold text-gray-900">{catalog.currentPlan.name}</span> plan.
        </div>
      )}

      <PlanChangeFlow
        plans={catalog.plans}
        currentPlanCode={catalog.currentPlan?.code ?? null}
      />
    </div>
  );
}
