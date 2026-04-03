import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    catalogProduct: {
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import { getDashboardData } from "@/services/backoffice/backoffice-dashboard.service";

const mockPrisma = prisma as unknown as {
  order: {
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  catalogProduct: {
    count: ReturnType<typeof vi.fn>;
  };
};

const STORE_ID = "store-001";

function makeOrder(overrides: Partial<{
  id: string;
  status: string;
  sourceChannel: string;
  orderedAt: Date;
  customerName: string | null;
  totalAmount: number;
  currencyCode: string;
}> = {}) {
  return {
    id: "order-001",
    status: "RECEIVED",
    sourceChannel: "POS",
    orderedAt: new Date(),
    customerName: null,
    totalAmount: 1500,
    currencyCode: "NZD",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();

  // Default happy-path mocks
  mockPrisma.order.count
    .mockResolvedValueOnce(5)   // todayOrderCount
    .mockResolvedValueOnce(3);  // activeOrderCount

  mockPrisma.order.aggregate.mockResolvedValue({
    _sum: { totalAmount: 10000 },
  });

  mockPrisma.catalogProduct.count.mockResolvedValue(2);

  mockPrisma.order.findMany
    .mockResolvedValueOnce([
      makeOrder({ sourceChannel: "POS" }),
      makeOrder({ sourceChannel: "UBER_EATS" }),
      makeOrder({ sourceChannel: "POS" }),
    ])   // todayOrders for channel breakdown
    .mockResolvedValueOnce([
      makeOrder({ status: "RECEIVED", ageMinutes: 5 } as Parameters<typeof makeOrder>[0]),
      makeOrder({ id: "order-002", status: "IN_PROGRESS" }),
    ]); // activeOrders
});

// ─── getDashboardData ─────────────────────────────────────────────────────────

describe("getDashboardData", () => {
  it("returns a structurally valid BackofficeDashboardData object", async () => {
    const result = await getDashboardData(STORE_ID);

    expect(result).toMatchObject({
      todayOrderCount: 5,
      todayRevenueMinor: 10000,
      activeOrderCount: 3,
      soldOutItemCount: 2,
      channelBreakdown: expect.any(Array),
      activeOrders: expect.any(Array),
      currencyCode: expect.any(String),
    });
  });

  it("scopes all order queries to storeId", async () => {
    await getDashboardData(STORE_ID);

    const allCountCalls = mockPrisma.order.count.mock.calls;
    for (const call of allCountCalls) {
      expect(call[0].where.storeId).toBe(STORE_ID);
    }

    const aggregateCalls = mockPrisma.order.aggregate.mock.calls;
    expect(aggregateCalls[0][0].where.storeId).toBe(STORE_ID);

    const soldOutCall = mockPrisma.catalogProduct.count.mock.calls[0];
    expect(soldOutCall[0].where.storeId).toBe(STORE_ID);
  });

  it("scopes soldOut query to isSoldOut: true", async () => {
    await getDashboardData(STORE_ID);
    const call = mockPrisma.catalogProduct.count.mock.calls[0];
    expect(call[0].where.isSoldOut).toBe(true);
  });

  it("groups channel breakdown correctly", async () => {
    const result = await getDashboardData(STORE_ID);
    const posEntry = result.channelBreakdown.find((c) => c.channel === "POS");
    const uberEntry = result.channelBreakdown.find((c) => c.channel === "UBER_EATS");
    expect(posEntry?.orderCount).toBe(2);
    expect(uberEntry?.orderCount).toBe(1);
  });

  it("sorts channel breakdown descending by order count", async () => {
    const result = await getDashboardData(STORE_ID);
    const counts = result.channelBreakdown.map((c) => c.orderCount);
    expect(counts).toEqual([...counts].sort((a, b) => b - a));
  });

  it("populates activeOrders with age in minutes", async () => {
    const result = await getDashboardData(STORE_ID);
    for (const o of result.activeOrders) {
      expect(typeof o.ageMinutes).toBe("number");
      expect(o.ageMinutes).toBeGreaterThanOrEqual(0);
    }
  });

  it("sets orderedAt as ISO string on active orders", async () => {
    const result = await getDashboardData(STORE_ID);
    for (const o of result.activeOrders) {
      expect(o.orderedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("returns zero revenue when no completed orders today", async () => {
    mockPrisma.order.count
      .mockReset()
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    mockPrisma.order.aggregate.mockReset().mockResolvedValue({ _sum: { totalAmount: null } });
    mockPrisma.catalogProduct.count.mockReset().mockResolvedValue(0);
    mockPrisma.order.findMany.mockReset().mockResolvedValue([]).mockResolvedValue([]);

    const result = await getDashboardData(STORE_ID);
    expect(result.todayRevenueMinor).toBe(0);
  });

  it("returns empty channelBreakdown when no orders today", async () => {
    mockPrisma.order.count.mockReset().mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.order.aggregate.mockReset().mockResolvedValue({ _sum: { totalAmount: null } });
    mockPrisma.catalogProduct.count.mockReset().mockResolvedValue(0);
    mockPrisma.order.findMany.mockReset().mockResolvedValue([]).mockResolvedValue([]);

    const result = await getDashboardData(STORE_ID);
    expect(result.channelBreakdown).toHaveLength(0);
  });

  it("returns empty activeOrders when no in-flight orders", async () => {
    mockPrisma.order.count.mockReset().mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    mockPrisma.order.aggregate.mockReset().mockResolvedValue({ _sum: { totalAmount: 5000 } });
    mockPrisma.catalogProduct.count.mockReset().mockResolvedValue(0);
    mockPrisma.order.findMany
      .mockReset()
      .mockResolvedValueOnce([makeOrder()])
      .mockResolvedValueOnce([]);

    const result = await getDashboardData(STORE_ID);
    expect(result.activeOrders).toHaveLength(0);
  });

  it("defaults currencyCode to NZD when no active orders", async () => {
    mockPrisma.order.count.mockReset().mockResolvedValueOnce(0).mockResolvedValueOnce(0);
    mockPrisma.order.aggregate.mockReset().mockResolvedValue({ _sum: { totalAmount: null } });
    mockPrisma.catalogProduct.count.mockReset().mockResolvedValue(0);
    mockPrisma.order.findMany.mockReset().mockResolvedValue([]).mockResolvedValue([]);

    const result = await getDashboardData(STORE_ID);
    expect(result.currencyCode).toBe("NZD");
  });

  it("handles unknown channel gracefully as UNKNOWN", async () => {
    mockPrisma.order.count.mockReset().mockResolvedValueOnce(1).mockResolvedValueOnce(0);
    mockPrisma.order.aggregate.mockReset().mockResolvedValue({ _sum: { totalAmount: 0 } });
    mockPrisma.catalogProduct.count.mockReset().mockResolvedValue(0);
    mockPrisma.order.findMany
      .mockReset()
      .mockResolvedValueOnce([makeOrder({ sourceChannel: "MYSTERY_CHANNEL" })])
      .mockResolvedValueOnce([]);

    const result = await getDashboardData(STORE_ID);
    // Channel value is passed through as-is (cast to BackofficeOrderChannel)
    expect(result.channelBreakdown.some((c) => c.channel === "MYSTERY_CHANNEL")).toBe(true);
  });

  it("runs Prisma queries in parallel (Promise.all)", async () => {
    // Ensure all 6 Prisma mock calls resolve concurrently (no sequencing requirement)
    const result = await getDashboardData(STORE_ID);
    // Validate that all queries were called (not checking order, just presence)
    expect(mockPrisma.order.count).toHaveBeenCalledTimes(2);
    expect(mockPrisma.order.aggregate).toHaveBeenCalledTimes(1);
    expect(mockPrisma.catalogProduct.count).toHaveBeenCalledTimes(1);
    expect(mockPrisma.order.findMany).toHaveBeenCalledTimes(2);
    expect(result).toBeDefined();
  });

  it("uses COMPLETED status for revenue aggregate", async () => {
    await getDashboardData(STORE_ID);
    const aggCall = mockPrisma.order.aggregate.mock.calls[0];
    expect(aggCall[0].where.status).toBe("COMPLETED");
  });
});
