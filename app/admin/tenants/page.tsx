import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminTenants } from "@/services/admin/admin-tenant.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminSearchInput from "@/components/admin/AdminSearchInput";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import TenantListTable from "@/components/admin/TenantListTable";
import TenantListActions from "@/components/admin/TenantListActions";

const TENANT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "체험" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}

export default async function AdminTenantsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listAdminTenants({
    q: params.q,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.q || params.status);

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-4">
        <AdminPageHeader title="Tenant" description="All tenants registered on the platform." />
        <div className="shrink-0 pt-1">
          <TenantListActions />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Suspense>
          <AdminSearchInput placeholder="Search by name or slug..." />
        </Suspense>
        <Suspense>
          <AdminStatusFilter options={TENANT_STATUS_OPTIONS} allLabel="All Statuses" />
        </Suspense>
      </div>

      <TenantListTable
        items={items}
        emptyMessage={hasFilter ? "Search 조에 맞는 Tenant가 없습니다." : "Tenant가 없습니다."}
      />

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
