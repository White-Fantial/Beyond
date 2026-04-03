import type { BackofficeChannelCount } from "@/types/backoffice";

const CHANNEL_LABELS: Record<string, string> = {
  POS: "Point of Sale",
  UBER_EATS: "Uber Eats",
  DOORDASH: "DoorDash",
  ONLINE: "Online Orders",
  SUBSCRIPTION: "Subscriptions",
  MANUAL: "Manual",
  UNKNOWN: "Unknown",
};

const CHANNEL_COLORS: Record<string, string> = {
  POS: "#6366f1",
  UBER_EATS: "#22c55e",
  DOORDASH: "#ef4444",
  ONLINE: "#f59e0b",
  SUBSCRIPTION: "#8b5cf6",
  MANUAL: "#6b7280",
  UNKNOWN: "#d1d5db",
};

interface Props {
  breakdown: BackofficeChannelCount[];
}

export default function DashboardChannelBreakdown({ breakdown }: Props) {
  if (breakdown.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Channel Breakdown
        </h2>
        <p className="text-sm text-gray-400">No orders today.</p>
      </div>
    );
  }

  const total = breakdown.reduce((s, c) => s + c.orderCount, 0) || 1;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Channel Breakdown — Today
      </h2>
      <div className="space-y-3">
        {breakdown.map((item) => {
          const pct = (item.orderCount / total) * 100;
          const color = CHANNEL_COLORS[item.channel] ?? "#9ca3af";
          return (
            <div key={item.channel}>
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium text-gray-700">
                  {CHANNEL_LABELS[item.channel] ?? item.channel}
                </span>
                <span className="text-xs font-semibold text-gray-800">
                  {item.orderCount} orders
                </span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${pct.toFixed(1)}%`,
                    backgroundColor: color,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
