import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminBillingOverview } from "@/services/admin/admin-billing.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminBillingOverviewCards from "@/components/admin/billing/AdminBillingOverviewCards";
import Link from "next/link";

export default async function AdminBillingPage() {
  await requirePlatformAdmin();
  const overview = await getAdminBillingOverview();

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader
          title="Billing 개요"
          description="플랫폼 전체 구독 및 결제 현황"
        />
        <div className="flex gap-2 shrink-0 pt-1">
          <Link
            href="/admin/billing/plans"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            요금제 관리
          </Link>
          <Link
            href="/admin/billing/tenants"
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            테넌트 Billing
          </Link>
        </div>
      </div>
      <AdminBillingOverviewCards overview={overview} />
    </div>
  );
}
