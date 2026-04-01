import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminBillingOverview } from "@/services/admin/admin-billing.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";

export default async function AdminBillingPage() {
  await requirePlatformAdmin();
  const overview = await getAdminBillingOverview();

  return (
    <div>
      <AdminPageHeader
        title="결제 및 구독"
        description="플랫폼 구독 플랜 및 구독 현황을 조회합니다."
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="전체 구독 수" value={overview.totalTenantsWithSubscription} />
        <AdminStatCard label="활성 구독 수" value={overview.activeSubscriptions} />
        <AdminStatCard label="트라이얼 구독 수" value={overview.trialSubscriptions} />
        <AdminStatCard label="연체 구독 수" value={overview.pastDueSubscriptions} />
        <AdminStatCard label="정지 구독 수" value={overview.suspendedSubscriptions} />
        <AdminStatCard label="취소 구독 수" value={overview.cancelledSubscriptions} />
      </div>
    </div>
  );
}
