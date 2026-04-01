import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminFeatureFlags } from "@/services/admin/admin-feature-flag.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminFeatureFlagTable from "@/components/admin/feature-flags/AdminFeatureFlagTable";
import AdminFeatureFlagCreateDialog from "@/components/admin/feature-flags/AdminFeatureFlagCreateDialog";
import type { FlagStatus } from "@/types/feature-flags";

interface SearchParams {
  status?: string;
  search?: string;
}

export default async function AdminFeatureFlagsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePlatformAdmin();

  const flags = await listAdminFeatureFlags({
    status: searchParams.status as FlagStatus | undefined,
    search: searchParams.search,
  });

  const counts = {
    total: flags.length,
    active: flags.filter((f) => f.status === "ACTIVE").length,
    inactive: flags.filter((f) => f.status === "INACTIVE").length,
    archived: flags.filter((f) => f.status === "ARCHIVED").length,
  };

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader
          title="Feature Flags"
          description="플랫폼 기능의 점진 배포 및 런타임 제어"
        />
        <div className="shrink-0 pt-1">
          <AdminFeatureFlagCreateDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">전체</p>
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">활성</p>
          <p className="text-2xl font-bold text-green-700">{counts.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">비활성</p>
          <p className="text-2xl font-bold text-gray-500">{counts.inactive}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">보관됨</p>
          <p className="text-2xl font-bold text-red-600">{counts.archived}</p>
        </div>
      </div>

      <AdminFeatureFlagTable flags={flags} />
    </div>
  );
}
