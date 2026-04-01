import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminStores } from "@/services/admin/admin-store.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import StoreListTable from "@/components/admin/StoreListTable";
import StoreListActions from "@/components/admin/StoreListActions";

const STORE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "활성" },
  { value: "INACTIVE", label: "비활성" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminStoresPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminStores({
    q: params.q,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.q || params.status);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <AdminPageHeader title="매장" description="플랫폼에 등록된 전체 매장 목록입니다." />
        <div className="shrink-0 pt-1">
          <StoreListActions />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Suspense>
          <AdminSearchInput placeholder="매장명, 코드, 테넌트명 검색..." />
        </Suspense>
        <Suspense>
          <AdminStatusFilter options={STORE_STATUS_OPTIONS} allLabel="모든 상태" />
        </Suspense>
      </div>

      <StoreListTable
        items={items}
        emptyMessage={hasFilter ? "검색 조건에 맞는 매장이 없습니다." : "매장이 없습니다."}
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
