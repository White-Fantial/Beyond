/**
 * Admin System Service — top-level dashboard orchestrator.
 *
 * Calls health, metrics, and incident services concurrently and assembles
 * the full AdminSystemDashboard object for the /admin/system page.
 */

import type { AdminSystemDashboard, AdminSystemOverview } from "@/types/admin-system";
import {
  getDatabaseHealth,
  getJobsHealth,
  getWebhookHealth,
  getIntegrationsHealth,
  getOrderPipelineHealth,
  getCatalogSyncHealth,
  getBillingHealth,
} from "./admin-health.service";
import { getAdminSystemMetrics } from "./admin-metrics.service";
import { getRecentAdminIncidents } from "./admin-incident.service";
import {
  aggregateHealth,
  statusToSeverity,
} from "@/lib/admin/system/thresholds";

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getAdminSystemDashboard(): Promise<AdminSystemDashboard> {
  const fetchedAt = new Date().toISOString();

  // Fetch everything in parallel
  const [
    dbHealth,
    jobsHealth,
    webhookHealth,
    integrationsHealth,
    orderHealth,
    catalogHealth,
    billingHealth,
    metrics24h,
    metrics7d,
  ] = await Promise.all([
    getDatabaseHealth(),
    getJobsHealth(),
    getWebhookHealth(),
    getIntegrationsHealth(),
    getOrderPipelineHealth(),
    getCatalogSyncHealth(),
    getBillingHealth(),
    getAdminSystemMetrics("24h"),
    getAdminSystemMetrics("7d"),
  ]);

  const components = [
    dbHealth,
    jobsHealth,
    webhookHealth,
    integrationsHealth,
    orderHealth,
    catalogHealth,
    billingHealth,
  ];

  // Derive incidents from metrics
  const incidents = getRecentAdminIncidents(metrics24h, metrics7d);

  // Build overview
  const overallStatus = aggregateHealth(components.map((c) => c.status));
  const overallSeverity = statusToSeverity(overallStatus);
  const criticalCount = components.filter((c) => c.severity === "CRITICAL").length;
  const degradedCount = components.filter((c) => c.status === "DEGRADED" || c.status === "DOWN").length;

  const overview: AdminSystemOverview = {
    overallStatus,
    overallSeverity,
    criticalCount,
    degradedCount,
    incidentCount: incidents.length,
    checkedAt: fetchedAt,
  };

  return {
    overview,
    components,
    metrics24h,
    metrics7d,
    incidents,
    fetchedAt,
  };
}
