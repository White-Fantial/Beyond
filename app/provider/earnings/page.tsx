import { requireAuth } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import {
  listEarnings,
  getEarningsSummary,
} from "@/services/provider/provider-earnings.service";
import { getProviderStripeStatus } from "@/services/provider/provider-onboarding.service";
import Link from "next/link";
import type { RecipePayoutStatus } from "@/types/provider-onboarding";

const payoutStatusColors: Record<RecipePayoutStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  TRANSFERRED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

const payoutStatusLabels: Record<RecipePayoutStatus, string> = {
  PENDING: "정산 대기",
  TRANSFERRED: "정산 완료",
  FAILED: "정산 실패",
};

export default async function ProviderEarningsPage() {
  const ctx = await requireAuth();

  if (!ctx.isRecipeProvider && !ctx.isPlatformAdmin) {
    redirect("/unauthorized");
  }

  const [earningsResult, summary, stripeStatus] = await Promise.all([
    listEarnings(ctx.userId, { pageSize: 50 }),
    getEarningsSummary(ctx.userId),
    getProviderStripeStatus(ctx.userId),
  ]);

  const formatAmount = (amount: number, _currency: string) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/provider/recipes"
            className="text-xs text-gray-400 hover:underline"
          >
            ← 내 레시피
          </Link>
          <h1 className="text-xl font-bold text-gray-900 mt-1">수익 대시보드</h1>
        </div>
        <Link
          href="/provider/onboarding"
          className="text-xs text-gray-500 hover:underline"
        >
          Stripe 설정 →
        </Link>
      </div>

      {/* Stripe status banner */}
      {!stripeStatus.payoutsEnabled && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
          ⚠️ Stripe 계좌가 연결되지 않아 수익금 자동 정산이 비활성화되어 있습니다.{" "}
          <Link href="/provider/onboarding" className="font-medium underline">
            계좌 연결하기
          </Link>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">총 판매 건수</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.totalSales}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">총 매출</p>
          <p className="text-lg font-bold text-gray-900 mt-1">
            {formatAmount(summary.totalRevenue, summary.currency || "USD")}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">내 수익 (10% 수수료 제외)</p>
          <p className="text-lg font-bold text-green-700 mt-1">
            {formatAmount(summary.totalPayoutAmount, summary.currency || "USD")}
          </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500">정산 대기</p>
          <p className="text-lg font-bold text-orange-600 mt-1">
            {formatAmount(summary.pendingPayoutAmount, summary.currency || "USD")}
          </p>
        </div>
      </div>

      {/* Earnings list */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">판매 내역</h2>
        {earningsResult.items.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <p className="text-4xl mb-3">📊</p>
            <p className="text-sm">아직 판매 내역이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {earningsResult.items.map((item) => (
              <div
                key={item.purchaseId}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {item.recipeTitle}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                    <span>
                      판매가:{" "}
                      {formatAmount(item.pricePaid, item.currency)}
                    </span>
                    <span>
                      내 수익:{" "}
                      <span className="text-green-700 font-medium">
                        {formatAmount(item.providerPayoutAmount, item.currency)}
                      </span>
                    </span>
                    <span>
                      {new Date(item.purchasedAt).toLocaleDateString("ko-KR")}
                    </span>
                  </div>
                </div>
                <span
                  className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                    payoutStatusColors[item.payoutStatus]
                  }`}
                >
                  {payoutStatusLabels[item.payoutStatus]}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 text-xs text-gray-400">
          총 {earningsResult.total}건
        </div>
      </div>
    </div>
  );
}
