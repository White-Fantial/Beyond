import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminUsers } from "@/services/admin/admin-user.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import UserListTable from "@/components/admin/UserListTable";
import UserListActions from "@/components/admin/UserListActions";

const USER_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "활성" },
  { value: "INVITED", label: "초대됨" },
  { value: "SUSPENDED", label: "정지" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminUsers({
    q: params.q,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.q || params.status);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <AdminPageHeader title="사용자" description="플랫폼에 등록된 전체 사용자 목록입니다." />
        <div className="shrink-0 pt-1">
          <UserListActions />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Suspense>
          <AdminSearchInput placeholder="이름 또는 이메일 검색..." />
        </Suspense>
        <Suspense>
          <AdminStatusFilter options={USER_STATUS_OPTIONS} allLabel="모든 상태" />
        </Suspense>
      </div>

      <UserListTable
        items={items}
        emptyMessage={hasFilter ? "검색 조건에 맞는 사용자가 없습니다." : "사용자가 없습니다."}
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
