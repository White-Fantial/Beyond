/**
 * Admin System Monitoring / Health Dashboard — type definitions.
 *
 * This module defines all types used by the /admin/system page and its
 * supporting service/lib layers.  No secrets, tokens, or credentials are
 * ever exposed through these types.
 */

// ─── Health Status ────────────────────────────────────────────────────────────

export type SystemHealthStatus = "HEALTHY" | "DEGRADED" | "DOWN" | "UNKNOWN";

export type SystemSeverity = "INFO" | "WARN" | "CRITICAL";

// ─── Time Windows ─────────────────────────────────────────────────────────────

export type MetricsWindow = "24h" | "7d";

// ─── Component Health ─────────────────────────────────────────────────────────

export interface AdminSystemComponentHealth {
  key: string;
  label: string;
  status: SystemHealthStatus;
  severity: SystemSeverity;
  summary: string;
  lastCheckedAt: string | null;
  metrics?: Record<string, number | string | null>;
  drilldownHref?: string;
}

// ─── Top-level Overview ───────────────────────────────────────────────────────

export interface AdminSystemOverview {
  overallStatus: SystemHealthStatus;
  overallSeverity: SystemSeverity;
  criticalCount: number;
  degradedCount: number;
  incidentCount: number;
  checkedAt: string;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface AdminSystemMetricCard {
  key: string;
  label: string;
  value: number;
  sub?: string;
  trend?: "up" | "down" | "neutral";
  window: MetricsWindow;
}

export interface AdminSystemMetrics {
  window: MetricsWindow;

  // Integration / auth
  oauthConnectStarts: number;
  oauthCallbackSuccesses: number;
  oauthCallbackFailures: number;
  tokenRefreshSuccesses: number;
  tokenRefreshFailures: number;
  connectionValidations: number;
  connectionValidationFailures: number;
  reauthRequiredTriggered: number;

  // Webhooks
  webhooksReceived: number;
  webhooksProcessed: number;
  webhooksFailed: number;
  webhooksSignatureInvalid: number;

  // Orders / pipeline
  ordersReceived: number;
  posForwardAttempts: number;
  posForwardFailures: number;
  reconciliationRetries: number;

  // Jobs
  jobRuns: number;
  jobFailures: number;
  jobRetries: number;

  // Billing
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  cancelledSubscriptions: number;
  recentBillingRecords: number;

  // Usage / growth
  newTenants: number;
  newStores: number;
  newUsers: number;
}

// ─── Incidents ────────────────────────────────────────────────────────────────

export interface AdminSystemIncident {
  key: string;
  title: string;
  subsystem: string;
  severity: SystemSeverity;
  count: number;
  window: MetricsWindow;
  drilldownHref?: string;
}

// ─── Full Dashboard ───────────────────────────────────────────────────────────

export interface AdminSystemDashboard {
  overview: AdminSystemOverview;
  components: AdminSystemComponentHealth[];
  metrics24h: AdminSystemMetrics;
  metrics7d: AdminSystemMetrics;
  incidents: AdminSystemIncident[];
  fetchedAt: string;
}
