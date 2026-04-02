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

/** Severity ordering map — lower number = higher priority. */
export const INCIDENT_SEVERITY_ORDER: Record<SystemSeverity, number> = {
  CRITICAL: 0,
  WARN: 1,
  INFO: 2,
};

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
    "OAuth Callback Failures",
    "Integrations",
    metrics.oauthCallbackFailures,
    2,
    10,
    `/admin/logs?logType=CONNECTION_ACTION&errorOnly=1`
  );
  add(
    "token_refresh_failure",
    "Token Refresh Failures",
    "Integrations",
    metrics.tokenRefreshFailures,
    3,
    15,
    `/admin/logs?logType=CONNECTION_ACTION&errorOnly=1`
  );
  add(
    "connection_validation_failure",
    "Connection Validation Failed",
    "Integrations",
    metrics.connectionValidationFailures,
    3,
    10,
    `/admin/integrations`
  );
  add(
    "reauth_required",
    "Surge in Reauth Required connections",
    "Integrations",
    metrics.reauthRequiredTriggered,
    3,
    10,
    `/admin/integrations`
  );

  // Webhooks
  add(
    "webhook_failures",
    "Webhook Processing Failure",
    "Webhooks",
    metrics.webhooksFailed,
    5,
    30,
    `/admin/logs?logType=WEBHOOK&errorOnly=1`
  );
  add(
    "webhook_signature_invalid",
    "Webhook Signature Validation Failed",
    "Webhooks",
    metrics.webhooksSignatureInvalid,
    3,
    10,
    `/admin/logs?logType=WEBHOOK&errorOnly=1`
  );

  // Jobs
  add(
    "job_failures",
    "Job Execution Failure",
    "Jobs",
    metrics.jobFailures,
    3,
    20,
    `/admin/jobs?status=FAILED`
  );

  // Orders
  add(
    "pos_forward_failures",
    "POS Order Forward Failure",
    "Orders",
    metrics.posForwardFailures,
    3,
    15,
    `/admin/jobs?jobType=ORDER_RECOVERY_RETRY&status=FAILED`
  );
  add(
    "reconciliation_retries",
    "Surge in Order Reconciliation Retries",
    "Orders",
    metrics.reconciliationRetries,
    5,
    20,
    `/admin/jobs?jobType=ORDER_RECONCILIATION_RETRY`
  );

  // Billing
  add(
    "past_due_subscriptions",
    "Surge in Past Due subscriptions",
    "Billing",
    metrics.pastDueSubscriptions,
    3,
    10,
    `/admin/billing/tenants`
  );

  // Sort: CRITICAL first, then WARN, then INFO
  incidents.sort(
    (a, b) =>
      INCIDENT_SEVERITY_ORDER[a.severity] - INCIDENT_SEVERITY_ORDER[b.severity] ||
      b.count - a.count
  );

  return incidents;
}
