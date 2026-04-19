import { Suspense } from "react";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listAdminConnections } from "@/services/admin/admin-integration.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import AllConnectionsTable from "@/components/admin/AllConnectionsTable";

const CONNECTION_STATUS_OPTIONS = [
  { value: "CONNECTED", label: "Connected" },
  { value: "NOT_CONNECTED", label: "Not Connected" },
  { value: "CONNECTING", label: "Connecting" },
  { value: "ERROR", label: "Error" },
  { value: "REAUTH_REQUIRED", label: "Reauth Required" },
  { value: "DISCONNECTED", label: "Disconnected" },
];

const PROVIDER_OPTIONS = [
  { value: "LOYVERSE", label: "Loyverse" },
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
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
        title="Integration Management"
        description="View platform-wide connection status."
      />

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Suspense>
          <AdminStatusFilter
            options={CONNECTION_STATUS_OPTIONS}
            allLabel="All Statuses"
            paramName="status"
          />
        </Suspense>
        <Suspense>
          <AdminStatusFilter
            options={PROVIDER_OPTIONS}
            allLabel="All Providers"
            paramName="provider"
          />
        </Suspense>
      </div>

      <AllConnectionsTable
        items={items}
        emptyMessage={
          hasFilter
            ? "No connections match the selected filters."
            : "No connection data available."
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
