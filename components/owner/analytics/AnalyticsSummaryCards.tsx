interface KpiCardProps {
  label: string;
  value: string;
  sub?: string;
  icon?: string;
}

function KpiCard({ label, value, sub, icon }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

interface Props {
  peakWeekday: number;
  peakHour: number;
  projectedRevenue: string;
  atRiskSubscribers: number;
}

export default function AnalyticsSummaryCards({
  peakWeekday,
  peakHour,
  projectedRevenue,
  atRiskSubscribers,
}: Props) {
  const hourLabel =
    peakHour === 0
      ? "12 am"
      : peakHour < 12
      ? `${peakHour} am`
      : peakHour === 12
      ? "12 pm"
      : `${peakHour - 12} pm`;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <KpiCard
        label="Peak Hour"
        value={hourLabel}
        sub="Highest order volume"
        icon="⏰"
      />
      <KpiCard
        label="Peak Day"
        value={WEEKDAY_LABELS[peakWeekday]}
        sub="Busiest weekday"
        icon="📅"
      />
      <KpiCard
        label="Projected Revenue"
        value={projectedRevenue}
        sub="Forecast window total"
        icon="📈"
      />
      <KpiCard
        label="At-risk Subscribers"
        value={String(atRiskSubscribers)}
        sub="Declining order frequency"
        icon="⚠️"
      />
    </div>
  );
}
