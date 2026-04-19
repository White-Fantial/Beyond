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
  { value: "ACTIVE", label: "Active" },
  { value: "INVITED", label: "Invited" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  searchParams: { q?: string; status?: string; page?: string };
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = searchParams;

  const { items, pagination } = await listAdminUsers({
    q: params.q,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.q || params.status);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <AdminPageHeader title="Users" description="All users registered on the platform." />
        <div className="shrink-0 pt-1">
          <UserListActions />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Suspense>
          <AdminSearchInput placeholder="Search by name or email..." />
        </Suspense>
        <Suspense>
          <AdminStatusFilter options={USER_STATUS_OPTIONS} allLabel="All Statuses" />
        </Suspense>
      </div>

      <UserListTable
        items={items}
        emptyMessage={hasFilter ? "Search 조에 맞는 User가 없습니다." : "User가 없습니다."}
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
