/**
 * Admin Analytics Service
 *
 * Platform-wide operational health metrics for the Admin Console.
 * Uses existing tables: orders, connections, inbound_webhook_logs,
 * connection_action_logs, job_runs. No new materialized tables.
 */

import { prisma } from "@/lib/prisma";
import { getPreviousPeriod } from "@/lib/admin/analytics/filters";
import type {
  AdminAnalyticsFilters,
  AdminAnalyticsOverview,
  AdminKpiCard,
  AdminTrendPoint,
  AdminProviderHealthRow,
  AdminFailureBreakdownRow,
  AdminProblemStoreRow,
  AdminAttentionSummary,
} from "@/types/admin-analytics";

// ─── Overview KPI ─────────────────────────────────────────────────────────────

export async function getAdminAnalyticsOverview(
  filters: AdminAnalyticsFilters
): Promise<AdminAnalyticsOverview> {
  const prev = getPreviousPeriod(filters);

  const [
    current,
    previous,
    currentConnections,
    previousConnections,
    currentWebhook,
    previousWebhook,
    currentPos,
    previousPos,
    currentSyncJobs,
    previousSyncJobs,
    currentFailedJobs,
    previousFailedJobs,
  ] = await Promise.all([
    fetchOrderAgg(filters),
    fetchOrderAgg({ ...filters, from: prev.from, to: prev.to }),
    fetchConnectionCounts(filters),
    fetchConnectionCounts({ ...filters, from: prev.from, to: prev.to }),
    fetchWebhookCounts(filters),
    fetchWebhookCounts({ ...filters, from: prev.from, to: prev.to }),
    fetchPosFailureCounts(filters),
    fetchPosFailureCounts({ ...filters, from: prev.from, to: prev.to }),
    fetchSyncJobCounts(filters),
    fetchSyncJobCounts({ ...filters, from: prev.from, to: prev.to }),
    fetchFailedJobCount(filters),
    fetchFailedJobCount({ ...filters, from: prev.from, to: prev.to }),
  ]);

  const webhookFailureRate =
    currentWebhook.total > 0
      ? (currentWebhook.failed / currentWebhook.total) * 100
      : 0;
  const prevWebhookFailureRate =
    previousWebhook.total > 0
      ? (previousWebhook.failed / previousWebhook.total) * 100
      : 0;

  const posFailureRate =
    currentPos.total > 0 ? (currentPos.failed / currentPos.total) * 100 : 0;
  const prevPosFailureRate =
    previousPos.total > 0 ? (previousPos.failed / previousPos.total) * 100 : 0;

  const syncSuccessRate =
    currentSyncJobs.total > 0
      ? ((currentSyncJobs.total - currentSyncJobs.failed) / currentSyncJobs.total) * 100
      : 100;
  const prevSyncSuccessRate =
    previousSyncJobs.total > 0
      ? ((previousSyncJobs.total - previousSyncJobs.failed) / previousSyncJobs.total) * 100
      : 100;

  const avgOrderValue =
    current.completedCount > 0
      ? Math.round(current.grossSales / current.completedCount)
      : 0;
  const prevAvgOrderValue =
    previous.completedCount > 0
      ? Math.round(previous.grossSales / previous.completedCount)
      : 0;

  return {
    totalOrders: kpi("All 주문", current.totalCount, previous.totalCount),
    completedOrders: kpi("Completed Orders", current.completedCount, previous.completedCount),
    grossSales: kpi("Total Revenue", current.grossSales, previous.grossSales, current.currencyCode),
    avgOrderValue: kpi("평균 Order Amount", avgOrderValue, prevAvgOrderValue, current.currencyCode),
    activeConnections: kpi("Active Connections", currentConnections.connected, previousConnections.connected),
    reauthRequiredConnections: kpi("Reauth Required", currentConnections.reauthRequired, previousConnections.reauthRequired),
    webhookFailureRate: kpi("Webhook 실패율", +webhookFailureRate.toFixed(2), +prevWebhookFailureRate.toFixed(2), "%"),
    posForwardFailureRate: kpi("Forward to POS 실패율", +posFailureRate.toFixed(2), +prevPosFailureRate.toFixed(2), "%"),
    catalogSyncSuccessRate: kpi("Sync 성공률", +syncSuccessRate.toFixed(2), +prevSyncSuccessRate.toFixed(2), "%"),
    failedJobs: kpi("실패 작업", currentFailedJobs, previousFailedJobs),
    currencyCode: current.currencyCode,
  };
}

