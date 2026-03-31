import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminConnections } from "@/services/admin/admin-integration.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import AllConnectionsTable from "@/components/admin/AllConnectionsTable";

const CONNECTION_STATUS_OPTIONS = [
  { value: "CONNECTED", label: "연결됨" },
  { value: "NOT_CONNECTED", label: "미연결" },
  { value: "CONNECTING", label: "연결 중" },
  { value: "ERROR", label: "오류" },
  { value: "REAUTH_REQUIRED", label: "재인증 필요" },
  { value: "DISCONNECTED", label: "연결 해제" },
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

export default async function AdminIntegrationsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminConnections({
    status: params.status,
    provider: params.provider,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.status || params.provider);

  return (
    <div>
      <AdminPageHeader
        title="연동 관리"
        description="플랫폼 전체 연결 현황을 확인합니다."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Suspense>
          <AdminStatusFilter
            options={CONNECTION_STATUS_OPTIONS}
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

      <AllConnectionsTable
        items={items}
        emptyMessage={
          hasFilter
            ? "검색 조건에 맞는 연결이 없습니다."
            : "연결 데이터가 없습니다."
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
