import type { OwnerRevenueTrendPoint } from "@/types/owner-reports";
import { formatMinorCompact } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  trend: OwnerRevenueTrendPoint[];
}

export default function OwnerRevenueTrendChart({ trend }: Props) {
  if (trend.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue Trend</h2>
        <OwnerEmptyReportState />
      </div>
    );
  }

  const maxRevenue = Math.max(...trend.map((p) => p.revenueMinor), 1);
  const chartHeight = 120;
  const barWidth = Math.max(8, Math.min(40, Math.floor(560 / trend.length) - 4));
  const gap = 4;
  const chartWidth = trend.length * (barWidth + gap);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-1">Revenue Trend</h2>
      <p className="text-xs text-gray-400 mb-4">Daily revenue (excl. cancelled &amp; failed orders)</p>
      <div className="overflow-x-auto">
        <svg
          width={Math.max(chartWidth, 300)}
          height={chartHeight + 32}
          aria-label="Revenue trend chart"
        >
          {trend.map((point, i) => {
            const barH = Math.max(2, Math.round((point.revenueMinor / maxRevenue) * chartHeight));
            const x = i * (barWidth + gap);
            const y = chartHeight - barH;
            return (
              <g key={point.dateKey}>
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx={2}
                  fill={point.revenueMinor > 0 ? "#6366f1" : "#e5e7eb"}
                  aria-label={`${point.dateLabel}: ${formatMinorCompact(point.revenueMinor)}`}
                />
                {point.orderCount > 0 && (
                  <circle
                    cx={x + barWidth / 2}
                    cy={y - 5}
                    r={2}
                    fill="#a5b4fc"
                  />
                )}
                {(trend.length <= 10 || i % Math.ceil(trend.length / 10) === 0) && (
                  <text
                    x={x + barWidth / 2}
                    y={chartHeight + 16}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#9ca3af"
                  >
                    {point.dateLabel.split(" ").slice(0, 2).join(" ")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="flex items-center gap-4 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-indigo-500" />
          <span className="text-xs text-gray-500">Revenue</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-indigo-300" />
          <span className="text-xs text-gray-500">Has orders</span>
        </div>
      </div>
    </div>
  );
}
