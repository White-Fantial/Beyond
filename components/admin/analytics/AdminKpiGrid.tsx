import type { AdminAnalyticsOverview } from "@/types/admin-analytics";
import { formatDelta, getDeltaColor } from "@/lib/admin/analytics/labels";

interface Props {
  overview: AdminAnalyticsOverview;
}

export default function AdminKpiGrid({ overview }: Props) {
  const cards = [
    { ...overview.totalOrders, inverseGood: false },
    { ...overview.completedOrders, inverseGood: false },
    {
      ...overview.grossSales,
      displayValue: `$${(overview.grossSales.value / 100).toLocaleString("en-NZ", { minimumFractionDigits: 2 })}`,
      inverseGood: false,
    },
    {
      ...overview.avgOrderValue,
      displayValue: `$${(overview.avgOrderValue.value / 100).toLocaleString("en-NZ", { minimumFractionDigits: 2 })}`,
      inverseGood: false,
    },
    { ...overview.activeConnections, inverseGood: false },
    { ...overview.reauthRequiredConnections, inverseGood: true },
    {
      ...overview.webhookFailureRate,
      displayValue: `${overview.webhookFailureRate.value.toFixed(1)}%`,
      inverseGood: true,
    },
    {
      ...overview.posForwardFailureRate,
      displayValue: `${overview.posForwardFailureRate.value.toFixed(1)}%`,
      inverseGood: true,
    },
    {
      ...overview.catalogSyncSuccessRate,
      displayValue: `${overview.catalogSyncSuccessRate.value.toFixed(1)}%`,
      inverseGood: false,
    },
    { ...overview.failedJobs, inverseGood: true },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-8">
      {cards.map((card) => (
        <div key={card.label} className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-xs text-gray-500 mb-1 truncate">{card.label}</div>
          <div className="text-xl font-bold text-gray-900 mb-1">
            {"displayValue" in card && card.displayValue
              ? (card as { displayValue: string }).displayValue
              : card.value.toLocaleString("en-US")}
          </div>
          {card.delta !== 0 && (
            <div className={`text-xs font-medium ${getDeltaColor(card.delta, card.inverseGood)}`}>
              {formatDelta(card.delta)} vs 이전 Period
            </div>
          )}
          {card.delta === 0 && (
            <div className="text-xs text-gray-400">No change</div>
          )}
        </div>
      ))}
    </div>
  );
}
