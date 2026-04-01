import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminJobRuns } from "@/services/admin/admin-job.service";
import { parseAdminJobFilters } from "@/lib/admin/jobs/filters";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminJobTable from "@/components/admin/jobs/AdminJobTable";
import AdminJobFilters from "@/components/admin/jobs/AdminJobFilters";
import AdminManualJobActions from "@/components/admin/jobs/AdminManualJobActions";
import type { AdminJobFilterParams } from "@/types/admin-jobs";

interface PageProps {
  searchParams: Promise<AdminJobFilterParams>;
}

export default async function AdminJobsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const rawParams = await searchParams;
  const filters = parseAdminJobFilters(rawParams);

  const { items, pagination } = await listAdminJobRuns(filters);

  const hasFilters = !!(
    rawParams.jobType ||
    rawParams.status ||
    rawParams.tenantId ||
    rawParams.storeId ||
    rawParams.provider ||
    rawParams.triggerSource ||
    rawParams.failedOnly
  );

  return (
    <div>
      <AdminPageHeader
        title="Jobs Console"
        description="플랫폼 작업 실행 기록을 조회하고 안전한 작업을 수동으로 실행합니다."
      />

      {/* Manual Run actions */}
      <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-700">Safe Manual Actions</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              PLATFORM_ADMIN 전용. impersonation 중에는 실행 불가. 모든 실행은 audit log 에 기록됩니다.
            </p>
          </div>
          <Suspense>
            <AdminManualJobActions />
          </Suspense>
        </div>
      </div>

      {/* Filters */}
      <Suspense>
        <AdminJobFilters current={rawParams} />
      </Suspense>

      {/* Table */}
      <AdminJobTable items={items} hasFilters={hasFilters} />

      {/* Pagination */}
      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
