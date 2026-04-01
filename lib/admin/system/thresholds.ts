/**
 * Health evaluation thresholds and normalization rules.
 *
 * All business rules for converting raw counts/ratios into health statuses
 * live here.  No scattered if/else logic elsewhere.
 */

import type { SystemHealthStatus, SystemSeverity } from "@/types/admin-system";

// ─── Generic ratio evaluation ─────────────────────────────────────────────────

/**
 * Evaluate health based on a failure-to-total ratio.
 *
 * @param failures  Number of failed operations
 * @param total     Total operations attempted
 * @param degradedThreshold  Ratio ≥ this → DEGRADED (default 0.05 = 5%)
 * @param downThreshold      Ratio ≥ this → DOWN (default 0.5 = 50%)
 */
export function evaluateRatioHealth(
  failures: number,
  total: number,
  degradedThreshold = 0.05,
  downThreshold = 0.5
): SystemHealthStatus {
  if (total === 0) return "UNKNOWN";
  const ratio = failures / total;
  if (ratio >= downThreshold) return "DOWN";
  if (ratio >= degradedThreshold) return "DEGRADED";
  return "HEALTHY";
}

/**
 * Evaluate health based on an absolute failure count.
 *
 * @param failures Number of failures in the window
 * @param warnAt   Failures ≥ this → DEGRADED  (default 3)
 * @param critAt   Failures ≥ this → DOWN      (default 20)
 */
export function evaluateAbsoluteHealth(
  failures: number,
  warnAt = 3,
  critAt = 20
): SystemHealthStatus {
  if (failures >= critAt) return "DOWN";
  if (failures >= warnAt) return "DEGRADED";
  return "HEALTHY";
}

// ─── Severity mapping ─────────────────────────────────────────────────────────

/** Map a SystemHealthStatus to its default severity. */
export function statusToSeverity(status: SystemHealthStatus): SystemSeverity {
  switch (status) {
    case "DOWN":
      return "CRITICAL";
    case "DEGRADED":
      return "WARN";
    case "HEALTHY":
      return "INFO";
    case "UNKNOWN":
      return "WARN";
  }
}

// ─── Overall platform health ──────────────────────────────────────────────────

/**
 * Aggregate multiple component statuses into a single platform-level status.
 * Worst status wins.  UNKNOWN is treated as WARN-level — not as healthy.
 */
export function aggregateHealth(
  statuses: SystemHealthStatus[]
): SystemHealthStatus {
  if (statuses.length === 0) return "UNKNOWN";
  if (statuses.includes("DOWN")) return "DOWN";
  if (statuses.includes("DEGRADED")) return "DEGRADED";
  if (statuses.every((s) => s === "UNKNOWN")) return "UNKNOWN";
  if (statuses.includes("UNKNOWN")) return "DEGRADED";
  return "HEALTHY";
}

// ─── Domain-specific evaluators ───────────────────────────────────────────────

export interface WebhookHealthStats {
  received: number;
  failed: number;
  signatureInvalid: number;
}

/** Evaluate webhook pipeline health. */
export function evaluateWebhookHealth(
  stats: WebhookHealthStats
): SystemHealthStatus {
  if (stats.received === 0) return "UNKNOWN";
  // Signature failures are high-severity even if small in absolute terms
  if (stats.signatureInvalid >= 5) return "DEGRADED";
  return evaluateRatioHealth(stats.failed, stats.received, 0.05, 0.3);
}

export interface JobRunnerHealthStats {
  total: number;
  failed: number;
  longestRunningMinutes?: number;
}

/** Evaluate job runner health. */
export function evaluateJobRunnerHealth(
  stats: JobRunnerHealthStats
): SystemHealthStatus {
  if (stats.total === 0) return "UNKNOWN";
  // A job running for over 60 min is suspicious → DEGRADED at minimum
  if ((stats.longestRunningMinutes ?? 0) > 60) return "DEGRADED";
  return evaluateRatioHealth(stats.failed, stats.total, 0.1, 0.5);
}

export interface ProviderHealthStats {
  refreshSuccesses: number;
  refreshFailures: number;
  reauthRequired: number;
  connectFailures: number;
}

/** Evaluate integration provider / auth health. */
export function evaluateProviderHealth(
  stats: ProviderHealthStats
): SystemHealthStatus {
  const totalRefreshAttempts = stats.refreshSuccesses + stats.refreshFailures;
  const refreshRatio =
    totalRefreshAttempts > 0
      ? evaluateRatioHealth(stats.refreshFailures, totalRefreshAttempts, 0.1, 0.5)
      : "UNKNOWN";

  // Reauth spikes are a strong signal of degradation
  if (stats.reauthRequired >= 3 || stats.connectFailures >= 5) return "DEGRADED";

  return refreshRatio;
}

export interface BillingHealthStats {
  pastDue: number;
  active: number;
  trial: number;
}

/** Evaluate billing subsystem health. */
export function evaluateBillingHealth(
  stats: BillingHealthStats
): SystemHealthStatus {
  const total = stats.active + stats.trial + stats.pastDue;
  if (total === 0) return "UNKNOWN";

  // >20% of subscriptions past_due → DEGRADED
  if (stats.pastDue / total >= 0.2) return "DEGRADED";
  if (stats.pastDue >= 5) return "DEGRADED";
  return "HEALTHY";
}

export interface OrderPipelineHealthStats {
  posForwardAttempts: number;
  posForwardFailures: number;
  reconciliationRetries: number;
}

/** Evaluate order pipeline health. */
export function evaluateOrderPipelineHealth(
  stats: OrderPipelineHealthStats
): SystemHealthStatus {
  if (stats.posForwardAttempts === 0) return "UNKNOWN";
  // High reconciliation retries are a degradation signal
  if (stats.reconciliationRetries >= 10) return "DEGRADED";
  return evaluateRatioHealth(
    stats.posForwardFailures,
    stats.posForwardAttempts,
    0.1,
    0.5
  );
}

export interface CatalogSyncHealthStats {
  total: number;
  failed: number;
}

/** Evaluate catalog sync health. */
export function evaluateCatalogSyncHealth(
  stats: CatalogSyncHealthStats
): SystemHealthStatus {
  if (stats.total === 0) return "UNKNOWN";
  return evaluateRatioHealth(stats.failed, stats.total, 0.1, 0.5);
}
