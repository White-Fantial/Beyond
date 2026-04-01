/**
 * Admin Incident Service — derive and surface operational incidents.
 */

import type {
  AdminSystemIncident,
  AdminSystemMetrics,
  MetricsWindow,
} from "@/types/admin-system";
import { deriveIncidents } from "@/lib/admin/system/incidents";

/**
 * Derive incidents from 24h and 7d metrics snapshots.
 *
 * Returns incidents from the 24h window; falls back to 7d for low-frequency
 * issues that wouldn't show up in a short window.
 */
export function getRecentAdminIncidents(
  metrics24h: AdminSystemMetrics,
  metrics7d: AdminSystemMetrics
): AdminSystemIncident[] {
  const incidents24h = deriveIncidents(metrics24h, "24h");
  const incidents7d = deriveIncidents(metrics7d, "7d");

  // Merge: keep 24h incidents; add 7d-only incidents that have no 24h equivalent
  const seenKeys = new Set(incidents24h.map((i) => i.key));
  const extra7d = incidents7d.filter((i) => !seenKeys.has(i.key));

  const merged = [...incidents24h, ...extra7d];

  // Sort CRITICAL first, then WARN, then INFO; within same severity sort by count desc
  const order: Record<string, number> = { CRITICAL: 0, WARN: 1, INFO: 2 };
  merged.sort(
    (a, b) =>
      (order[a.severity] ?? 3) - (order[b.severity] ?? 3) || b.count - a.count
  );

  return merged;
}

export type { AdminSystemIncident, MetricsWindow };
