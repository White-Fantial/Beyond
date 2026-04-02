import type { AdminSystemMetrics, MetricsWindow } from "@/types/admin-system";
import { windowLabel } from "@/lib/admin/system/metrics";

interface AdminSystemMetricsSectionProps {
  metrics24h: AdminSystemMetrics;
  metrics7d: AdminSystemMetrics;
  activeWindow: MetricsWindow;
}

interface MetricDef {
  key: keyof AdminSystemMetrics;
  label: string;
  sub?: string;
}

const METRIC_GROUPS: { title: string; metrics: MetricDef[] }[] = [
  {
    title: "Integrations / Auth",
    metrics: [
      { key: "oauthConnectStarts", label: "OAuth Connect Starts" },
      { key: "oauthCallbackSuccesses", label: "OAuth Callback Successes" },
      { key: "oauthCallbackFailures", label: "OAuth Callback Failures", sub: "Error" },
      { key: "tokenRefreshSuccesses", label: "Token Refresh Successes" },
      { key: "tokenRefreshFailures", label: "Token Refresh Failures", sub: "Error" },
      { key: "reauthRequiredTriggered", label: "Reauth Required", sub: "warning" },
    ],
  },
  {
    title: "Webhooks",
    metrics: [
      { key: "webhooksReceived", label: "Received" },
      { key: "webhooksProcessed", label: "Completed" },
      { key: "webhooksFailed", label: "Failed", sub: "Error" },
      { key: "webhooksSignatureInvalid", label: "Invalid Signature", sub: "Error" },
    ],
  },
  {
    title: "Order Pipeline",
    metrics: [
      { key: "ordersReceived", label: "Orders Received" },
      { key: "posForwardAttempts", label: "POS Forward Attempts" },
      { key: "posForwardFailures", label: "POS Forward Failures", sub: "Error" },
      { key: "reconciliationRetries", label: "Reconciliation Retries" },
    ],
  },
  {
    title: "Jobs",
    metrics: [
      { key: "jobRuns", label: "Runs" },
      { key: "jobFailures", label: "Failures", sub: "Error" },
      { key: "jobRetries", label: "Retries" },
    ],
  },
  {
    title: "Billing",
    metrics: [
      { key: "activeSubscriptions", label: "Active Subscriptions" },
      { key: "trialSubscriptions", label: "Trials" },
      { key: "pastDueSubscriptions", label: "Past Due", sub: "warning" },
      { key: "cancelledSubscriptions", label: "Cancelled" },
      { key: "recentBillingRecords", label: "Billing Records" },
    ],
  },
  {
    title: "Usage / Growth",
    metrics: [
      { key: "newTenants", label: "New Tenants" },
      { key: "newStores", label: "New Stores" },
      { key: "newUsers", label: "New Users" },
    ],
  },
];

export function AdminSystemMetricsSection({
  metrics24h,
  metrics7d,
  activeWindow,
}: AdminSystemMetricsSectionProps) {
  const metrics = activeWindow === "24h" ? metrics24h : metrics7d;
  const label = windowLabel(activeWindow);

  return (
    <div className="space-y-6">
      <p className="text-xs text-gray-500">{label} operational metrics</p>
      {METRIC_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
            {group.title}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {group.metrics.map((m) => {
              const rawValue = metrics[m.key];
              const value =
                typeof rawValue === "number"
                  ? rawValue
                  : typeof rawValue === "string"
                  ? rawValue
                  : "—";
              const isAlert = m.sub === "Error" && typeof value === "number" && value > 0;
              const isWarn = m.sub === "warning" && typeof value === "number" && value > 0;

              return (
                <div
                  key={m.key}
                  className={`rounded-lg border p-3 ${
                    isAlert
                      ? "border-red-200 bg-red-50"
                      : isWarn
                      ? "border-yellow-200 bg-yellow-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <p
                    className={`text-2xl font-bold tabular-nums ${
                      isAlert
                        ? "text-red-700"
                        : isWarn
                        ? "text-yellow-700"
                        : "text-gray-800"
                    }`}
                  >
                    {typeof value === "number" ? value.toLocaleString() : value}
                  </p>
                  <p className="mt-0.5 text-[11px] text-gray-500">{m.label}</p>
                  {m.sub && (
                    <p
                      className={`text-[10px] font-medium ${
                        isAlert
                          ? "text-red-500"
                          : isWarn
                          ? "text-yellow-600"
                          : "text-gray-400"
                      }`}
                    >
                      {m.sub}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
