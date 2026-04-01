/**
 * Query-string parser and default values for Admin Analytics filters.
 */
import type { AdminAnalyticsFilters } from "@/types/admin-analytics";

const DEFAULT_RANGE_DAYS = 30;

export function parseAdminAnalyticsFilters(
  searchParams: Record<string, string | string[] | undefined>
): AdminAnalyticsFilters {
  const now = new Date();

  const toRaw = safeString(searchParams["to"]);
  const fromRaw = safeString(searchParams["from"]);

  const to = toRaw ? parseDate(toRaw, now) : now;
  const from = fromRaw
    ? parseDate(fromRaw, subtractDays(now, DEFAULT_RANGE_DAYS))
    : subtractDays(to, DEFAULT_RANGE_DAYS);

  // Ensure from is not after to
  const safeFrom = from <= to ? from : subtractDays(to, DEFAULT_RANGE_DAYS);

  return {
    from: startOfDay(safeFrom),
    to: endOfDay(to),
    tenantId: safeString(searchParams["tenantId"]) || undefined,
    storeId: safeString(searchParams["storeId"]) || undefined,
    provider: safeString(searchParams["provider"]) || undefined,
    sourceChannel: safeString(searchParams["sourceChannel"]) || undefined,
    connectionStatus: safeString(searchParams["connectionStatus"]) || undefined,
  };
}

/** Return the previous period range of the same duration as from..to */
export function getPreviousPeriod(filters: AdminAnalyticsFilters): { from: Date; to: Date } {
  const duration = filters.to.getTime() - filters.from.getTime();
  const to = new Date(filters.from.getTime() - 1);
  const from = new Date(to.getTime() - duration);
  return { from, to };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function safeString(v: string | string[] | undefined): string {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

function parseDate(raw: string, fallback: Date): Date {
  const d = new Date(raw);
  return isNaN(d.getTime()) ? fallback : d;
}

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
