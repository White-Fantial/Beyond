/**
 * Filter parameter parsing for the Admin Logs Console.
 * Reads raw query-string values and returns cleaned, validated params.
 */

import type { AdminLogType, AdminLogFilterParams } from "@/types/admin-logs";

export const LOG_PAGE_SIZE = 20;
export const LOG_MAX_PAGE_SIZE = 100;

/** Valid log types — used to guard free-text query param. */
const VALID_LOG_TYPES = new Set<AdminLogType>([
  "AUDIT",
  "CONNECTION_ACTION",
  "WEBHOOK",
  "ORDER_EVENT",
]);

export interface ParsedAdminLogFilters {
  q: string;
  logType: AdminLogType | undefined;
  from: Date | undefined;
  to: Date | undefined;
  tenantId: string | undefined;
  storeId: string | undefined;
  userId: string | undefined;
  provider: string | undefined;
  actionType: string | undefined;
  status: string | undefined;
  errorOnly: boolean;
  targetId: string | undefined;
  orderId: string | undefined;
  page: number;
  pageSize: number;
  skip: number;
}

export function parseAdminLogFilters(
  raw: AdminLogFilterParams
): ParsedAdminLogFilters {
  const q = (raw.q ?? "").trim();

  const rawLogType = (raw.logType ?? "").toUpperCase();
  const logType = VALID_LOG_TYPES.has(rawLogType as AdminLogType)
    ? (rawLogType as AdminLogType)
    : undefined;

  const from = raw.from ? parseDate(raw.from) : undefined;
  const to = raw.to ? parseDate(raw.to) : undefined;

  const page = Math.max(1, Number(raw.page ?? 1) || 1);
  const pageSize = Math.min(
    LOG_MAX_PAGE_SIZE,
    Math.max(1, Number(raw.pageSize ?? LOG_PAGE_SIZE) || LOG_PAGE_SIZE)
  );

  return {
    q,
    logType,
    from,
    to,
    tenantId: nonempty(raw.tenantId),
    storeId: nonempty(raw.storeId),
    userId: nonempty(raw.userId),
    provider: nonempty(raw.provider),
    actionType: nonempty(raw.actionType),
    status: nonempty(raw.status),
    errorOnly: raw.errorOnly === "1" || raw.errorOnly === "true",
    targetId: nonempty(raw.targetId),
    orderId: nonempty(raw.orderId),
    page,
    pageSize,
    skip: (page - 1) * pageSize,
  };
}

function nonempty(v: string | undefined): string | undefined {
  return v && v.trim() ? v.trim() : undefined;
}

function parseDate(s: string): Date | undefined {
  const d = new Date(s);
  return isNaN(d.getTime()) ? undefined : d;
}
