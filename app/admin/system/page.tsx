import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminSystemDashboard } from "@/services/admin/admin-system.service";
import { AdminSystemDashboardClient } from "@/components/admin/system/AdminSystemDashboardClient";
import { AdminSystemEmptyState } from "@/components/admin/system/AdminSystemEmptyState";

export const dynamic = "force-dynamic";

export default async function AdminSystemPage() {
  await requirePlatformAdmin();

  let dashboard;
  try {
    dashboard = await getAdminSystemDashboard();
  } catch {
    return (
      <div className="p-6">
        <h1 className="mb-6 text-xl font-bold text-gray-900">
          시스템 모니터링
        </h1>
        <AdminSystemEmptyState />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">시스템 모니터링</h1>
        <p className="mt-1 text-sm text-gray-500">
          플랫폼 전체 상태 · 운영 메트릭 · 인시던트 개요
        </p>
      </div>
      <AdminSystemDashboardClient dashboard={dashboard} />
    </div>
  );
}