// ─── Time Series ──────────────────────────────────────────────────────────────

export async function getAdminOrdersTimeSeries(
  filters: AdminAnalyticsFilters
): Promise<AdminTrendPoint[]> {
  const rows = await prisma.order.groupBy({
    by: ["orderedAt"],
    where: buildOrderWhere(filters),
    _count: { id: true },
  });

  // Group by date
  const byDate = new Map<string, { total: number; completed: number }>();

  // We need separate queries for total vs completed
  const [totalRows, completedRows] = await Promise.all([
    prisma.$queryRawUnsafe<Array<{ day: string; count: string }>>(
      `SELECT DATE("orderedAt") as day, COUNT(*) as count
       FROM orders
       WHERE "orderedAt" >= $1 AND "orderedAt" <= $2
       ${filters.tenantId ? `AND "tenantId" = '${filters.tenantId}'` : ""}
       ${filters.storeId ? `AND "storeId" = '${filters.storeId}'` : ""}
       GROUP BY DATE("orderedAt") ORDER BY day`,
      filters.from,
      filters.to
    ),
    prisma.$queryRawUnsafe<Array<{ day: string; count: string }>>(
      `SELECT DATE("orderedAt") as day, COUNT(*) as count
       FROM orders
       WHERE "orderedAt" >= $1 AND "orderedAt" <= $2
       AND status = 'COMPLETED'
       ${filters.tenantId ? `AND "tenantId" = '${filters.tenantId}'` : ""}
       ${filters.storeId ? `AND "storeId" = '${filters.storeId}'` : ""}
       GROUP BY DATE("orderedAt") ORDER BY day`,
      filters.from,
      filters.to
    ),
  ]);

  for (const r of totalRows) {
    const day = r.day.toString().slice(0, 10);
    const entry = byDate.get(day) ?? { total: 0, completed: 0 };
    entry.total = Number(r.count);
    byDate.set(day, entry);
  }
  for (const r of completedRows) {
    const day = r.day.toString().slice(0, 10);
    const entry = byDate.get(day) ?? { total: 0, completed: 0 };
    entry.completed = Number(r.count);
    byDate.set(day, entry);
  }

  void rows; // suppress unused warning — needed for TS

  // Build revenue map
  const revenueRows = await prisma.$queryRawUnsafe<Array<{ day: string; total: string }>>(
    `SELECT DATE("orderedAt") as day, COALESCE(SUM("totalAmount"), 0) as total
     FROM orders
     WHERE "orderedAt" >= $1 AND "orderedAt" <= $2
     AND status = 'COMPLETED'
     ${filters.tenantId ? `AND "tenantId" = '${filters.tenantId}'` : ""}
     ${filters.storeId ? `AND "storeId" = '${filters.storeId}'` : ""}
     GROUP BY DATE("orderedAt") ORDER BY day`,
    filters.from,
    filters.to
  );

  const revenueByDate = new Map<string, number>();
  for (const r of revenueRows) {
    revenueByDate.set(r.day.toString().slice(0, 10), Number(r.total));
  }

  return Array.from(byDate.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, v]) => ({
      date,
      totalOrders: v.total,
      completedOrders: v.completed,
      grossSales: revenueByDate.get(date) ?? 0,
    }));
}

export async function getAdminRevenueTimeSeries(
  filters: AdminAnalyticsFilters
): Promise<AdminTrendPoint[]> {
  return getAdminOrdersTimeSeries(filters);
}

// ─── Provider Health ──────────────────────────────────────────────────────────

