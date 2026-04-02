import Link from "next/link";
import { requirePlatformAdmin } from "@/lib/admin/auth-guard";
import { getAdminConnectionDetail } from "@/services/admin/admin-integration.service";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import AdminKeyValueList from "@/components/admin/AdminKeyValueList";
import StatusBadge from "@/components/admin/StatusBadge";
import ConnectionCredentialTable from "@/components/admin/ConnectionCredentialTable";
import ConnectionActionLogTable from "@/components/admin/ConnectionActionLogTable";
import ConnectionStatusChangeForm from "@/components/admin/ConnectionStatusChangeForm";
import RotateCredentialButton from "@/components/admin/RotateCredentialButton";

interface PageProps {
  params: Promise<{ connectionId: string }>;
}

export default async function AdminConnectionDetailPage({ params }: PageProps) {
  await requirePlatformAdmin();
  const { connectionId } = await params;
  const conn = await getAdminConnectionDetail(connectionId);

  return (
    <div>
      <div className="mb-2">
        <Link href="/admin/integrations" className="text-xs text-gray-400 hover:underline">
          ← Back to Integrations
        </Link>
      </div>

      <AdminPageHeader
        title={`${conn.provider} — ${conn.storeName}`}
        description={conn.displayName ?? conn.externalStoreName ?? conn.id}
      />

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Status</div>
          <StatusBadge value={conn.status} />
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Type</div>
          <span className="font-mono text-xs text-gray-700">{conn.type}</span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Active Credentials</div>
          <span className="text-sm font-semibold text-gray-900">
            {conn.credentials.filter((c) => c.isActive).length}
          </span>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-400 mb-1">Recent Action Logs</div>
          <span className="text-sm font-semibold text-gray-900">{conn.recentActionLogs.length}</span>
        </div>
      </div>

      {/* Basic Info */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Basic Information</h2>
        <AdminKeyValueList
          items={[
            { label: "ID", value: <span className="font-mono text-xs">{conn.id}</span> },
            {
              label: "Tenant",
              value: (
                <Link href={`/admin/tenants/${conn.tenantId}`} className="text-blue-600 hover:underline">
                  {conn.tenantDisplayName}
                </Link>
              ),
            },
            {
              label: "Store",
              value: (
                <Link href={`/admin/stores/${conn.storeId}`} className="text-blue-600 hover:underline">
                  {conn.storeName}
                </Link>
              ),
            },
            { label: "Provider", value: <span className="font-mono text-xs">{conn.provider}</span> },
            { label: "Type", value: <span className="font-mono text-xs">{conn.type}</span> },
            { label: "Status", value: <StatusBadge value={conn.status} /> },
            ...(conn.authScheme
              ? [{ label: "Auth Scheme", value: <span className="font-mono text-xs">{conn.authScheme}</span> }]
              : []),
            ...(conn.externalMerchantId
              ? [{ label: "External Merchant ID", value: <span className="font-mono text-xs">{conn.externalMerchantId}</span> }]
              : []),
            ...(conn.externalStoreId
              ? [{ label: "External Store ID", value: <span className="font-mono text-xs">{conn.externalStoreId}</span> }]
              : []),
            ...(conn.externalStoreName
              ? [{ label: "External Store Name", value: conn.externalStoreName }]
              : []),
            ...(conn.externalLocationId
              ? [{ label: "External Location ID", value: <span className="font-mono text-xs">{conn.externalLocationId}</span> }]
              : []),
            {
              label: "Last Connected",
              value: conn.lastConnectedAt ? conn.lastConnectedAt.toLocaleString("en-US") : "—",
            },
            {
              label: "Last Auth Validated",
              value: conn.lastAuthValidatedAt ? conn.lastAuthValidatedAt.toLocaleString("en-US") : "—",
            },
            {
              label: "Last Synced",
              value: conn.lastSyncAt ? conn.lastSyncAt.toLocaleString("en-US") : "—",
            },
            ...(conn.lastSyncStatus
              ? [{ label: "Sync Status", value: <StatusBadge value={conn.lastSyncStatus} /> }]
              : []),
            ...(conn.lastErrorCode
              ? [
                  { label: "Last Error Code", value: <span className="font-mono text-xs text-red-600">{conn.lastErrorCode}</span> },
                  { label: "Last Error Message", value: <span className="text-xs text-red-600">{conn.lastErrorMessage}</span> },
                ]
              : []),
            ...(conn.reauthRequiredAt
              ? [
                  {
                    label: "Reauth Requested At",
                    value: <span className="text-amber-600">{conn.reauthRequiredAt.toLocaleString("en-US")}</span>,
                  },
                ]
              : []),
            ...(conn.disconnectedAt
              ? [{ label: "Disconnected At", value: conn.disconnectedAt.toLocaleString("en-US") }]
              : []),
            { label: "Created At", value: conn.createdAt.toLocaleString("en-US") },
            { label: "Updated At", value: conn.updatedAt.toLocaleString("en-US") },
          ]}
        />
      </div>

      {/* Status Change */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Change Connection Status</h2>
        <p className="text-xs text-gray-500 mb-3">
          Manually override the connection status as an admin. All changes are recorded in the audit log.
        </p>
        <ConnectionStatusChangeForm
          connectionId={conn.id}
          currentStatus={conn.status}
        />
      </div>

      {/* Credential Rotation */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Rotate Credentials</h2>
        <p className="text-xs text-gray-500 mb-3">
          Deactivates the current active credentials and sets the connection status to REAUTH_REQUIRED.
          The tenant will need to re-authenticate. This action cannot be undone.
        </p>
        <RotateCredentialButton connectionId={conn.id} />
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Credentials ({conn.credentials.length})
        </h2>
        <ConnectionCredentialTable credentials={conn.credentials} />
      </div>

      {/* Recent Action Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">
          Recent Action Logs (up to 30)
        </h2>
        <ConnectionActionLogTable items={conn.recentActionLogs} />
      </div>

      {/* Log Links */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">All Logs</h2>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={`/admin/logs?storeId=${conn.storeId}&logType=CONNECTION_ACTION`}
            className="text-blue-600 hover:underline"
          >
            📋 All Connection Logs for This Store →
          </Link>
          <Link
            href={`/admin/logs?storeId=${conn.storeId}&logType=WEBHOOK`}
            className="text-blue-600 hover:underline"
          >
            Webhook Logs →
          </Link>
          <Link
            href={`/admin/jobs?storeId=${conn.storeId}&provider=${conn.provider}`}
            className="text-blue-600 hover:underline"
          >
            Jobs Console →
          </Link>
        </div>
      </div>
    </div>
  );
}
