import Link from "next/link";
import AdminStatCard from "@/components/admin/AdminStatCard";
import {
  formatPriceMinor,
  labelBillingRecordType,
  labelBillingRecordStatus,
  labelSubscriptionEventType,
} from "@/lib/billing/labels";
import type { AdminBillingOverview } from "@/types/admin-billing";

interface Props {
  overview: AdminBillingOverview;
}

export default function AdminBillingOverviewCards({ overview }: Props) {
  return (
    <div>
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <AdminStatCard label="Tenants with Subscription" value={overview.totalTenantsWithSubscription} />
        <AdminStatCard label="Active Subscriptions" value={overview.activeSubscriptions} />
        <AdminStatCard label="Trials" value={overview.trialSubscriptions} />
        <AdminStatCard
          label="Past Due"
          value={overview.pastDueSubscriptions}
          sub={`Suspended ${overview.suspendedSubscriptions} / Cancel ${overview.cancelledSubscriptions}`}
        />
      </div>

      {/* MRR estimate */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">Estimated MRR</h2>
        <p className="text-2xl font-bold text-gray-900">
          {formatPriceMinor(overview.mrrEstimateMinor, "NZD")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Estimated from monthly paid subscriptions</p>
      </div>

      {/* Plan distribution */}
      {overview.planDistribution.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Plan Distribution</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2">Plan</th>
                <th className="text-right pb-2">Tenants</th>
                <th className="text-right pb-2">Price</th>
              </tr>
            </thead>
            <tbody>
              {overview.planDistribution.map((row) => (
                <tr key={row.planId} className="border-b border-gray-50 last:border-0">
                  <td className="py-2">
                    <Link
                      href={`/admin/billing/plans/${row.planId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {row.planName}
                    </Link>
                    <span className="ml-1.5 text-xs text-gray-400 font-mono">{row.planCode}</span>
                  </td>
                  <td className="py-2 text-right font-semibold">{row.tenantCount}</td>
                  <td className="py-2 text-right text-gray-600">
                    {formatPriceMinor(row.priceAmountMinor, row.currencyCode)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent subscription events */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Subscription Events</h2>
          {overview.recentSubscriptionEvents.length === 0 ? (
            <p className="text-sm text-gray-400">No events found.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {overview.recentSubscriptionEvents.map((e) => (
                <li key={e.id} className="py-2 flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/billing/tenants/${e.tenantId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {e.tenantDisplayName}
                    </Link>
                    <span className="ml-2 text-xs text-gray-500">
                      {labelSubscriptionEventType(e.eventType)}
                    </span>
                    {e.note && <p className="text-xs text-gray-400 mt-0.5 truncate">{e.note}</p>}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(e.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent billing records */}
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Billing Records</h2>
          {overview.recentBillingRecords.length === 0 ? (
            <p className="text-sm text-gray-400">No records found.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {overview.recentBillingRecords.map((r) => (
                <li key={r.id} className="py-2 flex items-start justify-between gap-2">
                  <div>
                    <Link
                      href={`/admin/billing/tenants/${r.tenantId}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {r.tenantDisplayName}
                    </Link>
                    <span className="ml-2 text-xs text-gray-500">
                      {labelBillingRecordType(r.recordType)}
                    </span>
                    <span className="ml-1 text-xs text-gray-400">
                      {labelBillingRecordStatus(r.status)}
                    </span>
                    {r.amountMinor != null && r.currencyCode && (
                      <span className="ml-2 text-xs font-medium text-gray-700">
                        {formatPriceMinor(r.amountMinor, r.currencyCode)}
                      </span>
                    )}
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{r.summary}</p>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {new Date(r.createdAt).toLocaleDateString("ko-KR")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
