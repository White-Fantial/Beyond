/**
 * Timezone-aware date range helpers.
 * Used for aggregating "today" and "this month" metrics on the owner dashboard.
 *
 * Note: These helpers use the Intl API to map a wall-clock date to UTC boundaries,
 * which is safe for server-side use without external dependencies.
 */

const DEFAULT_TIMEZONE = "Pacific/Auckland";

/**
 * Returns the UTC start (inclusive) and end (exclusive) of the current calendar
 * day in the given IANA timezone.
 */
export function getTodayRange(timezone: string = DEFAULT_TIMEZONE): {
  start: Date;
  end: Date;
} {
  const tz = safeTimezone(timezone);
  const nowLocal = toLocalParts(new Date(), tz);
  const startLocal = `${nowLocal.year}-${pad(nowLocal.month)}-${pad(nowLocal.day)}T00:00:00`;
  const endLocal = `${nowLocal.year}-${pad(nowLocal.month)}-${pad(nowLocal.day)}T23:59:59.999`;

  return {
    start: localToUtc(startLocal, tz),
    end: localToUtc(endLocal, tz),
  };
}

/**
 * Returns the UTC start (inclusive) and end (exclusive) of the current calendar
 * month in the given IANA timezone.
 */
export function getMonthRange(timezone: string = DEFAULT_TIMEZONE): {
  start: Date;
  end: Date;
} {
  const tz = safeTimezone(timezone);
  const nowLocal = toLocalParts(new Date(), tz);
  const startLocal = `${nowLocal.year}-${pad(nowLocal.month)}-01T00:00:00`;

  // First day of next month
  let nextMonth = nowLocal.month + 1;
  let nextYear = nowLocal.year;
  if (nextMonth > 12) {
    nextMonth = 1;
    nextYear += 1;
  }
  const endLocal = `${nextYear}-${pad(nextMonth)}-01T00:00:00`;

  return {
    start: localToUtc(startLocal, tz),
    end: localToUtc(endLocal, tz),
  };
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

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

interface LocalParts {
  year: number;
  month: number;
  day: number;
}

function toLocalParts(date: Date, timezone: string): LocalParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA format: YYYY-MM-DD
  const [year, month, day] = formatter.format(date).split("-").map(Number);
  return { year, month, day };
}

/**
 * Converts a local date-time string (YYYY-MM-DDTHH:mm:ss) in the given
 * timezone to a UTC Date.
 */
function localToUtc(localDateTimeStr: string, timezone: string): Date {
  // We use the fact that `new Date("YYYY-MM-DDTHH:mm:ss")` is treated as local
  // time in Node, but we actually want to interpret it in `timezone`. A reliable
  // cross-platform approach is to compare a known UTC instant with what the
  // Intl formatter says about that instant in the target timezone.
  //
  // Strategy: use the Date constructor with an ISO string and brute-force offset.
  const naive = new Date(`${localDateTimeStr}Z`); // treat as UTC first
  // Find the UTC offset by asking Intl what local time corresponds to `naive`
  const localParts = toLocalParts(naive, timezone);
  const naiveLocal = new Date(
    `${localParts.year}-${pad(localParts.month)}-${pad(localParts.day)}T${localDateTimeStr.slice(11)}Z`
  );
  const offsetMs = naiveLocal.getTime() - naive.getTime();
  return new Date(naive.getTime() - offsetMs);
}
