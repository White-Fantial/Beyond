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
    CONNECTED: "연결됨",
    REAUTH_REQUIRED: "재인증 필요",
    ERROR: "오류",
    NOT_CONNECTED: "미연결",
    DISCONNECTED: "해제됨",
  };
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded ${map[status] ?? "bg-gray-100 text-gray-500"}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatCurrency(minorUnit: number, currency: string) {
  return new Intl.NumberFormat("ko-KR", { style: "currency", currency }).format(minorUnit / 100);
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
          label="오늘 매출"
          value={formatCurrency(dashboard.todaySalesMinorUnit, "NZD")}
          sub="Today Sales"
        />
        <SummaryCard label="오늘 주문" value={dashboard.todayOrderCount} sub="Today Orders" />
        <SummaryCard
          label="완료 주문"
          value={dashboard.completedOrderCount}
          sub="Completed"
        />
        <SummaryCard
          label="취소 주문"
          value={dashboard.cancelledOrderCount}
          sub="Cancelled"
        />
        <SummaryCard
          label="품절 상품"
          value={dashboard.soldOutProductCount}
          sub="Sold Out"
        />
        <SummaryCard
          label="활성 구독"
          value={dashboard.activeSubscriptionCount}
          sub="Active Subscriptions"
        />
        <SummaryCard
          label="연결된 채널"
          value={`${dashboard.connectedChannelCount} / ${dashboard.totalChannelCount}`}
          sub="Connected Channels"
        />
        <SummaryCard
          label="다가오는 구독 주문"
          value={dashboard.upcomingSubscriptionOrderCount}
          sub="Next 7 Days"
        />
      </div>

      {/* Channel breakdown */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">채널별 매출</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-500 border-b border-gray-100">
                <th className="text-left pb-2 font-medium">채널</th>
                <th className="text-right pb-2 font-medium">오늘 매출</th>
                <th className="text-right pb-2 font-medium">주문 수</th>
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
          * 채널별 실시간 매출 집계는 analytics 연동 후 표시됩니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Sold out products */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">현재 품절 상품</h2>
            <a
              href={`/owner/stores/${storeId}/products?filter=sold_out`}
              className="text-xs text-brand-600 hover:underline"
            >
              전체 보기
            </a>
          </div>
          {dashboard.soldOutProducts.length === 0 ? (
            <p className="text-sm text-gray-400">품절 상품이 없습니다.</p>
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
                  외 {dashboard.soldOutProducts.length - 5}개
                </li>
              )}
            </ul>
          )}
        </div>

        {/* Upcoming subscription orders */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">다가오는 구독 주문</h2>
            <a
              href={`/owner/stores/${storeId}/subscriptions/upcoming`}
              className="text-xs text-brand-600 hover:underline"
            >
              전체 보기
            </a>
          </div>
          <p className="text-sm text-gray-500">
            향후 7일 내 예정:{" "}
            <span className="font-semibold text-gray-900">
              {dashboard.upcomingSubscriptionOrderCount}건
            </span>
          </p>
        </div>
      </div>

      {/* Recent orders (stub) */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">최근 주문</h2>
        {dashboard.recentOrders.length === 0 ? (
          <p className="text-sm text-gray-400">
            최근 주문이 없습니다. Order analytics 연동 후 여기에 표시됩니다.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">채널</th>
                  <th className="text-left pb-2 font-medium">상태</th>
                  <th className="text-right pb-2 font-medium">금액</th>
                  <th className="text-right pb-2 font-medium">시간</th>
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
                      {new Date(o.createdAt).toLocaleString("ko-KR")}
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
