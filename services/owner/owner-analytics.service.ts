/**
 * Owner Analytics Service — Phase 9: Advanced Analytics & Forecasting.
 *
 * All functions enforce tenantId scoping so data from other tenants
 * is never exposed regardless of the caller's role.
 */
import { prisma } from "@/lib/prisma";
import type {
  HeatmapData,
  HeatmapCell,
  ForecastData,
  ForecastPoint,
  ForecastHorizon,
  ProductionEstimatesData,
  StoreProductionEstimate,
  ProductionDayEstimate,
  ChurnRiskData,
  ChurnRiskCustomer,
  ChurnRiskLevel,
} from "@/types/owner-analytics";

// ─── Constants ────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** Recency window for churn risk analysis (days). */
const CHURN_RECENCY_WINDOW_DAYS = 90;

/** Thresholds (ratio of recent vs prior order frequency) for risk classification. */
const CHURN_HIGH_THRESHOLD = 0.4;
const CHURN_MEDIUM_THRESHOLD = 0.7;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

function toDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Return a Date for midnight UTC on the given YYYY-MM-DD string. */
function parseUtcDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

/**
 * Simple ordinary-least-squares linear regression.
 * Returns { slope, intercept } for y = intercept + slope * x.
 */
function linearRegression(
  points: { x: number; y: number }[]
): { slope: number; intercept: number } {
  const n = points.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: points[0].y };

  const meanX = points.reduce((s, p) => s + p.x, 0) / n;
  const meanY = points.reduce((s, p) => s + p.y, 0) / n;

  let ssXX = 0;
  let ssXY = 0;
  for (const p of points) {
    ssXX += (p.x - meanX) ** 2;
    ssXY += (p.x - meanX) * (p.y - meanY);
  }

  const slope = ssXX === 0 ? 0 : ssXY / ssXX;
  const intercept = meanY - slope * meanX;
  return { slope, intercept };
}

/**
 * Compute residual standard deviation for a regression fit.
 * Used to produce a simple confidence interval.
 */
function residualStdDev(
  points: { x: number; y: number }[],
  slope: number,
  intercept: number
): number {
  const n = points.length;
  if (n < 2) return 0;
  const sse = points.reduce((s, p) => {
    const predicted = intercept + slope * p.x;
    return s + (p.y - predicted) ** 2;
  }, 0);
  return Math.sqrt(sse / (n - 2));
}

// ─── getHeatmapData ───────────────────────────────────────────────────────────

/**
 * Aggregate orders by weekday × hour into a heatmap matrix.
 *
 * @param tenantId  Tenant scoping (required).
 * @param storeId   Optional: restrict to a single store.
 * @param from      Optional start date (YYYY-MM-DD). Defaults to 90 days ago.
 * @param to        Optional end date (YYYY-MM-DD). Defaults to today.
 */
export async function getHeatmapData(
  tenantId: string,
  storeId?: string,
  from?: string,
  to?: string
): Promise<HeatmapData> {
  const toDate = to ? parseUtcDate(to) : new Date();
  const fromDate = from ? parseUtcDate(from) : addDays(toDate, -90);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(storeId ? { storeId } : {}),
      orderedAt: { gte: fromDate, lte: toDate },
      status: { notIn: ["CANCELLED"] },
    },
    select: { orderedAt: true },
  });

  // Build a 7×24 count matrix
  const matrix: number[][] = Array.from({ length: 7 }, () => new Array(24).fill(0));

  for (const order of orders) {
    const weekday = order.orderedAt.getUTCDay();
    const hour = order.orderedAt.getUTCHours();
    matrix[weekday][hour]++;
  }

  const cells: HeatmapCell[] = [];
  let maxCount = 0;
  let peakWeekday = 0;
  let peakHour = 0;

  for (let wd = 0; wd < 7; wd++) {
    for (let h = 0; h < 24; h++) {
      const count = matrix[wd][h];
      cells.push({ weekday: wd, hour: h, orderCount: count });
      if (count > maxCount) {
        maxCount = count;
        peakWeekday = wd;
        peakHour = h;
      }
    }
  }

  return {
    cells,
    maxCount,
    peakWeekday,
    peakHour,
    totalOrders: orders.length,
  };
}

