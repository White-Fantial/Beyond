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
    title: "연동 / 인증",
    metrics: [
      { key: "oauthConnectStarts", label: "OAuth 연결 시작" },
      { key: "oauthCallbackSuccesses", label: "OAuth 콜백 성공" },
      { key: "oauthCallbackFailures", label: "OAuth 콜백 실패", sub: "오류" },
      { key: "tokenRefreshSuccesses", label: "토큰 갱신 성공" },
      { key: "tokenRefreshFailures", label: "토큰 갱신 실패", sub: "오류" },
      { key: "reauthRequiredTriggered", label: "재인증 요구", sub: "주의" },
    ],
  },
  {
    title: "웹훅",
    metrics: [
      { key: "webhooksReceived", label: "수신" },
      { key: "webhooksProcessed", label: "처리 완료" },
      { key: "webhooksFailed", label: "처리 실패", sub: "오류" },
      { key: "webhooksSignatureInvalid", label: "서명 불일치", sub: "오류" },
    ],
  },
  {
    title: "주문 파이프라인",
    metrics: [
      { key: "ordersReceived", label: "수신 주문" },
      { key: "posForwardAttempts", label: "POS 전달 시도" },
      { key: "posForwardFailures", label: "POS 전달 실패", sub: "오류" },
      { key: "reconciliationRetries", label: "재조정 재시도" },
    ],
  },
  {
    title: "Jobs",
    metrics: [
      { key: "jobRuns", label: "실행" },
      { key: "jobFailures", label: "실패", sub: "오류" },
      { key: "jobRetries", label: "재시도" },
    ],
  },
  {
    title: "빌링",
    metrics: [
      { key: "activeSubscriptions", label: "활성 구독" },
      { key: "trialSubscriptions", label: "트라이얼" },
      { key: "pastDueSubscriptions", label: "연체", sub: "주의" },
      { key: "cancelledSubscriptions", label: "해지 (기간 내)" },
      { key: "recentBillingRecords", label: "청구 기록" },
    ],
  },
  {
    title: "사용량 / 성장",
    metrics: [
      { key: "newTenants", label: "신규 테넌트" },
      { key: "newStores", label: "신규 매장" },
      { key: "newUsers", label: "신규 사용자" },
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
      <p className="text-xs text-gray-500">{label} 기준 운영 메트릭</p>
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
              const isAlert = m.sub === "오류" && typeof value === "number" && value > 0;
              const isWarn = m.sub === "주의" && typeof value === "number" && value > 0;

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
