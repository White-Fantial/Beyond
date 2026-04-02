interface Props {
  label: string;
  value: string;
  sub?: string;
  trend?: { value: string; positive: boolean } | null;
  icon?: string;
}

export default function OwnerKpiCard({ label, value, sub, trend, icon }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</span>
        {icon && <span className="text-base">{icon}</span>}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {sub && <div className="text-xs text-gray-400">{sub}</div>}
      {trend && (
        <div className={`text-xs font-medium mt-0.5 ${trend.positive ? "text-green-600" : "text-red-500"}`}>
          {trend.positive ? "▲" : "▼"} {trend.value} vs prev period
        </div>
      )}
    </div>
  );
}