// ─── getRevenueForecast ───────────────────────────────────────────────────────

/**
 * Generate a revenue forecast using linear regression over historical daily revenue.
 *
 * Historical window: 3 × horizon days of past data.
 * Returns one point per day: actual (if past) + predicted with 80% confidence interval.
 *
 * @param tenantId  Tenant scoping (required).
 * @param storeId   Optional: restrict to a single store.
 * @param horizon   Number of days to forecast (7, 14, or 30).
 * @param currencyCode  Currency code for display.
 */
export async function getRevenueForecast(
  tenantId: string,
  storeId?: string,
  horizon: ForecastHorizon = 7,
  currencyCode = "NZD"
): Promise<ForecastData> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // Historical window = 3× the horizon
  const historyDays = horizon * 3;
  const histFrom = addDays(today, -historyDays);

  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      ...(storeId ? { storeId } : {}),
      orderedAt: { gte: histFrom },
      status: { notIn: ["CANCELLED"] },
    },
    select: { orderedAt: true, totalAmount: true },
  });

  // Aggregate into daily buckets
  const dailyRevenue = new Map<string, number>();
  for (const order of orders) {
    const key = toDateKey(order.orderedAt);
    dailyRevenue.set(key, (dailyRevenue.get(key) ?? 0) + order.totalAmount);
  }

  // Build regression points (x = day index, y = revenue)
  const histPoints: { x: number; y: number; dateKey: string }[] = [];
  for (let i = 0; i < historyDays; i++) {
    const d = addDays(histFrom, i);
    const key = toDateKey(d);
    histPoints.push({ x: i, y: dailyRevenue.get(key) ?? 0, dateKey: key });
  }

  const { slope, intercept } = linearRegression(histPoints.map(({ x, y }) => ({ x, y })));
  const stdDev = residualStdDev(histPoints.map(({ x, y }) => ({ x, y })), slope, intercept);
  // 80% confidence interval ≈ ±1.28 σ
  const zFactor = 1.28;

  const points: ForecastPoint[] = [];
  let projectedTotalMinor = 0;

  // Include the last 7 historical days + horizon future days
  const displayStart = addDays(today, -7);
  for (let i = 0; i < 7 + horizon; i++) {
    const date = addDays(displayStart, i);
    const key = toDateKey(date);
    const dayIndex = historyDays - 7 + i;
    const predicted = Math.max(0, Math.round(intercept + slope * dayIndex));
    const ci = Math.round(zFactor * stdDev);
    const lower = Math.max(0, predicted - ci);
    const upper = predicted + ci;
    const actual = dailyRevenue.has(key) ? (dailyRevenue.get(key) ?? null) : null;

    points.push({ date: key, predicted, lower, upper, actual });

    if (i >= 7) {
      projectedTotalMinor += predicted;
    }
  }

  return { points, horizon, projectedTotalMinor, currencyCode };
}

// ─── getProductionEstimates ───────────────────────────────────────────────────

/**
 * Estimate order volumes for each day of the target week, per store.
 * Uses a trailing 4-week same-weekday average as the prediction.
 *
 * @param tenantId        Tenant scoping (required).
 * @param storeIds        Optional: restrict to specific stores.
 * @param weekStartDate   ISO date of the Monday of the target week (defaults to next Monday).
 */
