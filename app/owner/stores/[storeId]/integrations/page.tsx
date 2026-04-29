import { requireStorePermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/constants";
import {
  listStoreConnections,
  getConnectionActionLogs,
} from "@/services/integration.service";
import ConnectButton from "./ConnectButton";
import DisconnectButton from "./DisconnectButton";
import type { ConnectionSummary } from "@/domains/integration/types";

interface PageProps {
  params: Promise<{ storeId: string }>;
  searchParams: Promise<{ connected?: string | string[]; error?: string | string[]; provider?: string | string[] }>;
}

function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

// ─── Provider definitions displayed in the UI ─────────────────────────────────

const PROVIDERS = [
  {
    provider: "LOYVERSE" as const,
    connectionType: "POS" as const,
    label: "Loyverse POS",
    description: "Sync menus, inventory, and orders with Loyverse POS.",
    logo: "🟢",
  },
  {
    provider: "LIGHTSPEED" as const,
    connectionType: "POS" as const,
    label: "Lightspeed",
    description: "Sync menus, inventory, and orders with Lightspeed POS.",
    logo: "⚡",
  },
  {
    provider: "UBER_EATS" as const,
    connectionType: "DELIVERY" as const,
    label: "Uber Eats",
    description: "Receive Uber Eats orders in real time and sync your menu.",
    logo: "🟤",
  },
  {
    provider: "DOORDASH" as const,
    connectionType: "DELIVERY" as const,
    label: "DoorDash",
    description: "Receive DoorDash orders in real time and sync your menu.",
    logo: "🔴",
  },
];

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    CONNECTED: { label: "Connected", className: "bg-green-100 text-green-800" },
    CONNECTING: { label: "Connecting", className: "bg-yellow-100 text-yellow-800" },
    NOT_CONNECTED: { label: "Not Connected", className: "bg-gray-100 text-gray-600" },
    DISCONNECTED: { label: "Disconnected", className: "bg-gray-100 text-gray-600" },
    ERROR: { label: "Error", className: "bg-red-100 text-red-800" },
    REAUTH_REQUIRED: { label: "Reauth Required", className: "bg-orange-100 text-orange-800" },
  };
  const badge = map[status] ?? { label: status, className: "bg-gray-100 text-gray-600" };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badge.className}`}
    >
      {badge.label}
    </span>
  );
}

// ─── Connection card ───────────────────────────────────────────────────────────

function ConnectionCard({
  storeId,
  providerDef,
  connection,
}: {
  storeId: string;
  providerDef: (typeof PROVIDERS)[number];
  connection: ConnectionSummary | null;
}) {
  const isConnected =
    connection?.status === "CONNECTED" || connection?.status === "REAUTH_REQUIRED";
  const status = connection?.status ?? "NOT_CONNECTED";

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{providerDef.logo}</span>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">{providerDef.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{providerDef.description}</p>
          </div>
        </div>
        <StatusBadge status={status} />
      </div>

      {isConnected && connection && (
        <div className="text-xs text-gray-500 space-y-1 border-t pt-3">
          {connection.externalStoreName && (
            <p>
              <span className="font-medium">External store name:</span>{" "}
              {connection.externalStoreName}
            </p>
          )}
          {connection.externalMerchantId && (
            <p>
              <span className="font-medium">Merchant ID:</span>{" "}
              {connection.externalMerchantId}
            </p>
          )}
          {connection.lastConnectedAt && (
            <p>
              <span className="font-medium">Connected:</span>{" "}
              {new Date(connection.lastConnectedAt).toLocaleString("en-US")}
            </p>
          )}
          {connection.lastAuthValidatedAt && (
            <p>
              <span className="font-medium">Last auth:</span>{" "}
              {new Date(connection.lastAuthValidatedAt).toLocaleString("en-US")}
            </p>
          )}
          {connection.lastErrorMessage && (
            <p className="text-red-600">
              <span className="font-medium">Error:</span> {connection.lastErrorMessage}
            </p>
          )}
          {connection.reauthRequired && (
            <p className="text-orange-600 font-medium">Re-authentication required.</p>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        {!isConnected ? (
          <ConnectButton
            storeId={storeId}
            provider={providerDef.provider}
            connectionType={providerDef.connectionType}
            label={`Connect ${providerDef.label}`}
          />
        ) : (
          <>
            {connection?.reauthRequired && (
              <ConnectButton
                storeId={storeId}
                provider={providerDef.provider}
                connectionType={providerDef.connectionType}
                label="Re-authenticate"
              />
            )}
            <DisconnectButton
              storeId={storeId}
              provider={providerDef.provider}
              connectionType={providerDef.connectionType}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function StoreIntegrationsPage({ params, searchParams }: PageProps) {
  const { storeId } = await params;
  const query = await searchParams;
  const connected = firstParam(query.connected);
  const error = firstParam(query.error);
  const provider = firstParam(query.provider);

  const ctx = await requireStorePermission(storeId, PERMISSIONS.INTEGRATIONS);
  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";

  const [connections, actionLogs] = await Promise.all([
    listStoreConnections(tenantId, storeId),
    getConnectionActionLogs(tenantId, storeId, 10),
  ]);

  const connectionByProviderType = new Map(
    connections.map((c) => [`${c.provider}:${c.type}`, c])
  );

  return (
    <div className="max-w-3xl mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Store Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect this store to external POS systems or delivery platforms.
        </p>
      </div>

      {/* Success / error banner */}
      {connected === "1" && (
        <div className="rounded-md bg-green-50 border border-green-200 p-4 text-sm text-green-800">
          ✅ {provider ? `${provider} ` : ""}integration connected successfully.
        </div>
      )}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-4 text-sm text-red-800">
          ❌ Integration failed: {error}
        </div>
      )}

      {/* Provider cards */}
      <div className="grid gap-4">
        {PROVIDERS.map((providerDef) => {
          const key = `${providerDef.provider}:${providerDef.connectionType}`;
          const connection = connectionByProviderType.get(key) ?? null;
          return (
            <ConnectionCard
              key={key}
              storeId={storeId}
              providerDef={providerDef}
              connection={connection}
            />
          );
        })}
      </div>

      {/* Recent action log */}
      {actionLogs.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Integration History</h2>
          <div className="border border-gray-200 rounded-md divide-y divide-gray-100 text-xs">
            {actionLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                <span
                  className={`mt-0.5 inline-block w-2 h-2 rounded-full flex-shrink-0 ${
                    log.status === "SUCCESS"
                      ? "bg-green-500"
                      : log.status === "FAILURE"
                      ? "bg-red-500"
                      : "bg-yellow-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-gray-800">
                    <span className="font-medium">{log.provider}</span>{" "}
                    <span className="text-gray-500">{log.actionType}</span>
                    {log.message ? ` — ${log.message}` : ""}
                  </p>
                  {log.errorCode && (
                    <p className="text-red-600">Error: {log.errorCode}</p>
                  )}
                </div>
                <span className="text-gray-400 flex-shrink-0">
                  {new Date(log.createdAt).toLocaleString("en-US", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
