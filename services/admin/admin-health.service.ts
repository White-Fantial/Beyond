/**
 * Admin Health Service — per-component health checks.
 *
 * Each function queries the relevant data for a single subsystem and returns
 * a normalized AdminSystemComponentHealth object.
 *
 * Rules:
 * - No secrets, tokens, or connection strings are included in any result.
 * - All evaluations use threshold helpers from lib/admin/system/thresholds.ts.
 */

import { prisma } from "@/lib/prisma";
import type { AdminSystemComponentHealth } from "@/types/admin-system";
import {
  evaluateWebhookHealth,
  evaluateJobRunnerHealth,
  evaluateProviderHealth,
  evaluateBillingHealth,
  evaluateOrderPipelineHealth,
  evaluateCatalogSyncHealth,
  statusToSeverity,
} from "@/lib/admin/system/thresholds";
import { buildHealthSummary } from "@/lib/admin/system/health";
import { windowStart } from "@/lib/admin/system/metrics";

const WINDOW = "24h" as const;

// ─── Database ────────────────────────────────────────────────────────────────

export async function getDatabaseHealth(): Promise<AdminSystemComponentHealth> {
  const checkedAt = new Date().toISOString();
  try {
    // Simple connectivity check — count tenants
    const tenantCount = await prisma.tenant.count();
    return {
      key: "database",
      label: "Database",
      status: "HEALTHY",
      severity: "INFO",
      summary: `DB 연결 Healthy (Tenant ${tenantCount.toLocaleString()} more)`,
      lastCheckedAt: checkedAt,
      metrics: { tenantCount },
      drilldownHref: undefined,
    };
  } catch {
    return {
      key: "database",
      label: "Database",
      status: "DOWN",
      severity: "CRITICAL",
      summary: "DB 연결 실패 — 즉각 확인 필요",
      lastCheckedAt: checkedAt,
    };
  }
}

// ─── Jobs Runner ──────────────────────────────────────────────────────────────

export async function getJobsHealth(): Promise<AdminSystemComponentHealth> {
  const since = windowStart(WINDOW);
  const checkedAt = new Date().toISOString();

  const [total, failed, runningRaw] = await Promise.all([
    prisma.jobRun.count({ where: { createdAt: { gte: since } } }),
    prisma.jobRun.count({
      where: { createdAt: { gte: since }, status: "FAILED" },
    }),
    prisma.jobRun.findMany({
      where: { status: "RUNNING", startedAt: { not: null } },
      select: { startedAt: true },
    }),
  ]);

  const now = Date.now();
  const longestRunningMinutes = runningRaw.reduce((max, r) => {
    if (!r.startedAt) return max;
    const mins = (now - r.startedAt.getTime()) / 60000;
    return Math.max(max, mins);
  }, 0);

  const status = evaluateJobRunnerHealth({ total, failed, longestRunningMinutes });
  const severity = statusToSeverity(status);
  const summary = buildHealthSummary(status, {
    total,
    totalLabel: "Runs",
    failures: failed,
    failLabel: "Failures",
    window: WINDOW,
  });

  return {
    key: "jobs",
    label: "Jobs Runner",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: { total, failed, runningCount: runningRaw.length },
    drilldownHref: `/admin/jobs`,
  };
}

// ─── Webhook Pipeline ─────────────────────────────────────────────────────────

export async function getWebhookHealth(): Promise<AdminSystemComponentHealth> {
  const since = windowStart(WINDOW);
  const checkedAt = new Date().toISOString();

  const [received, failed, signatureInvalid] = await Promise.all([
    prisma.inboundWebhookLog.count({ where: { receivedAt: { gte: since } } }),
    prisma.inboundWebhookLog.count({
      where: { receivedAt: { gte: since }, processingStatus: "FAILED" },
    }),
    prisma.inboundWebhookLog.count({
      where: { receivedAt: { gte: since }, signatureValid: false },
    }),
  ]);

  const status = evaluateWebhookHealth({ received, failed, signatureInvalid });
  const severity = statusToSeverity(status);
  const summary = buildHealthSummary(status, {
    total: received,
    totalLabel: "Received",
    failures: failed,
    failLabel: "Failed",
    window: WINDOW,
  });

  return {
    key: "webhooks",
    label: "Webhook Pipeline",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: { received, failed, signatureInvalid },
    drilldownHref: `/admin/logs?logType=WEBHOOK&errorOnly=1`,
  };
}

// ─── Integrations ────────────────────────────────────────────────────────────