export async function getProductionEstimates(
  tenantId: string,
  storeIds?: string[],
  weekStartDate?: string
): Promise<ProductionEstimatesData> {
  const monday = weekStartDate
    ? parseUtcDate(weekStartDate)
    : (() => {
        const d = new Date();
        d.setUTCHours(0, 0, 0, 0);
        // Advance to next Monday
        const day = d.getUTCDay();
        const daysUntilMonday = day === 0 ? 1 : 8 - day;
        return addDays(d, daysUntilMonday);
      })();

  // 4 trailing weeks of historical same-weekday data per store
  const lookbackStart = addDays(monday, -28);
  const lookbackEnd = addDays(monday, -1);

  const stores = await prisma.store.findMany({
    where: {
      tenantId,
      ...(storeIds?.length ? { id: { in: storeIds } } : {}),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  if (stores.length === 0) {
    return { stores: [], weekStartDate: toDateKey(monday) };
  }

  const storeIdList = stores.map((s) => s.id);

  const historicalOrders = await prisma.order.findMany({
    where: {
      tenantId,
      storeId: { in: storeIdList },
      orderedAt: { gte: lookbackStart, lte: lookbackEnd },
      status: { notIn: ["CANCELLED"] },
    },
    select: { storeId: true, orderedAt: true },
  });

  // Build per-store, per-weekday count maps
  const storeWeekdayMap = new Map<string, Map<number, number[]>>();
  for (const store of stores) {
    const wdMap = new Map<number, number[]>();
    for (let wd = 0; wd < 7; wd++) wdMap.set(wd, []);
    storeWeekdayMap.set(store.id, wdMap);
  }

  for (const order of historicalOrders) {
    const weekday = order.orderedAt.getUTCDay();
    const dateKey = toDateKey(order.orderedAt);
    const wdMap = storeWeekdayMap.get(order.storeId);
    if (!wdMap) continue;
    // Map to day index within the 28-day window
    const dayIdx = Math.floor(
      (parseUtcDate(dateKey).getTime() - lookbackStart.getTime()) / 86400000
    );
    const weekIndex = Math.floor(dayIdx / 7);
    const arr = wdMap.get(weekday) ?? [];
    while (arr.length <= weekIndex) arr.push(0);
    arr[weekIndex]++;
    wdMap.set(weekday, arr);
  }

  const storeEstimates: StoreProductionEstimate[] = stores.map((store) => {
    const wdMap = storeWeekdayMap.get(store.id)!;

    const days: ProductionDayEstimate[] = [];
    let weekTotal = 0;
    let priorWeekTotal = 0;

    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const weekday = date.getUTCDay();
      const arr = wdMap.get(weekday) ?? [];

      // Average over up to 4 trailing same-weekday samples
      const samplesForEstimate = arr.slice(-4);
      const estimated =
        samplesForEstimate.length === 0
          ? 0
          : Math.round(samplesForEstimate.reduce((s, v) => s + v, 0) / samplesForEstimate.length);

      // Prior week: the sample immediately before the most recent
      const priorSamples = arr.slice(-5, -1);
      const priorWeekEstimate =
        priorSamples.length === 0
          ? 0
          : Math.round(priorSamples.reduce((s, v) => s + v, 0) / priorSamples.length);

      days.push({
        date: toDateKey(date),
        dayLabel: WEEKDAY_LABELS[weekday],
        estimated,
        priorWeekEstimate,
        delta: estimated - priorWeekEstimate,
      });

      weekTotal += estimated;
      priorWeekTotal += priorWeekEstimate;
    }

    void priorWeekTotal;

    return { storeId: store.id, storeName: store.name, days, weekTotal };
  });

  return { stores: storeEstimates, weekStartDate: toDateKey(monday) };
}

// ─── getChurnRiskSignals ──────────────────────────────────────────────────────

/**
 * Identify customers with declining order frequency.
 * Splits the recency window (default 90 days) into two halves and compares order counts.
 *
 * Risk classification:
 *   HIGH   — recentRatio < CHURN_HIGH_THRESHOLD (e.g. 0.4)
 *   MEDIUM — recentRatio < CHURN_MEDIUM_THRESHOLD (e.g. 0.7)
 *   LOW    — recentRatio >= CHURN_MEDIUM_THRESHOLD
 *
 * @param tenantId       Tenant scoping (required).
 * @param windowDays     Recency window in days (default 90).
 */
export async function getChurnRiskSignals(
  tenantId: string,
  windowDays = CHURN_RECENCY_WINDOW_DAYS
): Promise<ChurnRiskData> {
  const now = new Date();
  const windowStart = addDays(now, -windowDays);
  const midPoint = addDays(now, -Math.floor(windowDays / 2));

  // Fetch customers with at least one order in the recency window
  const orders = await prisma.order.findMany({
    where: {
      tenantId,
      orderedAt: { gte: windowStart },
      status: { notIn: ["CANCELLED"] },
      customerId: { not: null },
    },
    select: { customerId: true, orderedAt: true, totalAmount: true },
  });

  if (orders.length === 0) {
    return {
      customers: [],
      totalAtRisk: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    };
  }

  // Group by customerId
  const customerOrderMap = new Map<string, { recentCount: number; priorCount: number; lastOrderAt: Date }>();
  for (const order of orders) {
    if (!order.customerId) continue;
    const entry = customerOrderMap.get(order.customerId) ?? {
      recentCount: 0,
      priorCount: 0,
      lastOrderAt: order.orderedAt,
    };
    if (order.orderedAt >= midPoint) {
      entry.recentCount++;
    } else {
      entry.priorCount++;
    }
    if (order.orderedAt > entry.lastOrderAt) {
      entry.lastOrderAt = order.orderedAt;
    }
    customerOrderMap.set(order.customerId, entry);
  }

  // Only keep customers who had orders in the PRIOR half but not/fewer in the RECENT half
  const atRiskCustomerIds: string[] = [];
  for (const [customerId, stats] of customerOrderMap) {
    if (stats.priorCount > 0) {
      const ratio = stats.recentCount / stats.priorCount;
      if (ratio < CHURN_MEDIUM_THRESHOLD) {
        atRiskCustomerIds.push(customerId);
      }
    } else if (stats.recentCount === 0) {
      atRiskCustomerIds.push(customerId);
    }
  }

  if (atRiskCustomerIds.length === 0) {
    return {
      customers: [],
      totalAtRisk: 0,
      highRiskCount: 0,
      mediumRiskCount: 0,
      lowRiskCount: 0,
    };
  }

  // Fetch customer details + subscription counts
  const [customers, subscriptionCounts] = await Promise.all([
    prisma.customer.findMany({
      where: { tenantId, id: { in: atRiskCustomerIds } },
      select: { id: true, name: true, email: true },
    }),
    prisma.subscription.findMany({
      where: {
        tenantId,
        customerId: { in: atRiskCustomerIds },
        status: "ACTIVE",
      },
      select: { customerId: true },
    }),
  ]);

  const subCountMap = new Map<string, number>();
  for (const sub of subscriptionCounts) {
    subCountMap.set(sub.customerId, (subCountMap.get(sub.customerId) ?? 0) + 1);
  }

  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const result: ChurnRiskCustomer[] = [];
  let highRiskCount = 0;
  let mediumRiskCount = 0;
  let lowRiskCount = 0;

  for (const customerId of atRiskCustomerIds) {
    const stats = customerOrderMap.get(customerId)!;
    const customer = customerMap.get(customerId);
    if (!customer) continue;

    const totalOrders = stats.recentCount + stats.priorCount;
    const ratio = stats.priorCount > 0 ? stats.recentCount / stats.priorCount : 0;

    let riskLevel: ChurnRiskLevel;
    if (ratio < CHURN_HIGH_THRESHOLD) {
      riskLevel = "HIGH";
      highRiskCount++;
    } else if (ratio < CHURN_MEDIUM_THRESHOLD) {
      riskLevel = "MEDIUM";
      mediumRiskCount++;
    } else {
      riskLevel = "LOW";
      lowRiskCount++;
    }

    const daysSinceLastOrder = Math.floor(
      (now.getTime() - stats.lastOrderAt.getTime()) / 86400000
    );

    result.push({
      customerId,
      customerName: customer.name,
      customerEmail: customer.email,
      totalOrders,
      recentOrders: stats.recentCount,
      priorOrders: stats.priorCount,
      lastOrderAt: stats.lastOrderAt.toISOString(),
      daysSinceLastOrder,
      riskLevel,
      activeSubscriptions: subCountMap.get(customerId) ?? 0,
    });
  }

  // Sort: HIGH first, then MEDIUM, then LOW; within each level sort by daysSinceLastOrder desc
  const riskOrder: Record<ChurnRiskLevel, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  result.sort((a, b) => {
    const rDiff = riskOrder[a.riskLevel] - riskOrder[b.riskLevel];
    if (rDiff !== 0) return rDiff;
    return (b.daysSinceLastOrder ?? 0) - (a.daysSinceLastOrder ?? 0);
  });

  return {
    customers: result,
    totalAtRisk: result.length,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
  };
}
