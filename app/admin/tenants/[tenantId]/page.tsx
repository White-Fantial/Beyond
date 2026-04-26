import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminTenantDetail } from "@/services/admin/admin-tenant.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminStatusChangeForm from "@/components/admin/AdminStatusChangeForm";
import ConnectionSummaryTable from "@/components/admin/ConnectionSummaryTable";
import TenantDetailActions from "@/components/admin/TenantDetailActions";
import MembershipEditButton from "@/components/admin/MembershipEditButton";

const TENANT_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "TRIAL", label: "체험" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  params: Promise<{ tenantId: string }>;
}

export default async function AdminTenantDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { tenantId } = await params;
  const tenant = await getAdminTenantDetail(tenantId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/tenants" className="text-xs text-gray-400 hover:underline">
          ← Tenant 목록
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader title={tenant.displayName} description={`Slug: ${tenant.slug}`} />
        <div className="shrink-0 pt-1">
          <TenantDetailActions
            tenant={{
              id: tenant.id,
              legalName: tenant.legalName,
              displayName: tenant.displayName,
              timezone: tenant.timezone,
              currency: tenant.currency,
              countryCode: tenant.countryCode,
              type: tenant.type,
              status: tenant.status,
            }}
          />
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <AdminStatCard label="Stores" value={tenant.storeCount} />
        <AdminStatCard label="Memberships" value={tenant.membershipCount} />
        <AdminStatCard label="Users" value={tenant.userCount} />
        <AdminStatCard label="Connections" value={tenant.connectionCount} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic Info</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{tenant.id}</span> },
            { label: "Legal Name", value: tenant.legalName },
            { label: "Display Name", value: tenant.displayName },
            { label: "Type", value: tenant.type },
            { label: "슬러그", value: <span className="font-mono text-xs">{tenant.slug}</span> },
            { label: "Status", value: <StatusBadge value={tenant.status} /> },
            { label: "Time대", value: tenant.timezone },
            { label: "Currency", value: tenant.currency },
            { label: "Country Code", value: tenant.countryCode },
            { label: "Created", value: tenant.createdAt.toLocaleString("en-US") },
            { label: "Edit일", value: tenant.updatedAt.toLocaleString("en-US") },
          ]}
        />
      </div>

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Change Status</h2>
        <AdminStatusChangeForm
          entityType="tenants"
          entityId={tenant.id}
          currentStatus={tenant.status}
          options={TENANT_STATUS_OPTIONS}
        />
      </div>

      {/* Stores */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Stores ({tenant.storeCount})</h2>
        {tenant.stores.length === 0 ? (
          <p className="text-sm text-gray-400">No stores found.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Store Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Code</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Timezone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tenant.stores.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{s.code}</td>
                    <td className="px-4 py-3"><StatusBadge value={s.status} /></td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{s.timezone}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden lg:table-cell">
                      {s.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/stores/${s.id}`} className="text-xs text-blue-600 hover:underline whitespace-nowrap">
                        상세 →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Memberships ({tenant.membershipCount})</h2>
        {tenant.memberships.length === 0 ? (
          <p className="text-sm text-gray-400">No memberships.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {tenant.memberships.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/admin/users/${m.userId}`} className="text-blue-600 hover:underline">
                        {m.userName}
                      </Link>
                      <div className="text-xs text-gray-400">{m.userEmail}</div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge value={m.role} /></td>
                    <td className="px-4 py-3"><StatusBadge value={m.status} /></td>
                    <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {m.joinedAt ? m.joinedAt.toLocaleDateString("ko-KR") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <MembershipEditButton
                        membershipId={m.id}
                        currentRole={m.role}
                        currentStatus={m.status}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Connection Summary */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Connection Summary</h2>
        <ConnectionSummaryTable rows={tenant.connectionSummary} />
      </div>

      {/* Log Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Logs</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/logs?tenantId=${tenantId}`}
            className="text-blue-600 hover:underline"
          >
            📋 이 Tenant의 All 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=AUDIT`}
            className="text-blue-600 hover:underline"
          >
            Audit 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=CONNECTION_ACTION`}
            className="text-blue-600 hover:underline"
          >
            Connection 로그 →
          </Link>
          <Link
            href={`/admin/logs?tenantId=${tenantId}&logType=WEBHOOK`}
            className="text-blue-600 hover:underline"
          >
            Webhook 로그 →
          </Link>
        </div>
      </div>
    </div>
  );
}
