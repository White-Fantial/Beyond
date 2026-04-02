import { requireOwnerStoreAccess, resolveActorTenantId } from "@/services/owner/owner-authz.service";
import { getOwnerStoreDashboard } from "@/services/owner/owner-dashboard.service";

interface Props {
  params: { storeId: string };
}

function SummaryCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="text-2xl font-bold text-gray-900 mt-1">{value}</div>
      {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
    </div>
  );
}

function ChannelStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    CONNECTED: "bg-green-100 text-green-700",
    REAUTH_REQUIRED: "bg-orange-100 text-orange-700",
    ERROR: "bg-red-100 text-red-700",
    NOT_CONNECTED: "bg-gray-100 text-gray-500",
    DISCONNECTED: "bg-gray-100 text-gray-400",
  };
  const labels: Record<string, string> = {
    CONNECTED: "Connected",
    REAUTH_REQUIRED: "Reauth Required",
    ERROR: "Error",
    NOT_CONNECTED: "Not Connected",
    DISCONNECTED: "Disconnected",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatCurrency(minorUnit: number, currency: string) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(minorUnit / 100);
}

export default async function StoreDashboardPage({ params }: Props) {
  const { storeId } = params;
  const ctx = await requireOwnerStoreAccess(storeId);
  const tenantId = resolveActorTenantId(ctx, storeId);
  const dashboard = await getOwnerStoreDashboard(storeId, tenantId);

  return (
    <div className="max-w-5xl mx-auto px-4 pb-10 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard
          label="Today's Revenue"
          value={formatCurrency(dashboard.todaySalesMinorUnit, "NZD")}
          sub="Today Sales"
        />
        <SummaryCard label="Today's Orders" value={dashboard.todayOrderCount} sub="Today Orders" />
        <SummaryCard
          label="Completed Orders"
          value={dashboard.completedOrderCount}
          sub="Completed"
        />
        <SummaryCard
          label="Cancelled Orders"
          value={dashboard.cancelledOrderCount}
          sub="Cancelled"
        />
        <SummaryCard
          label="Sold Out Products"
          value={dashboard.soldOutProductCount}
          sub="Sold Out"
        />
        <SummaryCard
          label="Active Subscriptions"
          value={dashboard.activeSubscriptionCount}
          sub="Active Subscriptions"
        />
        <SummaryCard
          label="Connected Channels"
          value={`${dashboard.connectedChannelCount} / ${dashboard.totalChannelCount}`}
          sub="Connected Channels"
        />
        <SummaryCard
          label="Upcoming Subscription Orders"
          value={dashboard.upcomingSubscriptionOrderCount}
          sub="Next 7 Days"
        />
      </div>

      {/* Channel breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Revenue by Channel</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">Channel</th>
                <th className="text-right pb-2 font-medium">Today's Revenue</th>
                <th className="text-right pb-2 font-medium">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {dashboard.channelBreakdown.map((ch) => (
                <tr key={ch.channel}>
                  <td className="py-2 text-gray-700">{ch.channel}</td>
                  <td className="py-2 text-right text-gray-900">
                    {formatCurrency(ch.todayRevenueMinorUnit, "NZD")}
                  </td>
                  <td className="py-2 text-right text-gray-600">{ch.todayOrderCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-gray-400">
          * Real-time channel revenue will be available after analytics integration.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sold out products */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Currently Sold Out</h2>
            <a
              href={`/owner/stores/${storeId}/products?filter=sold_out`}
              className="text-xs text-brand-600 hover:underline"
            >
              View All
            </a>
          </div>
          {dashboard.soldOutProducts.length === 0 ? (
            <p className="text-sm text-gray-400">No sold-out products.</p>
          ) : (
            <ul className="space-y-1">
              {dashboard.soldOutProducts.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center gap-2 text-sm">
                  <span className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0" />
                  <span className="text-gray-700">{p.onlineName ?? p.name}</span>
                </li>
              ))}
              {dashboard.soldOutProducts.length > 5 && (
                <li className="text-xs text-gray-400">
                  and {dashboard.soldOutProducts.length - 5} more
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Upcoming subscription orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">Upcoming Subscription Orders</h2>
            <a
              href={`/owner/stores/${storeId}/subscriptions/upcoming`}
              className="text-xs text-brand-600 hover:underline"
            >
              View All
            </a>
          </div>
          <p className="text-sm text-gray-500">
            Scheduled in next 7 days:{" "}
            <span className="font-semibold text-gray-900">
              {dashboard.upcomingSubscriptionOrderCount}
            </span>
          </p>
        </div>
      </div>

      {/* Recent orders (stub) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Orders</h2>
        {dashboard.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">
            Recent Orders이 없습니다. Order analytics 연동 후 여기에 표시됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">Channel</th>
                  <th className="text-left pb-2 font-medium">Status</th>
                  <th className="text-right pb-2 font-medium">Amount</th>
                  <th className="text-right pb-2 font-medium">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dashboard.recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td className="py-2 text-gray-700">{o.channel}</td>
                    <td className="py-2">
                      <ChannelStatusBadge status={o.status} />
                    </td>
                    <td className="py-2 text-right">{formatCurrency(o.totalAmountMinorUnit, o.currency)}</td>
                    <td className="py-2 text-right text-gray-400 text-xs">
                      {new Date(o.createdAt).toLocaleString("en-US")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