export async function getIntegrationsHealth(): Promise<AdminSystemComponentHealth> {
  const since = windowStart(WINDOW);
  const checkedAt = new Date().toISOString();

  const [refreshSuccesses, refreshFailures, reauthRequired, connectFailures] =
    await Promise.all([
      prisma.connectionActionLog.count({
        where: { createdAt: { gte: since }, actionType: "REFRESH_SUCCESS" },
      }),
      prisma.connectionActionLog.count({
        where: { createdAt: { gte: since }, actionType: "REFRESH_FAILURE" },
      }),
      prisma.connectionActionLog.count({
        where: { createdAt: { gte: since }, actionType: "REAUTHORIZE" },
      }),
      prisma.connectionActionLog.count({
        where: { createdAt: { gte: since }, actionType: "CONNECT_FAILURE" },
      }),
    ]);

  const status = evaluateProviderHealth({
    refreshSuccesses,
    refreshFailures,
    reauthRequired,
    connectFailures,
  });
  const severity = statusToSeverity(status);
  const summary = buildHealthSummary(status, {
    total: refreshSuccesses + refreshFailures,
    totalLabel: "갱신 시도",
    failures: refreshFailures,
    failLabel: "갱신 실패",
    window: WINDOW,
  });

  return {
    key: "integrations",
    label: "Integrations",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: {
      refreshSuccesses,
      refreshFailures,
      reauthRequired,
      connectFailures,
    },
    drilldownHref: `/admin/integrations`,
  };
}

// ─── Order Pipeline ───────────────────────────────────────────────────────────

export async function getOrderPipelineHealth(): Promise<AdminSystemComponentHealth> {
  const since = windowStart(WINDOW);
  const checkedAt = new Date().toISOString();

  const [posForwardAttempts, posForwardFailures, reconciliationRetries] =
    await Promise.all([
      prisma.orderEvent.count({
        where: {
          createdAt: { gte: since },
          eventType: "POS_FORWARD_REQUESTED",
        },
      }),
      prisma.orderEvent.count({
        where: {
          createdAt: { gte: since },
          eventType: "POS_FORWARD_FAILED",
        },
      }),
      prisma.jobRun.count({
        where: {
          createdAt: { gte: since },
          jobType: "ORDER_RECONCILIATION_RETRY",
        },
      }),
    ]);

  const status = evaluateOrderPipelineHealth({
    posForwardAttempts,
    posForwardFailures,
    reconciliationRetries,
  });
  const severity = statusToSeverity(status);
  const summary = buildHealthSummary(status, {
    total: posForwardAttempts,
    totalLabel: "전달 시도",
    failures: posForwardFailures,
    failLabel: "전달 실패",
    window: WINDOW,
  });

  return {
    key: "orders",
    label: "Order Pipeline",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: { posForwardAttempts, posForwardFailures, reconciliationRetries },
    drilldownHref: `/admin/logs?logType=ORDER_EVENT&errorOnly=1`,
  };
}

// ─── Catalog Sync ─────────────────────────────────────────────────────────────

export async function getCatalogSyncHealth(): Promise<AdminSystemComponentHealth> {
  const since = windowStart(WINDOW);
  const checkedAt = new Date().toISOString();

  const [total, failed] = await Promise.all([
    prisma.jobRun.count({
      where: { createdAt: { gte: since }, jobType: "CATALOG_SYNC" },
    }),
    prisma.jobRun.count({
      where: {
        createdAt: { gte: since },
        jobType: "CATALOG_SYNC",
        status: "FAILED",
      },
    }),
  ]);

  const status = evaluateCatalogSyncHealth({ total, failed });
  const severity = statusToSeverity(status);
  const summary = buildHealthSummary(status, {
    total,
    totalLabel: "Sync",
    failures: failed,
    failLabel: "Failures",
    window: WINDOW,
  });

  return {
    key: "catalog_sync",
    label: "Catalog Sync",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: { total, failed },
    drilldownHref: `/admin/jobs?jobType=CATALOG_SYNC&status=FAILED`,
  };
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export async function getBillingHealth(): Promise<AdminSystemComponentHealth> {
  const checkedAt = new Date().toISOString();

  const [active, trial, pastDue] = await Promise.all([
    prisma.tenantSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.tenantSubscription.count({ where: { status: "TRIAL" } }),
    prisma.tenantSubscription.count({ where: { status: "PAST_DUE" } }),
  ]);

  const status = evaluateBillingHealth({ pastDue, active, trial });
  const severity = statusToSeverity(status);

  const summary =
    status === "HEALTHY"
      ? `Healthy — Active ${active} more, Trial ${trial} more (Past Due ${pastDue} more)`
      : `Past Due: ${pastDue}, Active: ${active}, Trial: ${trial}`;

  return {
    key: "billing",
    label: "Billing",
    status,
    severity,
    summary,
    lastCheckedAt: checkedAt,
    metrics: { active, trial, pastDue },
    drilldownHref: `/admin/billing/tenants`,
  };
}
