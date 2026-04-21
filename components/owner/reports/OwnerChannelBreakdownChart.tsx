import type { OwnerChannelBreakdownItem } from "@/types/owner-reports";
import { channelLabel, formatMinorCompact, formatRate } from "@/lib/owner/reports/labels";
import OwnerEmptyReportState from "./OwnerEmptyReportState";

interface Props {
  breakdown: OwnerChannelBreakdownItem[];
}

const CHANNEL_COLORS: Record<string, string> = {
  POS: "#6366f1",
  UBER_EATS: "#22c55e",
  DOORDASH: "#ef4444",
  ONLINE: "#f59e0b",
  SUBSCRIPTION: "#8b5cf6",
  MANUAL: "#6b7280",
  UNKNOWN: "#d1d5db",
};

export default function OwnerChannelBreakdownChart({ breakdown }: Props) {
  if (breakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Channel Breakdown</h2>
        <OwnerEmptyReportState />
      </div>
    );
  }

  const totalRevenue = breakdown.reduce((s, c) => s + c.revenueMinor, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Channel Breakdown</h2>
      <div className="space-y-3">
        {breakdown.map((item) => {
          const pct = (item.revenueMinor / totalRevenue) * 100;
          const color = CHANNEL_COLORS[item.channel] ?? "#9ca3af";
          return (
            <div key={item.channel}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-700">{channelLabel(item.channel)}</span>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{item.orderCount} orders</span>
                  <span className="font-medium text-gray-800">
                    {formatMinorCompact(item.revenueMinor)}
                  </span>
                  <span className="text-red-500">{formatRate(item.cancelledRate)} cancel</span>
                </div>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct.toFixed(1)}%`, backgroundColor: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
