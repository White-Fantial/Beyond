import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminConnectionActionLogs } from "@/services/admin/admin-logs.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import ConnectionActionLogTable from "@/components/admin/ConnectionActionLogTable";

const JOB_STATUS_OPTIONS = [
  { value: "SUCCESS", label: "성공" },
  { value: "FAILED", label: "실패" },
  { value: "PENDING", label: "대기 중" },
  { value: "IN_PROGRESS", label: "진행 중" },
];

const PROVIDER_OPTIONS = [
  { value: "LOYVERSE", label: "Loyverse" },
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "기타" },
];

interface PageProps {
  searchParams: Promise<{ status?: string; provider?: string; page?: string }>;
}

export default async function AdminJobsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminConnectionActionLogs({
    status: params.status,
    provider: params.provider,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.status || params.provider);

  return (
    <div>
      <AdminPageHeader
        title="연결 작업 로그"
        description="연동 연결 및 동기화 작업 이력을 조회합니다."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Suspense>
          <AdminStatusFilter
            options={JOB_STATUS_OPTIONS}
            allLabel="모든 상태"
            paramName="status"
          />
        </Suspense>
        <Suspense>
          <AdminStatusFilter
            options={PROVIDER_OPTIONS}
            allLabel="모든 공급자"
            paramName="provider"
          />
        </Suspense>
      </div>

      <ConnectionActionLogTable
        items={items}
        emptyMessage={
          hasFilter
            ? "조건에 맞는 작업 로그가 없습니다."
            : "작업 로그가 없습니다."
        }
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
