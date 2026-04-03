/**
 * Backoffice Reports Service — Phase 1.
 *
 * Provides period-scoped operational reports for a store:
 * - Daily order count and revenue series
 * - Orders-by-channel breakdown
 * - Order status funnel
 * - Top 5 products by order-line frequency
 * - 7×24 peak-hour heatmap
 *
 * All queries are scoped to storeId.
 */

import { prisma } from "@/lib/prisma";
import type {
  BackofficeReportData,
  BackofficeDailyPoint,
  BackofficeChannelReportItem,
  BackofficeStatusFunnelItem,
  BackofficeTopProduct,
  BackofficePeakHourCell,
  BackofficeOrderChannel,
} from "@/types/backoffice";

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_FUNNEL_ORDER = [
  "RECEIVED",
  "ACCEPTED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
  "CANCELLED",
] as const;

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const SHORT_WEEKDAY = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;
const SHORT_MONTH = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatDateLabel(dateKey: string): string {
  const d = new Date(dateKey + "T00:00:00.000Z");
  const wd = SHORT_WEEKDAY[d.getUTCDay()];
  const day = d.getUTCDate();
  const mo = SHORT_MONTH[d.getUTCMonth()];
  return `${wd} ${day} ${mo}`;
}

// ─── getReportData ────────────────────────────────────────────────────────────

/**
 * Fetch the full operational report payload for the given store and period.
 *
 * @param storeId  Store to scope all queries to.
 * @param days     Number of days to look back (default 30, max 90).
 */
export async function getReportData(
  storeId: string,
  days: number = DEFAULT_DAYS
): Promise<BackofficeReportData> {
  const safeDays = Math.min(Math.max(1, Math.floor(days)), MAX_DAYS);

  const toDate = new Date();
  toDate.setUTCHours(23, 59, 59, 999);

  const fromDate = new Date(toDate);
  fromDate.setUTCDate(fromDate.getUTCDate() - (safeDays - 1));
  fromDate.setUTCHours(0, 0, 0, 0);

  const where = {
    storeId,
    orderedAt: { gte: fromDate, lte: toDate },
  } as const;

  // Fetch all orders in the window (select only the fields we need)
  const [orders, orderItems] = await Promise.all([
    prisma.order.findMany({
      where,
      select: {
        id: true,
        status: true,
        sourceChannel: true,
        orderedAt: true,
        totalAmount: true,
        currencyCode: true,
      },
    }),
    prisma.orderItem.findMany({
      where: { storeId, order: { orderedAt: { gte: fromDate, lte: toDate } } },
      select: { productName: true, quantity: true },
    }),
  ]);

  // ── Daily series ────────────────────────────────────────────────────────────

  const dailyMap = new Map<string, { orderCount: number; revenueMinor: number }>();

  // Pre-populate every day in the range so gaps show as zero
  for (let i = 0; i < safeDays; i++) {
    const key = toDateKey(addDays(fromDate, i));
    dailyMap.set(key, { orderCount: 0, revenueMinor: 0 });
  }

  for (const o of orders) {
    const key = toDateKey(o.orderedAt);
    const entry = dailyMap.get(key);
    if (entry) {
      entry.orderCount++;
      entry.revenueMinor += o.totalAmount;
    }
  }

  const dailySeries: BackofficeDailyPoint[] = Array.from(dailyMap.entries()).map(
    ([dateKey, v]) => ({
      dateKey,
      dateLabel: formatDateLabel(dateKey),
      orderCount: v.orderCount,
      revenueMinor: v.revenueMinor,
    })
  );

  // ── Channel breakdown ───────────────────────────────────────────────────────

  const channelMap = new Map<
    BackofficeOrderChannel,
    { orderCount: number; revenueMinor: number }
  >();
  for (const o of orders) {
    const ch = (o.sourceChannel ?? "UNKNOWN") as BackofficeOrderChannel;
    const entry = channelMap.get(ch) ?? { orderCount: 0, revenueMinor: 0 };
    entry.orderCount++;
    entry.revenueMinor += o.totalAmount;
    channelMap.set(ch, entry);
  }

  const channelBreakdown: BackofficeChannelReportItem[] = Array.from(
    channelMap.entries()
  )
    .map(([channel, v]) => ({ channel, ...v }))
    .sort((a, b) => b.orderCount - a.orderCount);

  // ── Status funnel ───────────────────────────────────────────────────────────

  const statusMap = new Map<string, number>();
  for (const o of orders) {
    statusMap.set(o.status, (statusMap.get(o.status) ?? 0) + 1);
  }

  const statusFunnel: BackofficeStatusFunnelItem[] = STATUS_FUNNEL_ORDER.map(
    (status) => ({ status, count: statusMap.get(status) ?? 0 })
  ).filter((item) => item.count > 0);

  // ── Top products ────────────────────────────────────────────────────────────

  const productMap = new Map<
    string,
    { lineCount: number; quantitySold: number }
  >();
  for (const item of orderItems) {
    const entry = productMap.get(item.productName) ?? {
      lineCount: 0,
      quantitySold: 0,
    };
    entry.lineCount++;
    entry.quantitySold += item.quantity;
    productMap.set(item.productName, entry);
  }

  const topProducts: BackofficeTopProduct[] = Array.from(
    productMap.entries()
  )
    .map(([productName, v]) => ({ productName, ...v }))
    .sort((a, b) => b.lineCount - a.lineCount)
    .slice(0, 5);

  // ── Peak-hour heatmap ───────────────────────────────────────────────────────

  const heatMatrix: number[][] = Array.from({ length: 7 }, () =>
    new Array(24).fill(0)
  );
  for (const o of orders) {
    const wd = o.orderedAt.getUTCDay();
    const hr = o.orderedAt.getUTCHours();
    heatMatrix[wd][hr]++;
  }

  const peakHourCells: BackofficePeakHourCell[] = [];
  let peakHourMax = 0;
  for (let wd = 0; wd < 7; wd++) {
    for (let hr = 0; hr < 24; hr++) {
      const count = heatMatrix[wd][hr];
      peakHourCells.push({ weekday: wd, hour: hr, orderCount: count });
      if (count > peakHourMax) peakHourMax = count;
    }
  }

  // Currency from first order, fallback NZD
  const currencyCode = orders.find((o) => o.currencyCode)?.currencyCode ?? "NZD";

  return {
    days: safeDays,
    fromDate: toDateKey(fromDate),
    toDate: toDateKey(toDate),
    currencyCode,
    dailySeries,
    channelBreakdown,
    statusFunnel,
    topProducts,
    peakHourCells,
    peakHourMax,
  };
}
