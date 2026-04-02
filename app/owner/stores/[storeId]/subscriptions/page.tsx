import { requireOwnerStoreAccess } from "@/services/owner/owner-authz.service";
import { getOwnerSubscriptionSummary } from "@/services/owner/owner-subscriptions.service";
import Link from "next/link";

interface Props {
  params: { storeId: string };
}

export default async function StoreSubscriptionsPage({ params }: Props) {
  const { storeId } = params;
  await requireOwnerStoreAccess(storeId);
  const summary = await getOwnerSubscriptionSummary(storeId);

  return (
    <div className="max-w-3xl mx-auto px-4 pb-10 space-y-6">
      <h2 className="text-base font-semibold text-gray-800">구독 관리</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "활성 구독", value: summary.activeCount, sub: "Active" },
          { label: "일시정지", value: summary.pausedCount, sub: "Paused" },
          { label: "7일 내 예정 주문", value: summary.next7DaysExpectedOrderCount, sub: "Next 7 days" },
          { label: "구독 가능 상품", value: summary.subscriptionEnabledProductCount, sub: "Products" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="text-xs text-gray-500">{card.label}</div>
            <div className="text-2xl font-bold text-gray-900 mt-1">{card.value}</div>
            <div className="text-xs text-gray-400 mt-0.5">{card.sub}</div>
          </div>
        ))}
      </div>

      {/* Sub navigation */}
      <div className="flex gap-3">
        <Link
          href={`/owner/stores/${storeId}/subscriptions/customers`}
          className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition-all text-center"
        >
          <div className="text-2xl mb-1">👤</div>
          <div className="text-sm font-semibold text-gray-800">구독 고객</div>
          <div className="text-xs text-gray-400 mt-0.5">고객별 구독 현황</div>
        </Link>
        <Link
          href={`/owner/stores/${storeId}/subscriptions/upcoming`}
          className="flex-1 bg-white border border-gray-200 rounded-lg p-4 hover:border-brand-400 hover:shadow-sm transition-all text-center"
        >
          <div className="text-2xl mb-1">📅</div>
          <div className="text-sm font-semibold text-gray-800">예정 주문</div>
          <div className="text-xs text-gray-400 mt-0.5">다가오는 구독 주문</div>
        </Link>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
        구독 엔진 전체 기능은 다음 단계에서 구현됩니다. 현재는 기본 요약 정보만 표시됩니다.
      </div>
    </div>
  );
}
