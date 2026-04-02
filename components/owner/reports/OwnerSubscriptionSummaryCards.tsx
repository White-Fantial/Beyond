import type { OwnerSubscriptionSummary } from "@/types/owner-reports";
import { formatMinorCompact } from "@/lib/owner/reports/labels";

interface Props {
  summary: OwnerSubscriptionSummary;
  currencyCode: string;
}

export default function OwnerSubscriptionSummaryCards({ summary, currencyCode }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Subscription Summary</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Active</div>
          <div className="text-xl font-bold text-gray-900">{summary.activeSubscriptionCount}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Paused</div>
          <div className="text-xl font-bold text-gray-900">{summary.pausedSubscriptionCount}</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-0.5">Revenue (period)</div>
          <div className="text-xl font-bold text-gray-900">
            {formatMinorCompact(summary.subscriptionRevenueMinor, currencyCode)}
          </div>
          <div className="text-xs text-gray-400">{summary.subscriptionOrderCount} orders</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="text-xs text-purple-600 mb-0.5">Est. Next 7 Days</div>
          <div className="text-xl font-bold text-purple-800">
            {formatMinorCompact(summary.estimatedUpcoming7dRevenueMinor, currencyCode)}
          </div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3 sm:col-span-2">
          <div className="text-xs text-purple-600 mb-0.5">Est. Next 30 Days</div>
          <div className="text-xl font-bold text-purple-800">
            {formatMinorCompact(summary.estimatedUpcoming30dRevenueMinor, currencyCode)}
          </div>
        </div>
      </div>
    </div>
  );
}
