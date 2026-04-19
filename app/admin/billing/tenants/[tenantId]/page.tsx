import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import {
  getAdminTenantBillingDetail,
  getPaymentAttempts,
} from "@/services/admin/admin-subscription.service";
import { listAdminPlans } from "@/services/admin/admin-plan.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTenantSubscriptionCard from "@/components/admin/billing/AdminTenantSubscriptionCard";
import AdminBillingAccountCard from "@/components/admin/billing/AdminBillingAccountCard";
import AdminUsageSummaryCard from "@/components/admin/billing/AdminUsageSummaryCard";
import AdminBillingRecordTable from "@/components/admin/billing/AdminBillingRecordTable";
import AdminSubscriptionEventTable from "@/components/admin/billing/AdminSubscriptionEventTable";
import AdminBillingNoteForm from "@/components/admin/billing/AdminBillingNoteForm";
import AdminPaymentAttemptTable from "@/components/admin/billing/AdminPaymentAttemptTable";

interface PageProps {
  params: { tenantId: string };
}

export default async function AdminTenantBillingDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { tenantId } = params;

  let detail;
  let paymentAttempts;
  try {
    [detail, paymentAttempts] = await Promise.all([
      getAdminTenantBillingDetail(tenantId),
      getPaymentAttempts(tenantId),
    ]);
  } catch {
    notFound();
  }

  const plansResult = await listAdminPlans({ status: "ACTIVE", pageSize: 100 });
  const availablePlans = plansResult.items.map((p) => ({
    id: p.id,
    code: p.code,
    name: p.name,
  }));

  return (
    <div>
      <div className="mb-2 flex items-center gap-3">
        <Link href="/admin/billing/tenants" className="text-xs text-gray-400 hover:underline">
          ← Back to Billing Tenants
        </Link>
        <span className="text-gray-300">·</span>
        <Link
          href={`/admin/tenants/${tenantId}`}
          className="text-xs text-gray-400 hover:underline"
        >
          View Tenant Details →
        </Link>
      </div>

      <AdminPageHeader
        title={detail.tenantDisplayName}
        description={`Slug: ${detail.tenantSlug} · Status: ${detail.tenantStatus}`}
      />

      {/* Subscription */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Subscription</h2>
        <AdminTenantSubscriptionCard
          subscription={detail.subscription}
          tenantId={tenantId}
          availablePlans={availablePlans}
        />
      </div>

      {/* Usage vs Limits */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Usage vs Limits</h2>
        <AdminUsageSummaryCard
          usage={detail.usage}
          comparisons={detail.usageComparisons}
        />
      </div>

      {/* Billing Account */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Billing Account</h2>
        <AdminBillingAccountCard
          billingAccount={detail.billingAccount}
          tenantId={tenantId}
        />
      </div>

      {/* Add billing note */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Internal Notes / Add Record</h2>
        <AdminBillingNoteForm
          tenantId={tenantId}
          subscriptionId={detail.subscription?.id}
        />
      </div>

      {/* Billing Records */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Billing Records ({detail.billingRecords.length})
        </h2>
        <AdminBillingRecordTable records={detail.billingRecords} />
      </div>

      {/* Subscription Events */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Subscription Event History ({detail.subscriptionEvents.length})
        </h2>
        <AdminSubscriptionEventTable events={detail.subscriptionEvents} />
      </div>

      {/* Payment Attempts */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Payment Attempts ({paymentAttempts.length})
        </h2>
        <AdminPaymentAttemptTable attempts={paymentAttempts} tenantId={tenantId} />
      </div>
    </div>
  );
}
