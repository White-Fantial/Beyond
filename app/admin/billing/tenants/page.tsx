import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminTenantBillings } from "@/services/admin/admin-subscription.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminTenantBillingTable from "@/components/admin/billing/AdminTenantBillingTable";
import AdminPagination from "@/components/admin/AdminPagination";
import AdminSearchInput from "@/components/admin/AdminSearchInput";

interface PageProps {
  searchParams: {
    q?: string;
    status?: string;
    trialOnly?: string;
    pastDueOnly?: string;
    page?: string;
  };
}

const STATUS_OPTIONS = [
  { value: "", label: "All Statuses" },
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "Trial" },
  { value: "PAST_DUE", label: "Past Due" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "CANCELLED", label: "Cancelled" },
];

export default async function AdminBillingTenantsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = searchParams;

  const result = await listAdminTenantBillings({
    q: params.q,
    status: params.status,
    trialOnly: params.trialOnly === "1",
    pastDueOnly: params.pastDueOnly === "1",
    page: params.page ? Number(params.page) : 1,
    pageSize: 20,
  });

  return (
    <div>
      <AdminPageHeader
        title="Tenant Billing"
        description="Subscription and payment status per tenant"
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Suspense>
          <AdminSearchInput placeholder="Search by tenant name or slug..." />
        </Suspense>
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <Link
              key={opt.value}
              href={
                opt.value
                  ? `/admin/billing/tenants?status=${opt.value}`
                  : "/admin/billing/tenants"
              }
              className={`px-2.5 py-1 text-xs rounded-lg border transition-colors ${
                (params.status ?? "") === opt.value
                  ? "bg-gray-900 text-white border-gray-900"
                  : "border-gray-300 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <AdminTenantBillingTable items={result.items} />
      </div>

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={result.pagination} />
        </Suspense>
      </div>
    </div>
  );
}
