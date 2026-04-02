/**
 * Owner Reports — filter parsing and date range helpers.
 *
 * All date boundaries are returned as UTC Date objects for use in Prisma queries.
 * Preset ranges are computed in the tenant's IANA timezone (fallback Pacific/Auckland).
 */

import type { OwnerReportFilters, OwnerReportRangePreset, OrderSourceChannel } from "@/types/owner-reports";

const DEFAULT_TIMEZONE = "Pacific/Auckland";
const DEFAULT_PRESET: OwnerReportRangePreset = "last7";
const ALL_CHANNELS: OrderSourceChannel[] = [
  "POS", "UBER_EATS", "DOORDASH", "ONLINE", "SUBSCRIPTION", "MANUAL",
];

export interface ReportDateRange {
  from: Date;
  to: Date;
}

/** Parses URLSearchParams into a typed OwnerReportFilters, falling back safely. */
export function parseReportFilters(params: URLSearchParams): OwnerReportFilters {
  // preset
  const rawPreset = params.get("preset") ?? "";
  const VALID_PRESETS: OwnerReportRangePreset[] = [
    "today", "yesterday", "last7", "last30", "thisMonth", "lastMonth", "custom",
  ];
  const preset: OwnerReportRangePreset = VALID_PRESETS.includes(rawPreset as OwnerReportRangePreset)
    ? (rawPreset as OwnerReportRangePreset)
    : DEFAULT_PRESET;

  // from / to (only relevant for custom)
  const from = isValidDate(params.get("from") ?? "") ? (params.get("from") ?? undefined) : undefined;
  const to = isValidDate(params.get("to") ?? "") ? (params.get("to") ?? undefined) : undefined;

  // storeIds (comma-separated)
  const rawStores = params.get("storeIds");
  const storeIds = rawStores ? rawStores.split(",").filter(Boolean) : undefined;

  // channels (comma-separated)
  const rawChannels = params.get("channels");
  const channels = rawChannels
    ? (rawChannels
        .split(",")
        .filter((c): c is OrderSourceChannel => ALL_CHANNELS.includes(c as OrderSourceChannel)))
    : undefined;

  // comparePrevious
  const comparePrevious = params.get("comparePrevious") !== "false";

  return { preset, from, to, storeIds, channels, comparePrevious };
}

/** Converts OwnerReportFilters to a serializable query-param record. */
export function filtersToParams(filters: OwnerReportFilters): Record<string, string> {
  const params: Record<string, string> = {};
  params.preset = filters.preset;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.storeIds?.length) params.storeIds = filters.storeIds.join(",");
  if (filters.channels?.length) params.channels = filters.channels.join(",");
  params.comparePrevious = String(filters.comparePrevious);
  return params;
}

/** Resolves a preset to UTC date boundaries in the given IANA timezone. */
export function resolvePresetRange(
  preset: OwnerReportRangePreset,
  timezone: string = DEFAULT_TIMEZONE,
  fromOverride?: string,
  toOverride?: string
): ReportDateRange {
  const tz = safeTimezone(timezone);
  const now = new Date();
  const today = toLocalParts(now, tz);

  switch (preset) {
    case "today": {
      const start = localMidnight(today, tz);
      const end = localEndOfDay(today, tz);
      return { from: start, to: end };
    }
    case "yesterday": {
      const yest = addDays(today, -1);
      return { from: localMidnight(yest, tz), to: localEndOfDay(yest, tz) };
    }
    case "last7": {
      const start = addDays(today, -6);
      return { from: localMidnight(start, tz), to: localEndOfDay(today, tz) };
    }
    case "last30": {
      const start = addDays(today, -29);
      return { from: localMidnight(start, tz), to: localEndOfDay(today, tz) };
    }
    case "thisMonth": {
      const start = { year: today.year, month: today.month, day: 1 };
      return { from: localMidnight(start, tz), to: localEndOfDay(today, tz) };
    }
    case "lastMonth": {
      const prevMonth = today.month === 1
        ? { year: today.year - 1, month: 12 }
        : { year: today.year, month: today.month - 1 };
      const start = { ...prevMonth, day: 1 };
      const lastDay = daysInMonth(prevMonth.year, prevMonth.month);
      const end = { ...prevMonth, day: lastDay };
      return { from: localMidnight(start, tz), to: localEndOfDay(end, tz) };
    }
    case "custom": {
      if (fromOverride && toOverride && isValidDate(fromOverride) && isValidDate(toOverride)) {
        const [fy, fm, fd] = fromOverride.split("-").map(Number);
        const [ty, tm, td] = toOverride.split("-").map(Number);
        return {
          from: localMidnight({ year: fy, month: fm, day: fd }, tz),
          to: localEndOfDay({ year: ty, month: tm, day: td }, tz),
        };
      }
      // fallback to last7
      const start = addDays(today, -6);
      return { from: localMidnight(start, tz), to: localEndOfDay(today, tz) };
    }
  }
}

/** Derives a comparison period of the same length immediately before from/to. */
export function resolveComparePeriod(from: Date, to: Date): ReportDateRange {
  const durationMs = to.getTime() - from.getTime();
  return {
    from: new Date(from.getTime() - durationMs - 1),
    to: new Date(from.getTime() - 1),
  };
}

/** Formats a UTC Date to YYYY-MM-DD in the given timezone. */
export function formatDateKey(date: Date, timezone: string = DEFAULT_TIMEZONE): string {
  const tz = safeTimezone(timezone);
  const parts = toLocalParts(date, tz);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

/** Generates an ordered list of YYYY-MM-DD keys from from to to (inclusive) in timezone. */
export function generateDateKeys(from: Date, to: Date, timezone: string = DEFAULT_TIMEZONE): string[] {
  const tz = safeTimezone(timezone);
  const keys: string[] = [];
  const current = new Date(from);
  while (current <= to) {
    keys.push(formatDateKey(current, tz));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return keys;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s));
}

function safeTimezone(tz: string): string {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

interface LocalDate {
  year: number;
  month: number;
  day: number;
}

function toLocalParts(date: Date, timezone: string): LocalDate {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { year, month, day };
}

function localToUtc(localStr: string, timezone: string): Date {
  // Treat the local string as UTC to get a starting estimate.
  const naive = new Date(`${localStr}Z`);

  // Format naive in the target timezone (full date + time) to find the actual offset.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = fmt.formatToParts(naive);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)?.value ?? "0");

  // Build the UTC ms that naive "looks like" in local time.
  const naiveAsLocalMs = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second")
  );

  // Round to the nearest minute to avoid sub-second precision loss from Intl.
  const offsetMs =
    Math.round((naiveAsLocalMs - naive.getTime()) / 60000) * 60000;
  return new Date(naive.getTime() - offsetMs);
}

function localMidnight(d: LocalDate, tz: string): Date {
  return localToUtc(
    `${d.year}-${pad(d.month)}-${pad(d.day)}T00:00:00`,
    tz
  );
}

function localEndOfDay(d: LocalDate, tz: string): Date {
  return localToUtc(
    `${d.year}-${pad(d.month)}-${pad(d.day)}T23:59:59.999`,
    tz
  );
}

function addDays(d: LocalDate, n: number): LocalDate {
  const date = new Date(Date.UTC(d.year, d.month - 1, d.day + n));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}
