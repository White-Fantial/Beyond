/**
 * Admin Attention Service
 *
 * Aggregates "items that require operator attention right now" across the platform.
 * Reused by the analytics page and the admin dashboard summary.
 */

import { prisma } from "@/lib/prisma";
import type {
  AdminAnalyticsFilters,
  AdminAttentionItem,
  AdminAttentionSummary,
} from "@/types/admin-analytics";

const WEBHOOK_SPIKE_THRESHOLD = 10;
const POS_FAILURE_SPIKE_THRESHOLD = 5;
const FAILED_JOBS_BACKLOG_THRESHOLD = 3;
const NO_ORDERS_DAYS = 7;

export async function listAdminAttentionItems(
  _filters: AdminAnalyticsFilters
): Promise<AdminAttentionSummary> {
  const sevenDaysAgo = new Date(Date.now() - NO_ORDERS_DAYS * 24 * 60 * 60 * 1000);

  const [
    reauthCount,
    syncFailures,
    webhookSpike,
    posFailures,
    failedJobsCount,
    billingFailures,
  ] = await Promise.all([
    // REAUTH_REQUIRED connections
    prisma.connection.count({ where: { status: "REAUTH_REQUIRED" } }),

    // Sync failures in last 7 days
    prisma.jobRun.count({
      where: { jobType: "CATALOG_SYNC", status: "FAILED", createdAt: { gte: sevenDaysAgo } },
    }),

    // Webhook failures in last 7 days
    prisma.inboundWebhookLog.count({
      where: { receivedAt: { gte: sevenDaysAgo }, processingStatus: "FAILED" },
    }),

    // POS forwarding failures in last 7 days
    prisma.order.count({
      where: {
        posForwardingRequired: true,
        posSubmissionStatus: "FAILED",
        orderedAt: { gte: sevenDaysAgo },
      },
    }),

    // Failed jobs (non-expired) in last 7 days
    prisma.jobRun.count({
      where: { status: "FAILED", createdAt: { gte: sevenDaysAgo } },
    }),

    // Billing failures in last 30 days
    prisma.billingRecord
      .count({
        where: {
          status: "UNCOLLECTIBLE",
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        },
      })
      .catch(() => 0), // billingRecord may not exist in all schemas
  ]);

  const items: AdminAttentionItem[] = [];

  if (reauthCount > 0) {
    items.push({
      type: "REAUTH_REQUIRED_CONNECTION",
      severity: "critical",
      title: `${reauthCount} connections require re-authentication`,
      description: "There are connections with expired authentication. Immediate reconnection is required.",
      count: reauthCount,
      href: "/admin/integrations?status=REAUTH_REQUIRED",
    });
  }

  if (syncFailures >= 2) {
    items.push({
      type: "REPEATED_SYNC_FAILURE",
      severity: "warning",
      title: `${syncFailures} sync failures (last 7 days)`,
      description: "Catalog sync is failing repeatedly.",
      count: syncFailures,
      href: "/admin/jobs?jobType=CATALOG_SYNC&status=FAILED",
    });
  }

  if (webhookSpike >= WEBHOOK_SPIKE_THRESHOLD) {
    items.push({
      type: "WEBHOOK_ERROR_SPIKE",
      severity: "warning",
      title: `${webhookSpike} webhook errors (last 7 days)`,
      description: "Webhook processing errors are spiking.",
      count: webhookSpike,
      href: "/admin/logs?type=webhook&status=FAILED",
    });
  }

  if (posFailures >= POS_FAILURE_SPIKE_THRESHOLD) {
    items.push({
      type: "POS_FORWARD_FAILURE_SPIKE",
      severity: "warning",
      title: `${posFailures} POS forward failures (last 7 days)`,
      description: "Repeated failures forwarding orders to POS.",
      count: posFailures,
      href: "/admin/jobs?jobType=ORDER_RECOVERY_RETRY&status=FAILED",
    });
  }

  if (failedJobsCount >= FAILED_JOBS_BACKLOG_THRESHOLD) {
    items.push({
      type: "FAILED_JOBS_BACKLOG",
      severity: "warning",
      title: `${failedJobsCount} failed jobs in the backlog`,
      description: "Unprocessed failed jobs are accumulating.",
      count: failedJobsCount,
      href: "/admin/jobs?status=FAILED",
    });
  }

  if (billingFailures > 0) {
    items.push({
      type: "BILLING_FAILURE_RECENT",
      severity: "warning",
      title: `${billingFailures} recent billing failures`,
      description: "There are billing processing failures in the last 30 days.",
      count: billingFailures,
      href: "/admin/billing",
    });
  }

  const critical = items.filter((i) => i.severity === "critical").length;
  const warning = items.filter((i) => i.severity === "warning").length;
  const info = items.filter((i) => i.severity === "info").length;

  return { critical, warning, info, items };
}

export async function summarizeAttentionCounts(
  filters: AdminAnalyticsFilters
): Promise<{ critical: number; warning: number; info: number }> {
  const { critical, warning, info } = await listAdminAttentionItems(filters);
  return { critical, warning, info };
}
