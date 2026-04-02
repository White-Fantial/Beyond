import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminPlanDetail } from "@/services/admin/admin-plan.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminPlanForm from "@/components/admin/billing/AdminPlanForm";
import AdminPlanLimitEditor from "@/components/admin/billing/AdminPlanLimitEditor";
import AdminPlanFeatureEditor from "@/components/admin/billing/AdminPlanFeatureEditor";
import {
  formatPriceMinor,
  labelBillingInterval,
  labelPlanStatus,
  labelSubscriptionStatus,
} from "@/lib/billing/labels";

interface PageProps {
  params: Promise<{ planId: string }>;
}

export default async function AdminPlanDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { planId } = await params;

  let plan;
  try {
    plan = await getAdminPlanDetail(planId);
  } catch {
    notFound();
  }

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/billing/plans" className="text-xs text-gray-400 hover:underline">
          ← Back to Plans
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader
          title={plan.name}
          description={`Code: ${plan.code}`}
        />
        <div className="shrink-0 pt-1">
          <StatusBadge value={plan.status} label={labelPlanStatus(plan.status)} />
        </div>
      </div>

      {/* Basic info + edit form */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm mb-6">
          <div>
            <span className="text-xs text-gray-500">Price</span>
            <div className="font-semibold">{formatPriceMinor(plan.priceAmountMinor, plan.currencyCode)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Billing Interval</span>
            <div className="font-semibold">{labelBillingInterval(plan.billingInterval)}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Trial Period</span>
            <div className="font-semibold">{plan.trialDays ? `${plan.trialDays} days` : "None"}</div>
          </div>
          <div>
            <span className="text-xs text-gray-500">Subscribed Tenants</span>
            <div className="font-semibold">{plan.tenantCount}</div>
          </div>
        </div>
        <AdminPlanForm plan={plan} />
      </div>

      {/* Limits */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Usage Limits</h2>
        <AdminPlanLimitEditor planId={plan.id} limits={plan.limits} />
      </div>

      {/* Features */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Feature Settings</h2>
        <AdminPlanFeatureEditor planId={plan.id} features={plan.features} />
      </div>

      {/* Tenants using this plan */}
      {plan.tenants.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">
            Tenants on This Plan ({plan.tenantCount})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-200">
                  <th className="text-left pb-2 pr-4">Tenant</th>
                  <th className="text-left pb-2 pr-4">Status</th>
                  <th className="text-right pb-2 pr-4">Stores</th>
                  <th className="text-right pb-2 pr-4">Users</th>
                  <th className="text-right pb-2 pr-4">Period End</th>
                  <th className="text-right pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {plan.tenants.map((t) => (
                  <tr key={t.tenantId} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 pr-4">
                      <div className="font-medium">{t.tenantDisplayName}</div>
                      <div className="text-xs text-gray-400 font-mono">{t.tenantSlug}</div>
                    </td>
                    <td className="py-2 pr-4">
                      <StatusBadge
                        value={t.subscriptionStatus}
                        label={labelSubscriptionStatus(t.subscriptionStatus)}
                      />
                    </td>
                    <td className="py-2 pr-4 text-right">{t.storesCount}</td>
                    <td className="py-2 pr-4 text-right">{t.usersCount}</td>
                    <td className="py-2 pr-4 text-right text-xs text-gray-500">
                      {t.currentPeriodEnd
                        ? new Date(t.currentPeriodEnd).toLocaleDateString("en-US")
                        : "—"}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/admin/billing/tenants/${t.tenantId}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
