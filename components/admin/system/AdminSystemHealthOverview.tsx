import type { AdminSystemOverview } from "@/types/admin-system";
import { healthStatusLabel } from "@/lib/admin/system/labels";
import { healthStatusColor } from "@/lib/admin/system/health";

interface AdminSystemHealthOverviewProps {
  overview: AdminSystemOverview;
}

export function AdminSystemHealthOverview({
  overview,
}: AdminSystemHealthOverviewProps) {
  const colors = healthStatusColor(overview.overallStatus);

  return (
    <div
      className={`rounded-xl border-2 p-5 ${colors.border} ${colors.bg}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Overall status */}
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 rounded-full ${colors.dot}`} />
          <div>
            <p className={`text-lg font-bold ${colors.text}`}>
              {healthStatusLabel(overview.overallStatus)}
            </p>
            <p className="text-xs text-gray-500">
              플랫폼 전체 상태 —{" "}
              {new Date(overview.checkedAt).toLocaleString("ko-KR")}
            </p>
          </div>
        </div>

        {/* KPI counters */}
        <div className="flex gap-6">
          <Stat label="심각 컴포넌트" value={overview.criticalCount} warn={overview.criticalCount > 0} />
          <Stat label="이상 컴포넌트" value={overview.degradedCount} warn={overview.degradedCount > 0} />
          <Stat label="인시던트" value={overview.incidentCount} warn={overview.incidentCount > 0} />
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className={`text-2xl font-bold tabular-nums ${
          warn ? "text-red-600" : "text-gray-700"
        }`}
      >
        {value}
      </p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
