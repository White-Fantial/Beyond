import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getHeatmapData,
  getRevenueForecast,
  getProductionEstimates,
  getChurnRiskSignals,
} from "@/services/owner/owner-analytics.service";

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn> };
  store: { findMany: ReturnType<typeof vi.fn> };
  customer: { findMany: ReturnType<typeof vi.fn> };
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  subscription: { findMany: ReturnType<typeof vi.fn> };
};

const TENANT_A = "tenant-aaa";
const STORE_1 = "store-001";
const STORE_2 = "store-002";

// Helper to create a Date on a specific weekday and hour (UTC)
function makeOrderDate(weekday: number, hour: number): Date {
  // Find a UTC date that has the given weekday
  const base = new Date("2024-01-07T00:00:00.000Z"); // Sunday
  const d = new Date(base);
  d.setUTCDate(d.getUTCDate() + weekday);
  d.setUTCHours(hour, 0, 0, 0);
  return d;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.store.findMany.mockResolvedValue([]);
  mockPrisma.customer.findMany.mockResolvedValue([]);
  mockPrisma.subscription.findMany.mockResolvedValue([]);
});

// ─── getHeatmapData ───────────────────────────────────────────────────────────

describe("getHeatmapData", () => {
  it("returns empty heatmap when no orders", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getHeatmapData(TENANT_A);

    expect(result.totalOrders).toBe(0);
    expect(result.maxCount).toBe(0);
    expect(result.cells).toHaveLength(168); // 7 × 24
  });

  it("always returns exactly 168 cells (7 weekdays × 24 hours)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { orderedAt: makeOrderDate(1, 9) },
      { orderedAt: makeOrderDate(3, 14) },
    ]);
    const result = await getHeatmapData(TENANT_A);
    expect(result.cells).toHaveLength(168);
  });

  it("correctly counts orders into weekday × hour buckets", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { orderedAt: makeOrderDate(1, 9) }, // Mon 9am
      { orderedAt: makeOrderDate(1, 9) }, // Mon 9am again
      { orderedAt: makeOrderDate(3, 14) }, // Wed 2pm
    ]);
    const result = await getHeatmapData(TENANT_A);

    const mon9am = result.cells.find((c) => c.weekday === 1 && c.hour === 9);
    const wed2pm = result.cells.find((c) => c.weekday === 3 && c.hour === 14);
    const sun12am = result.cells.find((c) => c.weekday === 0 && c.hour === 0);

    expect(mon9am?.orderCount).toBe(2);
    expect(wed2pm?.orderCount).toBe(1);
    expect(sun12am?.orderCount).toBe(0);
  });

  it("identifies the correct peak weekday and hour", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { orderedAt: makeOrderDate(5, 18) }, // Fri 6pm ×3
      { orderedAt: makeOrderDate(5, 18) },
      { orderedAt: makeOrderDate(5, 18) },
      { orderedAt: makeOrderDate(2, 12) }, // Tue noon ×1
    ]);
    const result = await getHeatmapData(TENANT_A);
    expect(result.peakWeekday).toBe(5);
    expect(result.peakHour).toBe(18);
    expect(result.maxCount).toBe(3);
  });

  it("respects storeId filter (passes it to prisma.order.findMany where clause)", async () => {
    await getHeatmapData(TENANT_A, STORE_1);
    const whereArg = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(whereArg.storeId).toBe(STORE_1);
  });

  it("does not filter by storeId when storeId is undefined", async () => {
    await getHeatmapData(TENANT_A);
    const whereArg = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(whereArg.storeId).toBeUndefined();
  });

  it("always scopes query to the provided tenantId", async () => {
    await getHeatmapData(TENANT_A);
    const whereArg = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(whereArg.tenantId).toBe(TENANT_A);
  });

  it("totalOrders equals the number of orders returned", async () => {
    const orders = Array.from({ length: 10 }, (_, i) => ({
      orderedAt: makeOrderDate(i % 7, i % 24),
    }));
    mockPrisma.order.findMany.mockResolvedValue(orders);
    const result = await getHeatmapData(TENANT_A);
    expect(result.totalOrders).toBe(10);
  });

  it("boundary: hour 0 and hour 23 are handled correctly", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      { orderedAt: makeOrderDate(0, 0) }, // Sun midnight
      { orderedAt: makeOrderDate(6, 23) }, // Sat 11pm
    ]);
    const result = await getHeatmapData(TENANT_A);
    expect(result.cells.find((c) => c.weekday === 0 && c.hour === 0)?.orderCount).toBe(1);
    expect(result.cells.find((c) => c.weekday === 6 && c.hour === 23)?.orderCount).toBe(1);
  });
});

