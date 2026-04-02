import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    store: { findUnique: vi.fn(), findMany: vi.fn() },
    order: {
      count: vi.fn(),
      aggregate: vi.fn(),
      findMany: vi.fn(),
    },
    orderItem: { findMany: vi.fn() },
    catalogProduct: { findMany: vi.fn() },
    catalogProductCategory: { findMany: vi.fn() },
    catalogModifierOption: { count: vi.fn() },
    connection: { count: vi.fn() },
    subscription: { count: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getTenantOwnerReports,
  getStoreOwnerReports,
} from "@/services/owner/reports/owner-reports.service";

const mockPrisma = prisma as any;

const TENANT_ID = "tenant-001";
const STORE_ID = "store-001";

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.tenant.findUnique.mockResolvedValue({
    timezone: "Pacific/Auckland",
    currency: "NZD",
  });
  mockPrisma.store.findUnique.mockResolvedValue({
    name: "Test Store",
    timezone: "Pacific/Auckland",
    currency: "NZD",
  });
  mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Test Store" }]);
  mockPrisma.order.count.mockResolvedValue(0);
  mockPrisma.order.aggregate.mockResolvedValue({ _sum: { totalAmount: null } });
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.orderItem.findMany.mockResolvedValue([]);
  mockPrisma.catalogProduct.findMany.mockResolvedValue([]);
  mockPrisma.catalogProductCategory.findMany.mockResolvedValue([]);
  mockPrisma.catalogModifierOption.count.mockResolvedValue(0);
  mockPrisma.connection.count.mockResolvedValue(0);
  mockPrisma.subscription.count.mockResolvedValue(0);
  mockPrisma.subscription.findMany.mockResolvedValue([]);
});

// ─── getTenantOwnerReports ────────────────────────────────────────────────────

describe("getTenantOwnerReports", () => {
  it("returns a structurally valid TenantOwnerReportsData object", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });

    expect(result).toMatchObject({
      currencyCode: "NZD",
      timezone: "Pacific/Auckland",
      summary: expect.objectContaining({
        grossRevenueMinor: 0,
        orderCount: 0,
        currencyCode: "NZD",
      }),
      comparisonSummary: null,
      revenueTrend: expect.any(Array),
      channelBreakdown: expect.any(Array),
      storeComparison: expect.any(Array),
      topProducts: expect.any(Array),
      subscriptionSummary: expect.objectContaining({
        activeSubscriptionCount: 0,
      }),
      insights: expect.any(Array),
    });
  });

  it("returns comparisonSummary when comparePrevious is true", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: true },
    });
    expect(result.comparisonSummary).not.toBeNull();
  });

  it("revenue trend has 7 points for last7 preset", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.revenueTrend).toHaveLength(7);
  });

  it("revenue trend has 30 points for last30 preset", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last30", comparePrevious: false },
    });
    expect(result.revenueTrend).toHaveLength(30);
  });

  it("scopes order queries to tenantId (tenant isolation)", async () => {
    await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    const orderCountCalls = mockPrisma.order.count.mock.calls;
    expect(orderCountCalls.length).toBeGreaterThan(0);
    for (const call of orderCountCalls) {
      expect(call[0].where.tenantId).toBe(TENANT_ID);
    }
  });

  it("revenue aggregate excludes CANCELLED and FAILED orders", async () => {
    await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    const aggCalls = mockPrisma.order.aggregate.mock.calls;
    expect(aggCalls.length).toBeGreaterThan(0);
    for (const call of aggCalls) {
      const statusFilter = call[0].where?.status;
      if (statusFilter?.notIn) {
        expect(statusFilter.notIn).toContain("CANCELLED");
        expect(statusFilter.notIn).toContain("FAILED");
      }
    }
  });

  it("generates no_orders insight when there are no orders", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.insights.some((i) => i.key === "no_orders")).toBe(true);
  });

  it("fromDate and toDate are valid YYYY-MM-DD strings", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.fromDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result.toDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("filters field is preserved in the response", async () => {
    const filters = { preset: "last30" as const, comparePrevious: true };
    const result = await getTenantOwnerReports({ tenantId: TENANT_ID, filters });
    expect(result.filters).toEqual(filters);
  });

  it("returns zero summary KPIs when no orders exist", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.summary.grossRevenueMinor).toBe(0);
    expect(result.summary.orderCount).toBe(0);
    expect(result.summary.averageOrderValueMinor).toBe(0);
    expect(result.summary.completedRate).toBe(0);
    expect(result.summary.cancelledRate).toBe(0);
  });

  it("comparisonSummary is null when comparePrevious is false", async () => {
    const result = await getTenantOwnerReports({
      tenantId: TENANT_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.comparisonSummary).toBeNull();
  });
});

// ─── getStoreOwnerReports ─────────────────────────────────────────────────────

describe("getStoreOwnerReports", () => {
  it("returns a structurally valid StoreOwnerReportsData object", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });

    expect(result).toMatchObject({
      storeId: STORE_ID,
      storeName: "Test Store",
      currencyCode: "NZD",
      summary: expect.objectContaining({ grossRevenueMinor: 0 }),
      comparisonSummary: null,
      revenueTrend: expect.any(Array),
      channelBreakdown: expect.any(Array),
      categoryPerformance: expect.any(Array),
      productPerformance: expect.any(Array),
      subscriptionSummary: expect.objectContaining({ activeSubscriptionCount: 0 }),
      orderHealth: expect.objectContaining({ totalOrders: 0 }),
      soldOutImpact: expect.objectContaining({ soldOutProductCount: 0 }),
      insights: expect.any(Array),
    });
  });

  it("scopes order queries to storeId (store isolation)", async () => {
    await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    const orderCountCalls = mockPrisma.order.count.mock.calls;
    for (const call of orderCountCalls) {
      if ("storeId" in call[0].where) {
        expect(call[0].where.storeId).toBe(STORE_ID);
      }
    }
  });

  it("generates no_orders insight when there are no orders", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.insights.some((i) => i.key === "no_orders")).toBe(true);
  });

  it("returns comparisonSummary when comparePrevious is true", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: true },
    });
    expect(result.comparisonSummary).not.toBeNull();
  });

  it("storeId and storeName are present in the response", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.storeId).toBe(STORE_ID);
    expect(result.storeName).toBe("Test Store");
  });

  it("revenue trend has 7 points for last7 preset", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.revenueTrend).toHaveLength(7);
  });

  it("order health has zero counts when no orders exist", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.orderHealth.totalOrders).toBe(0);
    expect(result.orderHealth.completedOrders).toBe(0);
    expect(result.orderHealth.cancelledOrders).toBe(0);
    expect(result.orderHealth.failedOrders).toBe(0);
    expect(result.orderHealth.completedRate).toBe(0);
  });

  it("sold-out impact has zero counts when no sold-out products", async () => {
    const result = await getStoreOwnerReports({
      tenantId: TENANT_ID,
      storeId: STORE_ID,
      filters: { preset: "last7", comparePrevious: false },
    });
    expect(result.soldOutImpact.soldOutProductCount).toBe(0);
    expect(result.soldOutImpact.soldOutOptionCount).toBe(0);
    expect(result.soldOutImpact.topSoldOutProducts).toHaveLength(0);
  });
});
