import type { TenantUsageData, UsageLimitComparison } from "@/types/admin-billing";

interface Props {
  usage: TenantUsageData;
  comparisons: UsageLimitComparison[];
}

const statusColors: Record<string, string> = {
  ok: "bg-green-500",
  warning: "bg-yellow-400",
  exceeded: "bg-red-500",
  unlimited: "bg-gray-200",
};

const statusLabels: Record<string, string> = {
  ok: "OK",
  warning: "warning",
  exceeded: "Exceeded",
  unlimited: "Unlimited",
};

export default function AdminUsageSummaryCard({ usage, comparisons }: Props) {
  return (
    <div>
      <div className="space-y-4">
        {comparisons.map((c) => (
          <div key={c.key}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  {c.current}
                  {c.limit != null ? ` / ${c.limit}` : ""}
                  {c.unit ? ` ${c.unit}` : ""}
                </span>
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                    c.status === "exceeded"
                      ? "bg-red-100 text-red-700"
                      : c.status === "warning"
                      ? "bg-yellow-100 text-yellow-700"
                      : c.status === "unlimited"
                      ? "bg-gray-100 text-gray-500"
                      : "bg-green-100 text-green-700"
                  }`}
                >
                  {statusLabels[c.status]}
                </span>
              </div>
            </div>
            {c.limit != null && c.limit > 0 && (
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div
                  className={`h-1.5 rounded-full transition-all ${statusColors[c.status]}`}
                  style={{ width: `${Math.min(100, c.percentUsed ?? 0)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>

      {usage.capturedAt && (
        <p className="text-xs text-gray-400 mt-4">
          Last aggregated: {new Date(usage.capturedAt).toLocaleString("en-US")}
        </p>
      )}
    </div>
  );
}
