import type { BackofficeStatusFunnelItem } from "@/types/backoffice";

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: "Received",
  ACCEPTED: "Accepted",
  IN_PROGRESS: "Preparing",
  READY: "Ready",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: "#6366f1",
  ACCEPTED: "#818cf8",
  IN_PROGRESS: "#f59e0b",
  READY: "#22c55e",
  COMPLETED: "#16a34a",
  CANCELLED: "#ef4444",
};

interface Props {
  funnel: BackofficeStatusFunnelItem[];
}

export default function ReportsStatusFunnel({ funnel }: Props) {
  if (funnel.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h2 className="text-base font-semibold text-gray-900 mb-2">
          Order Status Funnel
        </h2>
        <p className="text-sm text-gray-400">No orders in this period.</p>
      </div>
    );
  }

  const maxCount = Math.max(...funnel.map((f) => f.count), 1);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Order Status Funnel
      </h2>
      <div className="space-y-2">
        {funnel.map((item) => {
          const pct = (item.count / maxCount) * 100;
          const color = STATUS_COLORS[item.status] ?? "#9ca3af";
          return (
            <div key={item.status} className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-24 shrink-0">
                {STATUS_LABELS[item.status] ?? item.status}
              </span>
              <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full flex items-center pl-2 transition-all"
                  style={{
                    width: `${pct.toFixed(1)}%`,
                    backgroundColor: color,
                    minWidth: item.count > 0 ? "2rem" : 0,
                  }}
                >
                  <span className="text-[10px] font-semibold text-white leading-none">
                    {item.count}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
