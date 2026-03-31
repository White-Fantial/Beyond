import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminBillingSummary } from "@/services/admin/admin-billing.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import BillingSubscriptionTable from "@/components/admin/BillingSubscriptionTable";

export default async function AdminBillingPage() {
  await requirePlatformAdmin();
  const billing = await getAdminBillingSummary();

  return (
    <div>
      <AdminPageHeader
        title="결제 및 구독"
        description="플랫폼 구독 플랜 및 구독 현황을 조회합니다."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="구독 플랜 수" value={billing.totalSubscriptionPlans} />
        <AdminStatCard label="전체 구독 수" value={billing.totalSubscriptions} />
        <AdminStatCard label="활성 구독 수" value={billing.totalActiveSubscriptions} />
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          구독 플랜 목록 ({billing.totalSubscriptionPlans})
        </h2>
        <BillingSubscriptionTable plans={billing.recentPlans} />
      </div>
    </div>
  );
}
