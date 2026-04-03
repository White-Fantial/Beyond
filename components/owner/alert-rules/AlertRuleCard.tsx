import type { AlertRule } from "@/types/owner-notifications";

const METRIC_LABELS: Record<string, string> = {
  CANCELLATION_RATE: "Cancellation Rate",
  REVENUE_DROP: "Revenue Drop",
  SOLD_OUT_COUNT: "Sold-out Products",
  ORDER_FAILURE_RATE: "Order Failure Rate",
  LOW_STOCK_ITEMS: "Low-stock Items",
  POS_DISCONNECT: "POS Disconnect",
  DELIVERY_DISCONNECT: "Delivery Disconnect",
};

const METRIC_COLORS: Record<string, string> = {
  CANCELLATION_RATE: "bg-orange-100 text-orange-700",
  REVENUE_DROP: "bg-red-100 text-red-700",
  SOLD_OUT_COUNT: "bg-yellow-100 text-yellow-700",
  ORDER_FAILURE_RATE: "bg-red-100 text-red-700",
  LOW_STOCK_ITEMS: "bg-yellow-100 text-yellow-700",
  POS_DISCONNECT: "bg-purple-100 text-purple-700",
  DELIVERY_DISCONNECT: "bg-blue-100 text-blue-700",
};

function formatThreshold(metricType: string, threshold: number): string {
  switch (metricType) {
    case "CANCELLATION_RATE":
    case "ORDER_FAILURE_RATE":
      return `> ${threshold}%`;
    case "REVENUE_DROP":
      return `< ${threshold}%`;
    case "SOLD_OUT_COUNT":
    case "LOW_STOCK_ITEMS":
      return `> ${threshold} items`;
    case "POS_DISCONNECT":
    case "DELIVERY_DISCONNECT":
      return threshold === 0 ? "Any disconnect" : `> ${threshold} disconnected`;
    default:
      return `> ${threshold}`;
  }
}

function relativeDate(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-NZ");
}

interface Props {
  rule: AlertRule;
  onToggle: (ruleId: string, enabled: boolean) => void;
  onEdit: (rule: AlertRule) => void;
  onDelete: (ruleId: string) => void;
}

export default function AlertRuleCard({ rule, onToggle, onEdit, onDelete }: Props) {
  const badgeClass = METRIC_COLORS[rule.metricType] ?? "bg-gray-100 text-gray-700";

  return (
    <div className={`bg-white rounded-lg border ${rule.enabled ? "border-gray-200" : "border-gray-100"} p-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
              {METRIC_LABELS[rule.metricType] ?? rule.metricType}
            </span>
            {!rule.enabled && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
                Disabled
              </span>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span>
              <span className="font-medium text-gray-700">Threshold:</span>{" "}
              {formatThreshold(rule.metricType, rule.threshold)}
            </span>
            <span>
              <span className="font-medium text-gray-700">Window:</span>{" "}
              {rule.windowMinutes < 60
                ? `${rule.windowMinutes}m`
                : `${rule.windowMinutes / 60}h`}
            </span>
            <span>
              <span className="font-medium text-gray-700">Scope:</span>{" "}
              {rule.storeName ?? "All stores"}
            </span>
          </div>

          {rule.lastFiredAt && (
            <p className="mt-1 text-xs text-gray-400">
              Last fired: {relativeDate(rule.lastFiredAt)}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onToggle(rule.id, !rule.enabled)}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none ${
              rule.enabled ? "bg-brand-600" : "bg-gray-200"
            }`}
            aria-label={rule.enabled ? "Disable rule" : "Enable rule"}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                rule.enabled ? "translate-x-4" : "translate-x-0"
              }`}
            />
          </button>
          <button
            onClick={() => onEdit(rule)}
            className="px-2.5 py-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(rule.id)}
            className="px-2.5 py-1 text-xs font-medium text-red-600 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
