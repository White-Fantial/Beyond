import OwnerKpiCard from "./OwnerKpiCard";
import type { OwnerSummaryKpi } from "@/types/owner-reports";
import { formatMinorFull, formatMinorCompact, formatRate } from "@/lib/owner/reports/labels";

interface Props {
  summary: OwnerSummaryKpi;
  comparison?: OwnerSummaryKpi | null;
}

function trendInfo(current: number, previous: number, format: (n: number) => string, higherIsBetter = true) {
  if (previous === 0) return null;
  const diff = current - previous;
  const pct = ((Math.abs(diff) / previous) * 100).toFixed(1);
  const positive = higherIsBetter ? diff >= 0 : diff <= 0;
  return { value: `${pct}%`, positive };
}

export default function OwnerKpiGrid({ summary, comparison }: Props) {
  const { currencyCode } = summary;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <OwnerKpiCard
        label="Gross Revenue"
        value={formatMinorCompact(summary.grossRevenueMinor, currencyCode)}
        sub={`${summary.orderCount} orders`}
        icon="💰"
        trend={comparison ? trendInfo(summary.grossRevenueMinor, comparison.grossRevenueMinor, (n) => formatMinorCompact(n, currencyCode)) : null}
      />
      <OwnerKpiCard
        label="Orders"
        value={String(summary.orderCount)}
        icon="📦"
        trend={comparison ? trendInfo(summary.orderCount, comparison.orderCount, String) : null}
      />
      <OwnerKpiCard
        label="Avg Order Value"
        value={formatMinorFull(summary.averageOrderValueMinor, currencyCode)}
        icon="🧾"
        trend={comparison ? trendInfo(summary.averageOrderValueMinor, comparison.averageOrderValueMinor, (n) => formatMinorFull(n, currencyCode)) : null}
      />
      <OwnerKpiCard
        label="Completed Rate"
        value={formatRate(summary.completedRate)}
        sub={`${summary.completedOrderCount} completed`}
        icon="✅"
        trend={comparison ? trendInfo(summary.completedRate, comparison.completedRate, formatRate) : null}
      />
      <OwnerKpiCard
        label="Cancelled Rate"
        value={formatRate(summary.cancelledRate)}
        sub={`${summary.cancelledOrderCount} cancelled`}
        icon="❌"
        trend={comparison ? trendInfo(summary.cancelledRate, comparison.cancelledRate, formatRate, false) : null}
      />
      <OwnerKpiCard
        label="Subscription Revenue"
        value={formatMinorCompact(summary.subscriptionRevenueMinor, currencyCode)}
        sub={`${summary.subscriptionOrderCount} sub orders`}
        icon="🔄"
        trend={comparison ? trendInfo(summary.subscriptionRevenueMinor, comparison.subscriptionRevenueMinor, (n) => formatMinorCompact(n, currencyCode)) : null}
      />
    </div>
  );
}