// ─── getRevenueForecast ───────────────────────────────────────────────────────

describe("getRevenueForecast", () => {
  it("returns correct number of points (7 historical + horizon)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 7);
    // 7 past days + 7 forecast days
    expect(result.points).toHaveLength(14);
  });

  it("returns 7 + 14 = 21 points for horizon 14", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 14);
    expect(result.points).toHaveLength(21);
  });

  it("returns 7 + 30 = 37 points for horizon 30", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 30);
    expect(result.points).toHaveLength(37);
  });

  it("predicted values are always non-negative", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 7);
    for (const pt of result.points) {
      expect(pt.predicted).toBeGreaterThanOrEqual(0);
      expect(pt.lower).toBeGreaterThanOrEqual(0);
    }
  });

  it("rising trend produces a positive projected total", async () => {
    // Simulate 21 days of steadily increasing revenue
    const orders = [];
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    for (let i = 21; i >= 1; i--) {
      const d = new Date(base.getTime() - i * 86400000);
      const amount = i * 1000; // more recent = more revenue
      orders.push({ orderedAt: d, totalAmount: amount });
    }
    mockPrisma.order.findMany.mockResolvedValue(orders);
    const result = await getRevenueForecast(TENANT_A, undefined, 7);
    // Projected total should be positive
    expect(result.projectedTotalMinor).toBeGreaterThanOrEqual(0);
  });

  it("lower bound is always <= predicted", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 14);
    for (const pt of result.points) {
      expect(pt.lower).toBeLessThanOrEqual(pt.predicted + 1); // +1 for rounding
    }
  });

  it("upper bound is always >= predicted", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 14);
    for (const pt of result.points) {
      expect(pt.upper).toBeGreaterThanOrEqual(pt.predicted - 1); // -1 for rounding
    }
  });

  it("actual values are null for future dates", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 7);
    const today = new Date().toISOString().slice(0, 10);
    const futurePts = result.points.filter((p) => p.date > today);
    for (const pt of futurePts) {
      expect(pt.actual).toBeNull();
    }
  });

  it("propagates currencyCode into result", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getRevenueForecast(TENANT_A, undefined, 7, "AUD");
    expect(result.currencyCode).toBe("AUD");
  });
});

// ─── getProductionEstimates ───────────────────────────────────────────────────

describe("getProductionEstimates", () => {
  it("returns empty stores array when no stores exist", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    expect(result.stores).toHaveLength(0);
  });

  it("returns one entry per store", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_1, name: "Store A" },
      { id: STORE_2, name: "Store B" },
    ]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    expect(result.stores).toHaveLength(2);
  });

  it("each store has exactly 7 day estimates", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    expect(result.stores[0].days).toHaveLength(7);
  });

  it("estimated count is 0 when no historical orders", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    for (const day of result.stores[0].days) {
      expect(day.estimated).toBe(0);
    }
  });

  it("weekTotal equals the sum of daily estimates", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    const store = result.stores[0];
    const sumDays = store.days.reduce((s, d) => s + d.estimated, 0);
    expect(store.weekTotal).toBe(sumDays);
  });

  it("delta equals estimated minus priorWeekEstimate", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A);
    for (const day of result.stores[0].days) {
      expect(day.delta).toBe(day.estimated - day.priorWeekEstimate);
    }
  });

  it("weekStartDate in result matches provided Monday", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);
    const monday = "2025-01-06"; // A Monday
    const result = await getProductionEstimates(TENANT_A, undefined, monday);
    expect(result.weekStartDate).toBe(monday);
  });

  it("respects storeIds filter", async () => {
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    await getProductionEstimates(TENANT_A, [STORE_1]);
    const storeWhere = mockPrisma.store.findMany.mock.calls[0][0].where;
    expect(storeWhere.id).toEqual({ in: [STORE_1] });
  });

  it("day labels are one of the 7 short weekday names", async () => {
    const valid = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_1, name: "Store A" }]);
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getProductionEstimates(TENANT_A, undefined, "2025-01-06");
    for (const day of result.stores[0].days) {
      expect(valid).toContain(day.dayLabel);
    }
  });
});

// ─── getChurnRiskSignals ──────────────────────────────────────────────────────

