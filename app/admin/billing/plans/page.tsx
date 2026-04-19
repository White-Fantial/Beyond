import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminPlans } from "@/services/admin/admin-plan.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminPlanTable from "@/components/admin/billing/AdminPlanTable";
import AdminPagination from "@/components/admin/AdminPagination";

interface PageProps {
  searchParams: { status?: string; page?: string };
}

const PLAN_STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "Archived" },
];

export default async function AdminBillingPlansPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = searchParams;

  const result = await listAdminPlans({
    status: params.status,
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  });

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader title="Plan Management" description="Manage SaaS pricing plans." />
        <div className="shrink-0 pt-1">
          <Link
            href="/admin/billing/plans/new"
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            + Create Plan
          </Link>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {PLAN_STATUS_OPTIONS.map((opt) => (
          <Link
            key={opt.value}
            href={opt.value ? `/admin/billing/plans?status=${opt.value}` : "/admin/billing/plans"}
            className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
              (params.status ?? "") === opt.value
                ? "bg-gray-900 text-white border-gray-900"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <AdminPlanTable plans={result.items} />
      </div>

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={result.pagination} />
        </Suspense>
      </div>
    </div>
  );
}
