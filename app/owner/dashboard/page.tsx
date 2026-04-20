import { requireOwnerPortalAccess } from "@/lib/owner/auth-guard";
import { getOwnerDashboardSummary } from "@/services/owner/owner-dashboard.service";

function ConnectionStatusBadge({ status }: { status: "CONNECTED" | "ERROR" | "NOT_CONNECTED" }) {
  const styles = {
    CONNECTED: "bg-green-100 text-green-700",
    ERROR: "bg-red-100 text-red-700",
    NOT_CONNECTED: "bg-gray-100 text-gray-500",
  };
  const labels = {
    CONNECTED: "Connected",
    ERROR: "Error",
    NOT_CONNECTED: "Not Connected",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function OwnerDashboardPage() {
  const ctx = await requireOwnerPortalAccess();

  const primaryTenantId = ctx.tenantMemberships[0]?.tenantId ?? "";
  const summary = primaryTenantId
    ? await getOwnerDashboardSummary(primaryTenantId)
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Owner Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">Get a quick overview of your store operations.</p>
      </div>

      {/* Sales KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <KpiCard label="Today's Revenue" value={`$${(summary?.todaySales ?? 0).toLocaleString("en-US")}`} sub="Today Sales" />
        <KpiCard label="This Week's Revenue" value={`$${(summary?.thisWeekSales ?? 0).toLocaleString("en-US")}`} sub="This Week Sales" />
        <KpiCard label="Today's Orders" value={summary?.ordersToday ?? 0} sub="Orders Today" />
        <KpiCard label="Sold Out Items" value={summary?.soldOutItemsCount ?? 0} sub="Sold Out Items" />
      </div>

      {/* Connection Status */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Integration Status</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">POS Integration</span>
            <ConnectionStatusBadge status={summary?.posConnectionStatus ?? "NOT_CONNECTED"} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Delivery Integration</span>
            <ConnectionStatusBadge status={summary?.deliveryConnectionStatus ?? "NOT_CONNECTED"} />
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs text-gray-500">Payment Integration</span>
            <ConnectionStatusBadge status={summary?.paymentConnectionStatus ?? "NOT_CONNECTED"} />
          </div>
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Logs</h2>
        {summary?.recentLogs.length ? (
          <ul className="divide-y divide-gray-100">
            {summary.recentLogs.map((log) => (
              <li key={log.id} className="py-2 flex items-start gap-3">
                <span
                  className={`mt-0.5 inline-flex shrink-0 w-2 h-2 rounded-full ${
                    log.level === "ERROR"
                      ? "bg-red-500"
                      : log.level === "WARN"
                      ? "bg-yellow-400"
                      : "bg-green-400"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-700 truncate">{log.message}</p>
                  <p className="text-xs text-gray-400">{new Date(log.occurredAt).toLocaleString("en-US")}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">No recent logs.</p>
        )}
      </div>
    </div>
  );
}
