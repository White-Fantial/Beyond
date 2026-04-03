import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
    },
    orderItem: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getReportData } from "@/services/backoffice/backoffice-reports.service";

const mockPrisma = prisma as unknown as {
  order: { findMany: ReturnType<typeof vi.fn> };
  orderItem: { findMany: ReturnType<typeof vi.fn> };
};

const STORE_ID = "store-001";

function makeOrder(overrides: Partial<{
  id: string;
  status: string;
  sourceChannel: string;
  orderedAt: Date;
  totalAmount: number;
  currencyCode: string;
}> = {}) {
  return {
    id: "order-001",
    status: "COMPLETED",
    sourceChannel: "POS",
    orderedAt: new Date(),
    totalAmount: 2000,
    currencyCode: "NZD",
    ...overrides,
  };
}

function makeItem(overrides: Partial<{ productName: string; quantity: number }> = {}) {
  return { productName: "Burger", quantity: 1, ...overrides };
}

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.orderItem.findMany.mockResolvedValue([]);
});

// ─── getReportData ────────────────────────────────────────────────────────────

describe("getReportData", () => {
  it("returns a structurally valid BackofficeReportData object", async () => {
    const result = await getReportData(STORE_ID);

    expect(result).toMatchObject({
      days: 30,
      fromDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      toDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      currencyCode: "NZD",
      dailySeries: expect.any(Array),
      channelBreakdown: expect.any(Array),
      statusFunnel: expect.any(Array),
      topProducts: expect.any(Array),
      peakHourCells: expect.any(Array),
      peakHourMax: expect.any(Number),
    });
  });

  it("returns 30 daily points for default period", async () => {
    const result = await getReportData(STORE_ID);
    expect(result.dailySeries).toHaveLength(30);
  });

  it("returns 7 daily points when days=7", async () => {
    const result = await getReportData(STORE_ID, 7);
    expect(result.dailySeries).toHaveLength(7);
    expect(result.days).toBe(7);
  });

  it("returns 14 daily points when days=14", async () => {
    const result = await getReportData(STORE_ID, 14);
    expect(result.dailySeries).toHaveLength(14);
  });

  it("clamps days to max 90", async () => {
    const result = await getReportData(STORE_ID, 200);
    expect(result.dailySeries).toHaveLength(90);
    expect(result.days).toBe(90);
  });

  it("clamps days to minimum 1", async () => {
    const result = await getReportData(STORE_ID, 0);
    expect(result.dailySeries).toHaveLength(1);
    expect(result.days).toBe(1);
  });

  it("daily series has sequential dateKey values", async () => {
    const result = await getReportData(STORE_ID, 7);
    const keys = result.dailySeries.map((p) => p.dateKey);
    // Each key should be a valid YYYY-MM-DD
    for (const key of keys) {
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    // Keys should be sorted ascending
    expect(keys).toEqual([...keys].sort());
  });

  it("aggregates daily revenue and order count from orders", async () => {
    const today = new Date();
    today.setUTCHours(12, 0, 0, 0);

    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ orderedAt: today, totalAmount: 1000 }),
      makeOrder({ id: "order-002", orderedAt: today, totalAmount: 2000 }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    const todayKey = today.toISOString().slice(0, 10);
    const point = result.dailySeries.find((p) => p.dateKey === todayKey);

    expect(point?.orderCount).toBe(2);
    expect(point?.revenueMinor).toBe(3000);
  });

  it("fills gaps with zero-count days", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await getReportData(STORE_ID, 7);
    for (const point of result.dailySeries) {
      expect(point.orderCount).toBe(0);
      expect(point.revenueMinor).toBe(0);
    }
  });

  it("builds channel breakdown from orders", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ sourceChannel: "POS", totalAmount: 1000 }),
      makeOrder({ id: "o2", sourceChannel: "UBER_EATS", totalAmount: 2000 }),
      makeOrder({ id: "o3", sourceChannel: "POS", totalAmount: 500 }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    const pos = result.channelBreakdown.find((c) => c.channel === "POS");
    const uber = result.channelBreakdown.find((c) => c.channel === "UBER_EATS");

    expect(pos?.orderCount).toBe(2);
    expect(pos?.revenueMinor).toBe(1500);
    expect(uber?.orderCount).toBe(1);
    expect(uber?.revenueMinor).toBe(2000);
  });

  it("sorts channel breakdown by order count descending", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ sourceChannel: "POS" }),
      makeOrder({ id: "o2", sourceChannel: "UBER_EATS" }),
      makeOrder({ id: "o3", sourceChannel: "UBER_EATS" }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    const counts = result.channelBreakdown.map((c) => c.orderCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("builds status funnel with counts per status", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ status: "COMPLETED" }),
      makeOrder({ id: "o2", status: "COMPLETED" }),
      makeOrder({ id: "o3", status: "CANCELLED" }),
      makeOrder({ id: "o4", status: "RECEIVED" }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    const completed = result.statusFunnel.find((f) => f.status === "COMPLETED");
    const cancelled = result.statusFunnel.find((f) => f.status === "CANCELLED");
    const received = result.statusFunnel.find((f) => f.status === "RECEIVED");

    expect(completed?.count).toBe(2);
    expect(cancelled?.count).toBe(1);
    expect(received?.count).toBe(1);
  });

  it("omits zero-count statuses from the funnel", async () => {
    mockPrisma.order.findMany.mockResolvedValue([makeOrder({ status: "COMPLETED" })]);

    const result = await getReportData(STORE_ID, 7);
    for (const item of result.statusFunnel) {
      expect(item.count).toBeGreaterThan(0);
    }
  });

  it("ranks top products by line count", async () => {
    mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
    mockPrisma.orderItem.findMany.mockResolvedValue([
      makeItem({ productName: "Burger", quantity: 2 }),
      makeItem({ productName: "Fries", quantity: 1 }),
      makeItem({ productName: "Burger", quantity: 1 }),
      makeItem({ productName: "Drink", quantity: 3 }),
      makeItem({ productName: "Burger", quantity: 1 }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    expect(result.topProducts[0].productName).toBe("Burger");
    expect(result.topProducts[0].lineCount).toBe(3);
    expect(result.topProducts[0].quantitySold).toBe(4);
  });

  it("returns at most 5 top products", async () => {
    mockPrisma.order.findMany.mockResolvedValue([makeOrder()]);
    mockPrisma.orderItem.findMany.mockResolvedValue([
      "P1", "P2", "P3", "P4", "P5", "P6",
    ].map((name) => makeItem({ productName: name })));

    const result = await getReportData(STORE_ID, 7);
    expect(result.topProducts.length).toBeLessThanOrEqual(5);
  });

  it("returns 7×24 = 168 peak hour cells", async () => {
    const result = await getReportData(STORE_ID);
    expect(result.peakHourCells).toHaveLength(168);
  });

  it("correctly counts peak hour from order timestamps", async () => {
    const ts = new Date("2025-03-03T14:30:00.000Z"); // Monday 14:00 UTC
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ orderedAt: ts }),
      makeOrder({ id: "o2", orderedAt: ts }),
    ]);

    const result = await getReportData(STORE_ID, 7);
    const cell = result.peakHourCells.find(
      (c) => c.weekday === ts.getUTCDay() && c.hour === ts.getUTCHours()
    );
    expect(cell?.orderCount).toBe(2);
    expect(result.peakHourMax).toBeGreaterThanOrEqual(2);
  });

  it("uses NZD as default currency when no orders present", async () => {
    const result = await getReportData(STORE_ID, 7);
    expect(result.currencyCode).toBe("NZD");
  });

  it("picks currencyCode from the first order with a currency", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrder({ currencyCode: "AUD" }),
    ]);
    const result = await getReportData(STORE_ID, 7);
    expect(result.currencyCode).toBe("AUD");
  });

  it("scopes order queries to storeId", async () => {
    await getReportData(STORE_ID, 7);
    const orderCall = mockPrisma.order.findMany.mock.calls[0];
    expect(orderCall[0].where.storeId).toBe(STORE_ID);
  });
});
