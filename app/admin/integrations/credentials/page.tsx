import { Suspense } from "react";
import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { listProviderAppCredentials } from "@/services/admin/admin-provider-credentials.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatusFilter from "@/components/admin/AdminStatusFilter";
import AdminPagination from "@/components/admin/AdminPagination";
import ProviderAppCredentialTable from "@/components/admin/ProviderAppCredentialTable";

const PROVIDER_OPTIONS = [
  { value: "LOYVERSE", label: "Loyverse" },
  { value: "LIGHTSPEED", label: "Lightspeed" },
  { value: "UBER_EATS", label: "Uber Eats" },
  { value: "DOORDASH", label: "DoorDash" },
  { value: "STRIPE", label: "Stripe" },
  { value: "OTHER", label: "Other" },
];

const ENVIRONMENT_OPTIONS = [
  { value: "PRODUCTION", label: "Production" },
  { value: "SANDBOX", label: "Sandbox" },
];

const ACTIVE_OPTIONS = [
  { value: "true", label: "Active" },
  { value: "false", label: "Inactive" },
];

interface PageProps {
  searchParams: Promise<{
    provider?: string;
    environment?: string;
    isActive?: string;
    page?: string;
  }>;
}

export default async function ProviderAppCredentialsPage({ searchParams }: PageProps) {
  await requirePlatformAdmin();
  const params = await searchParams;

  const { items, pagination } = await listProviderAppCredentials({
    provider: params.provider,
    environment: params.environment,
    isActive: params.isActive,
    page: params.page ? Number(params.page) : 1,
  });

  const hasFilter = !!(params.provider || params.environment || params.isActive);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <AdminPageHeader
          title="Provider App Credentials"
          description="Manage the OAuth / API app credentials used by the integration engine."
        />
        <Link
          href="/admin/integrations/credentials/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors shrink-0"
        >
          + New Credential
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4 flex-wrap">
        <Suspense>
          <AdminStatusFilter
            options={PROVIDER_OPTIONS}
            allLabel="All Providers"
            paramName="provider"
          />
        </Suspense>
        <Suspense>
          <AdminStatusFilter
            options={ENVIRONMENT_OPTIONS}
            allLabel="All Environments"
            paramName="environment"
          />
        </Suspense>
        <Suspense>
          <AdminStatusFilter
            options={ACTIVE_OPTIONS}
            allLabel="All Statuses"
            paramName="isActive"
          />
        </Suspense>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <ProviderAppCredentialTable
          items={items}
          emptyMessage={
            hasFilter
              ? "No credentials match the selected filters."
              : "No provider app credentials configured yet."
          }
        />
      </div>

      <div className="mt-4">
        <Suspense>
          <AdminPagination pagination={pagination} />
        </Suspense>
      </div>
    </div>
  );
}
