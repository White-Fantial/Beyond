import Link from "next/link";
import AdminStatCard from "@/components/admin/AdminStatCard";
import {
  formatPriceMinor,
  labelSubscriptionStatus,
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
        <AdminStatCard label="구독 테넌트" value={overview.totalTenantsWithSubscription} />
        <AdminStatCard label="활성 구독" value={overview.activeSubscriptions} />
        <AdminStatCard label="트라이얼" value={overview.trialSubscriptions} />
        <AdminStatCard
          label="연체"
          value={overview.pastDueSubscriptions}
          sub={`정지 ${overview.suspendedSubscriptions} / 취소 ${overview.cancelledSubscriptions}`}
        />
      </div>

      {/* MRR estimate */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-1">예상 MRR</h2>
        <p className="text-2xl font-bold text-gray-900">
          {formatPriceMinor(overview.mrrEstimateMinor, "NZD")}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">월간 유료 구독 기준 추정치</p>
      </div>

      {/* Plan distribution */}
      {overview.planDistribution.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">플랜별 분포</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2">플랜</th>
                <th className="text-right pb-2">테넌트 수</th>
                <th className="text-right pb-2">가격</th>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 구독 이벤트</h2>
          {overview.recentSubscriptionEvents.length === 0 ? (
            <p className="text-sm text-gray-400">이벤트가 없습니다.</p>
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
          <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 결제 기록</h2>
          {overview.recentBillingRecords.length === 0 ? (
            <p className="text-sm text-gray-400">기록이 없습니다.</p>
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
