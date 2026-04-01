/**
 * Admin Metrics Service — aggregate operational metrics over time windows.
 */

import { prisma } from "@/lib/prisma";
import type { AdminSystemMetrics, MetricsWindow } from "@/types/admin-system";
import { windowStart } from "@/lib/admin/system/metrics";

// ─── Integration / auth metrics ───────────────────────────────────────────────

async function getIntegrationMetrics(
  since: Date
): Promise<Pick<
  AdminSystemMetrics,
  | "oauthConnectStarts"
  | "oauthCallbackSuccesses"
  | "oauthCallbackFailures"
  | "tokenRefreshSuccesses"
  | "tokenRefreshFailures"
  | "connectionValidations"
  | "connectionValidationFailures"
  | "reauthRequiredTriggered"
>> {
  const [
    oauthConnectStarts,
    oauthCallbackSuccesses,
    oauthCallbackFailures,
    tokenRefreshSuccesses,
    tokenRefreshFailures,
    connectionValidations,
    connectionValidationFailures,
    reauthRequiredTriggered,
  ] = await Promise.all([
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "CONNECT_START" },
    }),
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "CONNECT_SUCCESS" },
    }),
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "CONNECT_FAILURE" },
    }),
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "REFRESH_SUCCESS" },
    }),
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "REFRESH_FAILURE" },
    }),
    prisma.jobRun.count({
      where: { createdAt: { gte: since }, jobType: "CONNECTION_VALIDATE" },
    }),
    prisma.jobRun.count({
      where: {
        createdAt: { gte: since },
        jobType: "CONNECTION_VALIDATE",
        status: "FAILED",
      },
    }),
    prisma.connectionActionLog.count({
      where: { createdAt: { gte: since }, actionType: "REAUTHORIZE" },
    }),
  ]);

  return {
    oauthConnectStarts,
    oauthCallbackSuccesses,
    oauthCallbackFailures,
    tokenRefreshSuccesses,
    tokenRefreshFailures,
    connectionValidations,
    connectionValidationFailures,
    reauthRequiredTriggered,
  };
}

// ─── Webhook metrics ──────────────────────────────────────────────────────────

async function getWebhookMetrics(
  since: Date
): Promise<
  Pick<
    AdminSystemMetrics,
    | "webhooksReceived"
    | "webhooksProcessed"
    | "webhooksFailed"
    | "webhooksSignatureInvalid"
  >
> {
  const [webhooksReceived, webhooksFailed, webhooksSignatureInvalid] =
    await Promise.all([
      prisma.inboundWebhookLog.count({ where: { receivedAt: { gte: since } } }),
      prisma.inboundWebhookLog.count({
        where: { receivedAt: { gte: since }, processingStatus: "FAILED" },
      }),
      prisma.inboundWebhookLog.count({
        where: { receivedAt: { gte: since }, signatureValid: false },
      }),
    ]);

  const webhooksProcessed = webhooksReceived - webhooksFailed;

  return {
    webhooksReceived,
    webhooksProcessed: Math.max(0, webhooksProcessed),
    webhooksFailed,
    webhooksSignatureInvalid,
  };
}

// ─── Order metrics ────────────────────────────────────────────────────────────

async function getOrderMetrics(
  since: Date
): Promise<
  Pick<
    AdminSystemMetrics,
    | "ordersReceived"
    | "posForwardAttempts"
    | "posForwardFailures"
    | "reconciliationRetries"
  >
> {
  const [
    ordersReceived,
    posForwardAttempts,
    posForwardFailures,
    reconciliationRetries,
  ] = await Promise.all([
    prisma.orderEvent.count({
      where: { createdAt: { gte: since }, eventType: "ORDER_RECEIVED" },
    }),
    prisma.orderEvent.count({
      where: {
        createdAt: { gte: since },
        eventType: "POS_FORWARD_REQUESTED",
      },
    }),
    prisma.orderEvent.count({
      where: { createdAt: { gte: since }, eventType: "POS_FORWARD_FAILED" },
    }),
    prisma.jobRun.count({
      where: {
        createdAt: { gte: since },
        jobType: "ORDER_RECONCILIATION_RETRY",
      },
    }),
  ]);

  return {
    ordersReceived,
    posForwardAttempts,
    posForwardFailures,
    reconciliationRetries,
  };
}

// ─── Job metrics ──────────────────────────────────────────────────────────────

async function getJobMetrics(
  since: Date
): Promise<Pick<AdminSystemMetrics, "jobRuns" | "jobFailures" | "jobRetries">> {
  const [jobRuns, jobFailures, jobRetries] = await Promise.all([
    prisma.jobRun.count({ where: { createdAt: { gte: since } } }),
    prisma.jobRun.count({
      where: { createdAt: { gte: since }, status: "FAILED" },
    }),
    prisma.jobRun.count({
      where: { createdAt: { gte: since }, triggerSource: "ADMIN_RETRY" },
    }),
  ]);

  return { jobRuns, jobFailures, jobRetries };
}

// ─── Billing metrics ──────────────────────────────────────────────────────────

async function getBillingMetrics(
  since: Date
): Promise<
  Pick<
    AdminSystemMetrics,
    | "activeSubscriptions"
    | "trialSubscriptions"
    | "pastDueSubscriptions"
    | "cancelledSubscriptions"
    | "recentBillingRecords"
  >
> {
  const [
    activeSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    cancelledSubscriptions,
    recentBillingRecords,
  ] = await Promise.all([
    prisma.tenantSubscription.count({ where: { status: "ACTIVE" } }),
    prisma.tenantSubscription.count({ where: { status: "TRIAL" } }),
    prisma.tenantSubscription.count({ where: { status: "PAST_DUE" } }),
    prisma.tenantSubscription.count({
      where: { cancelledAt: { gte: since } },
    }),
    prisma.billingRecord.count({ where: { createdAt: { gte: since } } }),
  ]);

  return {
    activeSubscriptions,
    trialSubscriptions,
    pastDueSubscriptions,
    cancelledSubscriptions,
    recentBillingRecords,
  };
}

// ─── Usage / growth metrics ───────────────────────────────────────────────────

async function getUsageMetrics(
  since: Date
): Promise<
  Pick<AdminSystemMetrics, "newTenants" | "newStores" | "newUsers">
> {
  const [newTenants, newStores, newUsers] = await Promise.all([
    prisma.tenant.count({ where: { createdAt: { gte: since } } }),
    prisma.store.count({ where: { createdAt: { gte: since } } }),
    prisma.user.count({ where: { createdAt: { gte: since } } }),
  ]);

  return { newTenants, newStores, newUsers };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Fetch all operational metrics for the given time window. */
export async function getAdminSystemMetrics(
  window: MetricsWindow
): Promise<AdminSystemMetrics> {
  const since = windowStart(window);

  const [integration, webhook, order, job, billing, usage] = await Promise.all([
    getIntegrationMetrics(since),
    getWebhookMetrics(since),
    getOrderMetrics(since),
    getJobMetrics(since),
    getBillingMetrics(since),
    getUsageMetrics(since),
  ]);

  return {
    window,
    ...integration,
    ...webhook,
    ...order,
    ...job,
    ...billing,
    ...usage,
  };
}