export async function getAdminProviderHealthBreakdown(
  _filters: AdminAnalyticsFilters
): Promise<AdminProviderHealthRow[]> {
  const rows = await prisma.connection.groupBy({
    by: ["provider", "status"],
    _count: { id: true },
  });

  const map = new Map<string, AdminProviderHealthRow>();
  for (const r of rows) {
    const p = r.provider as string;
    if (!map.has(p)) {
      map.set(p, { provider: p, connected: 0, error: 0, reauthRequired: 0, disconnected: 0, notConnected: 0, total: 0 });
    }
    const entry = map.get(p)!;
    const count = r._count.id;
    entry.total += count;
    switch (r.status as string) {
      case "CONNECTED": entry.connected += count; break;
      case "ERROR": entry.error += count; break;
      case "REAUTH_REQUIRED": entry.reauthRequired += count; break;
      case "DISCONNECTED": entry.disconnected += count; break;
      case "NOT_CONNECTED": entry.notConnected += count; break;
    }
  }

  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export async function getAdminConnectionStatusBreakdown(
  _filters: AdminAnalyticsFilters
): Promise<Record<string, number>> {
  const rows = await prisma.connection.groupBy({
    by: ["status"],
    _count: { id: true },
  });

  return Object.fromEntries(rows.map((r) => [r.status as string, r._count.id]));
}

// ─── Failure Breakdown ────────────────────────────────────────────────────────

export async function getAdminFailureBreakdown(
  filters: AdminAnalyticsFilters
): Promise<AdminFailureBreakdownRow[]> {
  const rows: AdminFailureBreakdownRow[] = [];

  // Webhook failures by provider
  const webhookRows = await prisma.$queryRawUnsafe<Array<{ channelType: string; count: string }>>(
    `SELECT "channelType", COUNT(*) as count
     FROM inbound_webhook_logs
     WHERE "receivedAt" >= $1 AND "receivedAt" <= $2
     AND "processingStatus" = 'FAILED'
     GROUP BY "channelType"`,
    filters.from,
    filters.to
  );
  for (const r of webhookRows) {
    rows.push({ category: "webhook", provider: r.channelType ?? "UNKNOWN", count: Number(r.count) });
  }

  // Sync failures from job_runs
  const syncRows = await prisma.jobRun.groupBy({
    by: ["provider"],
    where: {
      jobType: "CATALOG_SYNC",
      status: "FAILED",
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
    },
    _count: { id: true },
  });
  for (const r of syncRows) {
    rows.push({ category: "sync", provider: r.provider ?? "UNKNOWN", count: r._count.id });
  }

  // Refresh failures from job_runs
  const refreshRows = await prisma.jobRun.groupBy({
    by: ["provider"],
    where: {
      jobType: "CONNECTION_REFRESH_CHECK",
      status: "FAILED",
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
    },
    _count: { id: true },
  });
  for (const r of refreshRows) {
    rows.push({ category: "refresh", provider: r.provider ?? "UNKNOWN", count: r._count.id });
  }

  // POS forwarding failures
  const posRows = await prisma.order.groupBy({
    by: ["storeId"],
    where: {
      posForwardingRequired: true,
      posSubmissionStatus: "FAILED",
      orderedAt: { gte: filters.from, lte: filters.to },
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
    },
    _count: { id: true },
  });
  for (const r of posRows) {
    rows.push({ category: "pos_forwarding", provider: r.storeId, count: r._count.id });
  }

  return rows.sort((a, b) => b.count - a.count);
}

// ─── Top Problem Stores ───────────────────────────────────────────────────────

export async function getAdminTopProblemStores(
  filters: AdminAnalyticsFilters,
  limit = 10
): Promise<AdminProblemStoreRow[]> {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [reauthConnections, syncFailed, webhookFailed, posFailed, failedJobs] = await Promise.all([
    // REAUTH_REQUIRED connections per store
    prisma.connection.groupBy({
      by: ["storeId"],
      where: { status: "REAUTH_REQUIRED" },
      _count: { id: true },
    }),
    // Sync failures per store in last 7 days
    prisma.jobRun.groupBy({
      by: ["storeId"],
      where: { jobType: "CATALOG_SYNC", status: "FAILED", createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
    // Webhook failures per store in last 7 days
    prisma.$queryRawUnsafe<Array<{ storeId: string; count: string }>>(
      `SELECT "storeId", COUNT(*) as count
       FROM inbound_webhook_logs
       WHERE "receivedAt" >= $1 AND "processingStatus" = 'FAILED' AND "storeId" IS NOT NULL
       GROUP BY "storeId"`,
      sevenDaysAgo
    ),
    // POS forwarding failures
    prisma.order.groupBy({
      by: ["storeId"],
      where: {
        posForwardingRequired: true,
        posSubmissionStatus: "FAILED",
        orderedAt: { gte: sevenDaysAgo },
      },
      _count: { id: true },
    }),
    // Failed jobs per store
    prisma.jobRun.groupBy({
      by: ["storeId"],
      where: { status: "FAILED", createdAt: { gte: sevenDaysAgo } },
      _count: { id: true },
    }),
  ]);

  // Build score map
  const scores = new Map<
    string,
    { reauthRequired: number; syncFailed: number; webhookFailed: number; posFailed: number; failedJobsCount: number }
  >();

  function get(storeId: string) {
    if (!scores.has(storeId))
      scores.set(storeId, { reauthRequired: 0, syncFailed: 0, webhookFailed: 0, posFailed: 0, failedJobsCount: 0 });
    return scores.get(storeId)!;
  }

  for (const r of reauthConnections) if (r.storeId) get(r.storeId).reauthRequired += r._count.id;
  for (const r of syncFailed) if (r.storeId) get(r.storeId).syncFailed += r._count.id;
  for (const r of webhookFailed) if (r.storeId) get(r.storeId).webhookFailed += Number(r.count);
  for (const r of posFailed) if (r.storeId) get(r.storeId).posFailed += r._count.id;
  for (const r of failedJobs) if (r.storeId) get(r.storeId).failedJobsCount += r._count.id;

  // Score formula
  const scored = Array.from(scores.entries()).map(([storeId, v]) => {
    const score =
      v.reauthRequired * 5 +
      v.syncFailed * 3 +
      (v.webhookFailed >= 5 ? 4 : 0) +
      (v.posFailed >= 3 ? 4 : 0) +
      (v.failedJobsCount > 0 ? 2 : 0);
    const labels: string[] = [];
    if (v.reauthRequired > 0) labels.push("REAUTH_REQUIRED");
    if (v.syncFailed > 0) labels.push("SYNC_FAILED");
    if (v.webhookFailed >= 5) labels.push("WEBHOOK_ERRORS");
    if (v.posFailed >= 3) labels.push("POS_FAILED");
    if (v.failedJobsCount > 0) labels.push("FAILED_JOBS");
    return { storeId, score, labels, ...v };
  });

  const topStoreIds = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.storeId);

  if (topStoreIds.length === 0) return [];

  const stores = await prisma.store.findMany({
    where: { id: { in: topStoreIds } },
    select: { id: true, name: true, tenantId: true, tenant: { select: { displayName: true } } },
  });

  const storeMap = new Map(stores.map((s) => [s.id, s]));

  return topStoreIds
    .map((storeId) => {
      const store = storeMap.get(storeId);
      const s = scored.find((x) => x.storeId === storeId)!;
      return {
        storeId,
        storeName: store?.name ?? storeId,
        tenantId: store?.tenantId ?? "",
        tenantDisplayName: store?.tenant.displayName ?? "",
        problemScore: s.score,
        labels: s.labels,
        reauthRequired: s.reauthRequired,
        syncFailed: s.syncFailed,
        webhookFailed: s.webhookFailed,
        posFailed: s.posFailed,
        failedJobsCount: s.failedJobsCount,
      };
    })
    .filter((r) => r.problemScore > 0);
}

// ─── Attention Summary ────────────────────────────────────────────────────────

export async function getAdminAttentionSummary(
  filters: AdminAnalyticsFilters
): Promise<AdminAttentionSummary> {
  const { listAdminAttentionItems } = await import("./admin-attention.service");
  return listAdminAttentionItems(filters);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function fetchOrderAgg(filters: AdminAnalyticsFilters) {
  const [totalAgg, completedAgg] = await Promise.all([
    prisma.order.aggregate({
      where: buildOrderWhere(filters),
      _count: { id: true },
    }),
    prisma.order.aggregate({
      where: { ...buildOrderWhere(filters), status: "COMPLETED" },
      _count: { id: true },
      _sum: { totalAmount: true },
    }),
  ]);

  const currencyRows = await prisma.order.findFirst({
    where: { ...buildOrderWhere(filters), status: "COMPLETED" },
    select: { currencyCode: true },
  });

  return {
    totalCount: totalAgg._count.id,
    completedCount: completedAgg._count.id,
    grossSales: completedAgg._sum.totalAmount ?? 0,
    currencyCode: currencyRows?.currencyCode ?? "NZD",
  };
}

async function fetchConnectionCounts(filters: AdminAnalyticsFilters) {
  const rows = await prisma.connection.groupBy({
    by: ["status"],
    _count: { id: true },
  });
  const map = Object.fromEntries(rows.map((r) => [r.status as string, r._count.id]));
  void filters;
  return {
    connected: map["CONNECTED"] ?? 0,
    reauthRequired: map["REAUTH_REQUIRED"] ?? 0,
  };
}

async function fetchWebhookCounts(filters: AdminAnalyticsFilters) {
  const [total, failed] = await Promise.all([
    prisma.inboundWebhookLog.count({
      where: { receivedAt: { gte: filters.from, lte: filters.to } },
    }),
    prisma.inboundWebhookLog.count({
      where: { receivedAt: { gte: filters.from, lte: filters.to }, processingStatus: "FAILED" },
    }),
  ]);
  return { total, failed };
}

async function fetchPosFailureCounts(filters: AdminAnalyticsFilters) {
  const [total, failed] = await Promise.all([
    prisma.order.count({
      where: {
        orderedAt: { gte: filters.from, lte: filters.to },
        posForwardingRequired: true,
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      },
    }),
    prisma.order.count({
      where: {
        orderedAt: { gte: filters.from, lte: filters.to },
        posForwardingRequired: true,
        posSubmissionStatus: "FAILED",
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      },
    }),
  ]);
  return { total, failed };
}

async function fetchSyncJobCounts(filters: AdminAnalyticsFilters) {
  const [total, failed] = await Promise.all([
    prisma.jobRun.count({
      where: {
        jobType: "CATALOG_SYNC",
        createdAt: { gte: filters.from, lte: filters.to },
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      },
    }),
    prisma.jobRun.count({
      where: {
        jobType: "CATALOG_SYNC",
        status: "FAILED",
        createdAt: { gte: filters.from, lte: filters.to },
        ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
        ...(filters.storeId ? { storeId: filters.storeId } : {}),
      },
    }),
  ]);
  return { total, failed };
}

async function fetchFailedJobCount(filters: AdminAnalyticsFilters): Promise<number> {
  return prisma.jobRun.count({
    where: {
      status: "FAILED",
      createdAt: { gte: filters.from, lte: filters.to },
      ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
      ...(filters.storeId ? { storeId: filters.storeId } : {}),
    },
  });
}

function buildOrderWhere(filters: AdminAnalyticsFilters) {
  return {
    orderedAt: { gte: filters.from, lte: filters.to },
    ...(filters.tenantId ? { tenantId: filters.tenantId } : {}),
    ...(filters.storeId ? { storeId: filters.storeId } : {}),
    ...(filters.sourceChannel ? { sourceChannel: filters.sourceChannel as never } : {}),
  };
}

function kpi(label: string, value: number, previousValue: number, unit?: string): AdminKpiCard {
  const delta =
    previousValue === 0
      ? value === 0 ? 0 : 100
      : +((((value - previousValue) / previousValue) * 100).toFixed(1));
  return { label, value, previousValue, delta, unit };
}
