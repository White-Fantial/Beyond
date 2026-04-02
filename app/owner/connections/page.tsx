import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getOwnerConnections } from "@/services/owner/owner-connections.service";

const STATUS_STYLES: Record<string, string> = {
  CONNECTED: "bg-green-100 text-green-700",
  CONNECTING: "bg-yellow-100 text-yellow-700",
  ERROR: "bg-red-100 text-red-700",
  REAUTH_REQUIRED: "bg-orange-100 text-orange-700",
  NOT_CONNECTED: "bg-gray-100 text-gray-500",
  DISCONNECTED: "bg-gray-100 text-gray-400",
};

const TYPE_LABELS: Record<string, string> = {
  POS: "POS",
  DELIVERY: "Delivery",
  PAYMENT: "Payment",
};

export default async function OwnerConnectionsPage() {
  const ctx = await requireOwnerPortalAccess();

  const tenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const connections = tenantId ? await getOwnerConnections(tenantId) : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Connections</h1>
        <p className="mt-1 text-sm text-gray-500">POS, delivery, and payment platform integration status.</p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {connections.length === 0 ? (
          <div className="p-8 text-center text-gray-400 text-sm">No platforms connected.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Provider</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Token Expiry</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Last Sync</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Store</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {connections.map((conn) => (
                <tr key={conn.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{conn.name}</td>
                  <td className="px-4 py-3 text-gray-600">{conn.provider}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                      {TYPE_LABELS[conn.type] ?? conn.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        STATUS_STYLES[conn.status] ?? "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {conn.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {conn.expiresAt
                      ? new Date(conn.expiresAt).toLocaleDateString("ko-KR")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {conn.lastSync
                      ? new Date(conn.lastSync).toLocaleString("en-US")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{conn.storeName}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