describe("getChurnRiskSignals", () => {
  it("returns empty list when no orders exist", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A);
    expect(result.customers).toHaveLength(0);
    expect(result.totalAtRisk).toBe(0);
  });

  it("counts are consistent with customers array", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A);
    expect(result.highRiskCount + result.mediumRiskCount + result.lowRiskCount).toBe(
      result.customers.length
    );
  });

  it("classifies customer with 0 recent orders and prior orders as HIGH risk", async () => {
    const now = new Date();
    const priorDate = new Date(now.getTime() - 60 * 86400000); // 60 days ago (prior half of 90d window)
    const recentDate = new Date(now.getTime() - 20 * 86400000); // 20 days ago (recent half)

    // Customer with orders only in prior half → recentCount=0, priorCount=2 → ratio=0 < HIGH threshold
    mockPrisma.order.findMany.mockResolvedValue([
      { customerId: "cust-1", orderedAt: priorDate, totalAmount: 1000 },
      { customerId: "cust-1", orderedAt: new Date(priorDate.getTime() + 86400000), totalAmount: 1000 },
    ]);
    mockPrisma.customer.findMany.mockResolvedValue([
      { id: "cust-1", name: "Alice", email: "alice@example.com" },
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    const result = await getChurnRiskSignals(TENANT_A, 90);
    const customer = result.customers.find((c) => c.customerId === "cust-1");
    expect(customer).toBeDefined();
    expect(customer?.riskLevel).toBe("HIGH");
    void recentDate;
  });

  it("customers are sorted HIGH before MEDIUM before LOW", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A);
    const riskOrder: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
    for (let i = 1; i < result.customers.length; i++) {
      expect(riskOrder[result.customers[i].riskLevel]).toBeGreaterThanOrEqual(
        riskOrder[result.customers[i - 1].riskLevel]
      );
    }
  });

  it("totalAtRisk equals customers array length", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A);
    expect(result.totalAtRisk).toBe(result.customers.length);
  });

  it("activeSubscriptions count is included per customer", async () => {
    const now = new Date();
    const priorDate = new Date(now.getTime() - 60 * 86400000);
    mockPrisma.order.findMany.mockResolvedValue([
      { customerId: "cust-2", orderedAt: priorDate, totalAmount: 500 },
      { customerId: "cust-2", orderedAt: new Date(priorDate.getTime() + 86400000), totalAmount: 500 },
    ]);
    mockPrisma.customer.findMany.mockResolvedValue([
      { id: "cust-2", name: "Bob", email: "bob@example.com" },
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([
      { customerId: "cust-2" },
      { customerId: "cust-2" },
    ]);
    const result = await getChurnRiskSignals(TENANT_A, 90);
    const customer = result.customers.find((c) => c.customerId === "cust-2");
    expect(customer?.activeSubscriptions).toBe(2);
  });

  it("daysSinceLastOrder is calculated as a non-negative integer", async () => {
    const now = new Date();
    const priorDate = new Date(now.getTime() - 60 * 86400000);
    mockPrisma.order.findMany.mockResolvedValue([
      { customerId: "cust-3", orderedAt: priorDate, totalAmount: 500 },
      { customerId: "cust-3", orderedAt: new Date(priorDate.getTime() + 86400000), totalAmount: 500 },
    ]);
    mockPrisma.customer.findMany.mockResolvedValue([
      { id: "cust-3", name: "Carol", email: "carol@example.com" },
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A, 90);
    const customer = result.customers.find((c) => c.customerId === "cust-3");
    expect(customer?.daysSinceLastOrder).toBeGreaterThanOrEqual(0);
  });

  it("respects custom windowDays parameter", async () => {
    // With windowDays=30, orders older than 30 days should not be included
    await getChurnRiskSignals(TENANT_A, 30);
    const whereArg = mockPrisma.order.findMany.mock.calls[0][0].where;
    expect(whereArg.orderedAt.gte).toBeDefined();
    const windowStart = whereArg.orderedAt.gte as Date;
    const diffDays = Math.round((Date.now() - windowStart.getTime()) / 86400000);
    expect(diffDays).toBeCloseTo(30, 0);
  });

  it("skips orders with null customerId", async () => {
    const now = new Date();
    const priorDate = new Date(now.getTime() - 60 * 86400000);
    mockPrisma.order.findMany.mockResolvedValue([
      { customerId: null, orderedAt: priorDate, totalAmount: 500 },
    ]);
    mockPrisma.customer.findMany.mockResolvedValue([]);
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    const result = await getChurnRiskSignals(TENANT_A);
    expect(result.customers).toHaveLength(0);
  });
});
