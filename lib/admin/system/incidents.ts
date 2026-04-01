/**
 * Incident detection helpers.
 *
 * Converts raw metrics/health stats into normalized AdminSystemIncident items.
 */

import type {
  AdminSystemIncident,
  AdminSystemMetrics,
  MetricsWindow,
  SystemSeverity,
} from "@/types/admin-system";

/** Evaluate the severity of an incident based on its count. */
export function evaluateIncidentSeverity(
  count: number,
  warnAt = 3,
  critAt = 20
): SystemSeverity {
  if (count >= critAt) return "CRITICAL";
  if (count >= warnAt) return "WARN";
  return "INFO";
}

/**
 * Derive incident list from a metrics snapshot.
 *
 * Only incidents with count > 0 are returned.
 */
export function deriveIncidents(
  metrics: AdminSystemMetrics,
  window: MetricsWindow
): AdminSystemIncident[] {
  const incidents: AdminSystemIncident[] = [];

  function add(
    key: string,
    title: string,
    subsystem: string,
    count: number,
    warnAt: number,
    critAt: number,
    drilldownHref?: string
  ) {
    if (count <= 0) return;
    incidents.push({
      key,
      title,
      subsystem,
      severity: evaluateIncidentSeverity(count, warnAt, critAt),
      count,
      window,
      drilldownHref,
    });
  }

  // Integration / auth
  add(
    "oauth_callback_failure",
    "OAuth 콜백 실패",
    "Integrations",
    metrics.oauthCallbackFailures,
    2,
    10,
    `/admin/logs?logType=CONNECTION_ACTION&errorOnly=1`
  );
  add(
    "token_refresh_failure",
    "토큰 갱신 실패",
    "Integrations",
    metrics.tokenRefreshFailures,
    3,
    15,
    `/admin/logs?logType=CONNECTION_ACTION&errorOnly=1`
  );
  add(
    "connection_validation_failure",
    "연결 검증 실패",
    "Integrations",
    metrics.connectionValidationFailures,
    3,
    10,
    `/admin/integrations`
  );
  add(
    "reauth_required",
    "재인증 필요 급증",
    "Integrations",
    metrics.reauthRequiredTriggered,
    3,
    10,
    `/admin/integrations`
  );

  // Webhooks
  add(
    "webhook_failures",
    "웹훅 처리 실패",
    "Webhooks",
    metrics.webhooksFailed,
    5,
    30,
    `/admin/logs?logType=WEBHOOK&errorOnly=1`
  );
  add(
    "webhook_signature_invalid",
    "웹훅 서명 검증 실패",
    "Webhooks",
    metrics.webhooksSignatureInvalid,
    3,
    10,
    `/admin/logs?logType=WEBHOOK&errorOnly=1`
  );

  // Jobs
  add(
    "job_failures",
    "Job 실행 실패",
    "Jobs",
    metrics.jobFailures,
    3,
    20,
    `/admin/jobs?status=FAILED`
  );

  // Orders
  add(
    "pos_forward_failures",
    "POS 주문 전달 실패",
    "Orders",
    metrics.posForwardFailures,
    3,
    15,
    `/admin/jobs?jobType=ORDER_RECOVERY_RETRY&status=FAILED`
  );
  add(
    "reconciliation_retries",
    "주문 재조정 재시도 급증",
    "Orders",
    metrics.reconciliationRetries,
    5,
    20,
    `/admin/jobs?jobType=ORDER_RECONCILIATION_RETRY`
  );

  // Billing
  add(
    "past_due_subscriptions",
    "연체 구독 급증",
    "Billing",
    metrics.pastDueSubscriptions,
    3,
    10,
    `/admin/billing/tenants`
  );

  // Sort: CRITICAL first, then WARN, then INFO
  const order: Record<SystemSeverity, number> = {
    CRITICAL: 0,
    WARN: 1,
    INFO: 2,
  };
  incidents.sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);

  return incidents;
}
