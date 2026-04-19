import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminStoreDetail } from "@/services/admin/admin-store.service";
import { listActiveTenantMembershipsForDropdown } from "@/services/admin/admin-membership.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminStatCard from "@/components/admin/AdminStatCard";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import AdminStatusChangeForm from "@/components/admin/AdminStatusChangeForm";
import StoreConnectionTable from "@/components/admin/StoreConnectionTable";
import StoreDetailActions from "@/components/admin/StoreDetailActions";
import StoreMembershipEditButton from "@/components/admin/StoreMembershipEditButton";

const STORE_STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "ARCHIVED", label: "보관" },
];

interface PageProps {
  params: { storeId: string };
}

export default async function AdminStoreDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { storeId } = params;
  const store = await getAdminStoreDetail(storeId);
  const tenantMemberships = await listActiveTenantMembershipsForDropdown(store.tenantId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/stores" className="text-xs text-gray-400 hover:underline">
          ← Store 목록
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <AdminPageHeader title={store.name} description={`Code: ${store.code}`} />
        <div className="shrink-0 pt-1">
          <StoreDetailActions
            store={{
              id: store.id,
              name: store.name,
              displayName: store.displayName,
              timezone: store.timezone,
              currency: store.currency,
              countryCode: store.countryCode,
              status: store.status,
            }}
            tenantMemberships={tenantMemberships}
          />
        </div>
      </div>

      {/* Summary KPI */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <AdminStatCard label="Memberships" value={store.membershipCount} />
        <AdminStatCard label="Connections" value={store.connectionCount} />
        <AdminStatCard label="Active Connections" value={store.activeConnectionCount} />
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic Info</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{store.id}</span> },
            {
              label: "Tenant",
              value: (
                <Link href={`/admin/tenants/${store.tenantId}`} className="text-blue-600 hover:underline">
                  {store.tenantDisplayName}
                </Link>
              ),
            },
            { label: "Store Name", value: store.name },
            { label: "Display Name", value: store.displayName },
            { label: "Code", value: <span className="font-mono text-xs">{store.code}</span> },
            { label: "Status", value: <StatusBadge value={store.status} /> },
            { label: "Time대", value: store.timezone },
            { label: "Currency", value: store.currency },
            { label: "Country Code", value: store.countryCode },
            { label: "Created", value: store.createdAt.toLocaleString("en-US") },
            { label: "Edit일", value: store.updatedAt.toLocaleString("en-US") },
          ]}
        />
      </div>

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Change Status</h2>
        <AdminStatusChangeForm
          entityType="stores"
          entityId={store.id}
          currentStatus={store.status}
          options={STORE_STATUS_OPTIONS}
        />
      </div>

      {/* Store Memberships */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Store 멤버십 ({store.membershipCount})
        </h2>
        {store.memberships.length === 0 ? (
          <p className="text-sm text-gray-400">No memberships.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">User</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Role</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 hidden md:table-cell">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {store.memberships.map((m) => (
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
                      {m.createdAt.toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <StoreMembershipEditButton
                        storeMembershipId={m.id}
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

      {/* Connections */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          연결 ({store.connectionCount})
        </h2>
        <StoreConnectionTable connections={store.connections} />
      </div>

      {/* Log Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Logs</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/logs?storeId=${storeId}`}
            className="text-blue-600 hover:underline"
          >
            📋 이 Store의 All 로그 →
          </Link>
          <Link
            href={`/admin/logs?storeId=${storeId}&logType=CONNECTION_ACTION`}
            className="text-blue-600 hover:underline"
          >
            Connection 로그 →
          </Link>
          <Link
            href={`/admin/logs?storeId=${storeId}&logType=WEBHOOK`}
            className="text-blue-600 hover:underline"
          >
            Webhook 로그 →
          </Link>
          <Link
            href={`/admin/logs?storeId=${storeId}&logType=ORDER_EVENT`}
            className="text-blue-600 hover:underline"
          >
            Order Event 로그 →
          </Link>
        </div>
      </div>
    </div>
  );
}
