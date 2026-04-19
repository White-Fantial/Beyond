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

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export default async function AdminFeatureFlagsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await requirePlatformAdmin();

  const params = await searchParams;
  const status = firstParam(params.status) as FlagStatus | undefined;
  const search = firstParam(params.search);

  const flags = await listAdminFeatureFlags({
    status,
    search,
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
          description="Gradual rollout and runtime control of platform features"
        />
        <div className="shrink-0 pt-1">
          <AdminFeatureFlagCreateDialog />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Total</p>
          <p className="text-2xl font-bold text-gray-900">{counts.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-2xl font-bold text-green-700">{counts.active}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Inactive</p>
          <p className="text-2xl font-bold text-gray-500">{counts.inactive}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <p className="text-xs text-gray-500">Archived</p>
          <p className="text-2xl font-bold text-red-600">{counts.archived}</p>
        </div>
      </div>

      <AdminFeatureFlagTable flags={flags} />
    </div>
  );
}
