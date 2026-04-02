import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: vi.fn() },
    store: { count: vi.fn(), findMany: vi.fn() },
    storeMembership: { findMany: vi.fn() },
    connection: { count: vi.fn(), findMany: vi.fn() },
    order: { count: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
    membership: { count: vi.fn() },
    tenantSubscription: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getBusinessOverviewMetrics,
  getOwnerStoreSummaries,
  getOwnerDashboardAlerts,
  summariseConnectionStatus,
} from "@/services/owner/owner-dashboard.service";

const mockPrisma = prisma as unknown as {
  tenant: { findUnique: ReturnType<typeof vi.fn> };
  store: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  storeMembership: { findMany: ReturnType<typeof vi.fn> };
  connection: { count: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  order: {
    count: ReturnType<typeof vi.fn>;
    aggregate: ReturnType<typeof vi.fn>;
    groupBy: ReturnType<typeof vi.fn>;
  };
  membership: { count: ReturnType<typeof vi.fn> };
  tenantSubscription: { findMany: ReturnType<typeof vi.fn> };
};

const TENANT_ID = "tenant-001";
const STORE_A = "store-aaa";
const STORE_B = "store-bbb";

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.tenant.findUnique.mockResolvedValue({
    timezone: "Pacific/Auckland",
    currency: "NZD",
  });
});

// ─── summariseConnectionStatus (pure helper) ─────────────────────────────────

describe("summariseConnectionStatus", () => {
  it("returns NOT_CONNECTED when no connections", () => {
    expect(summariseConnectionStatus([])).toBe("NOT_CONNECTED");
  });

  it("returns CONNECTED when all connections are CONNECTED", () => {
    expect(
      summariseConnectionStatus([{ status: "CONNECTED" }, { status: "CONNECTED" }])
    ).toBe("CONNECTED");
  });

  it("returns ERROR when any connection has ERROR status (highest priority)", () => {
    expect(
      summariseConnectionStatus([
        { status: "CONNECTED" },
        { status: "ERROR" },
        { status: "REAUTH_REQUIRED" },
      ])
    ).toBe("ERROR");
  });

  it("returns REAUTH_REQUIRED when no ERROR but some REAUTH_REQUIRED", () => {
    expect(
      summariseConnectionStatus([{ status: "CONNECTED" }, { status: "REAUTH_REQUIRED" }])
    ).toBe("REAUTH_REQUIRED");
  });

  it("returns PARTIAL when CONNECTED and DISCONNECTED are mixed", () => {
    expect(
      summariseConnectionStatus([{ status: "CONNECTED" }, { status: "DISCONNECTED" }])
    ).toBe("PARTIAL");
  });

  it("returns NOT_CONNECTED when all are DISCONNECTED", () => {
    expect(
      summariseConnectionStatus([{ status: "DISCONNECTED" }, { status: "NOT_CONNECTED" }])
    ).toBe("NOT_CONNECTED");
  });
});

// ─── getBusinessOverviewMetrics ───────────────────────────────────────────────

describe("getBusinessOverviewMetrics", () => {
  beforeEach(() => {
    mockPrisma.store.count.mockResolvedValue(3);
    mockPrisma.connection.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1); // POS, DELIVERY
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      { membership: { userId: "user-1" } },
      { membership: { userId: "user-2" } },
      { membership: { userId: "user-2" } }, // duplicate — should be deduped
    ]);
    mockPrisma.order.count.mockResolvedValue(15);
    mockPrisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: 25000 } }) // today revenue
      .mockResolvedValueOnce({ _sum: { totalAmount: 800000 } }); // monthly revenue
  });

  it("returns correct counts and deduplicates staff", async () => {
    const result = await getBusinessOverviewMetrics(TENANT_ID);

    expect(result.totalStores).toBe(3);
    expect(result.posConnections).toBe(2);
    expect(result.deliveryConnections).toBe(1);
    expect(result.totalStaff).toBe(2); // deduped from 3 storeMembership rows
    expect(result.todayOrders).toBe(15);
  });

  it("returns minor-unit revenue values", async () => {
    const result = await getBusinessOverviewMetrics(TENANT_ID);

    expect(result.todayRevenueAmount).toBe(25000);
    expect(result.monthlyRevenueAmount).toBe(800000);
    expect(result.currencyCode).toBe("NZD");
  });

  it("falls back to 0 revenue when no orders match", async () => {
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.order.aggregate.mockReset();
    mockPrisma.order.aggregate
      .mockResolvedValueOnce({ _sum: { totalAmount: null } })
      .mockResolvedValueOnce({ _sum: { totalAmount: null } });

    const result = await getBusinessOverviewMetrics(TENANT_ID);

    expect(result.todayRevenueAmount).toBe(0);
    expect(result.monthlyRevenueAmount).toBe(0);
  });

  it("scopes store count to non-ARCHIVED stores for this tenant", async () => {
    await getBusinessOverviewMetrics(TENANT_ID);

    expect(mockPrisma.store.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT_ID,
          status: { not: "ARCHIVED" },
        }),
      })
    );
  });
});

// ─── getOwnerStoreSummaries ───────────────────────────────────────────────────

describe("getOwnerStoreSummaries", () => {
  beforeEach(() => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_A, name: "Alpha", code: "alpha", status: "ACTIVE", currency: "NZD" },
      { id: STORE_B, name: "Beta", code: "beta", status: "INACTIVE", currency: "NZD" },
    ]);
    mockPrisma.connection.findMany.mockResolvedValue([
      { storeId: STORE_A, type: "POS", status: "CONNECTED" },
      { storeId: STORE_A, type: "DELIVERY", status: "ERROR" },
    ]);
    mockPrisma.order.groupBy.mockResolvedValue([
      {
        storeId: STORE_A,
        currencyCode: "NZD",
        _count: { id: 10 },
        _sum: { totalAmount: 50000 },
      },
    ]);
  });

  it("excludes ARCHIVED stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_A, name: "Alpha", code: "alpha", status: "ACTIVE", currency: "NZD" },
      { id: "store-archived", name: "Old", code: "old", status: "ARCHIVED", currency: "NZD" },
    ]);

    // The service filters by { status: { not: "ARCHIVED" } } in the query
    await getOwnerStoreSummaries(TENANT_ID);

    expect(mockPrisma.store.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: { not: "ARCHIVED" } }),
      })
    );
  });

  it("returns correct posStatus and deliveryStatus for each store", async () => {
    const summaries = await getOwnerStoreSummaries(TENANT_ID);
    const alpha = summaries.find((s) => s.storeId === STORE_A)!;
    const beta = summaries.find((s) => s.storeId === STORE_B)!;

    expect(alpha.posStatus).toBe("CONNECTED");
    expect(alpha.deliveryStatus).toBe("ERROR");
    expect(beta.posStatus).toBe("NOT_CONNECTED");
    expect(beta.deliveryStatus).toBe("NOT_CONNECTED");
  });

  it("returns today order and revenue in minor units", async () => {
    const summaries = await getOwnerStoreSummaries(TENANT_ID);
    const alpha = summaries.find((s) => s.storeId === STORE_A)!;

    expect(alpha.todayOrders).toBe(10);
    expect(alpha.todayRevenueAmount).toBe(50000);
  });

  it("returns 0 orders and revenue for stores without orders today", async () => {
    const summaries = await getOwnerStoreSummaries(TENANT_ID);
    const beta = summaries.find((s) => s.storeId === STORE_B)!;

    expect(beta.todayOrders).toBe(0);
    expect(beta.todayRevenueAmount).toBe(0);
  });

  it("returns empty array when tenant has no stores", async () => {
    mockPrisma.store.findMany.mockResolvedValue([]);

    const summaries = await getOwnerStoreSummaries(TENANT_ID);
    expect(summaries).toEqual([]);
  });
});

// ─── getOwnerDashboardAlerts ──────────────────────────────────────────────────

describe("getOwnerDashboardAlerts", () => {
  beforeEach(() => {
    mockPrisma.store.findMany.mockResolvedValue([
      { id: STORE_A, name: "Alpha" },
    ]);
    mockPrisma.connection.findMany
      .mockResolvedValueOnce([]) // problem connections
      .mockResolvedValueOnce([]); // sync-failed connections
    mockPrisma.membership.count.mockResolvedValue(0);
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([]);
  });

  it("returns no alerts when everything is healthy", async () => {
    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    expect(alerts).toHaveLength(0);
  });

  it("generates POS_CONNECTION_ISSUE alert for ERROR connections", async () => {
    mockPrisma.connection.findMany.mockReset();
    mockPrisma.connection.findMany
      .mockResolvedValueOnce([
        { id: "conn-1", storeId: STORE_A, type: "POS", status: "ERROR", provider: "LOYVERSE", lastSyncStatus: null, lastErrorCode: null },
      ])
      .mockResolvedValueOnce([]);

    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "POS_CONNECTION_ISSUE");

    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("CRITICAL");
    expect(alert!.id).toBe("pos-issue-conn-1");
  });

  it("generates DELIVERY_CONNECTION_ISSUE alert for REAUTH_REQUIRED connections", async () => {
    mockPrisma.connection.findMany.mockReset();
    mockPrisma.connection.findMany
      .mockResolvedValueOnce([
        { id: "conn-2", storeId: STORE_A, type: "DELIVERY", status: "REAUTH_REQUIRED", provider: "UBER_EATS", lastSyncStatus: null, lastErrorCode: null },
      ])
      .mockResolvedValueOnce([]);

    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "DELIVERY_CONNECTION_ISSUE");

    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("WARNING");
    expect(alert!.message).toContain("requires reconnection");
  });

  it("generates SYNC_FAILED alert when lastSyncStatus is FAILED", async () => {
    mockPrisma.connection.findMany.mockReset();
    mockPrisma.connection.findMany
      .mockResolvedValueOnce([]) // no problem connections
      .mockResolvedValueOnce([
        { id: "conn-3", storeId: STORE_A, provider: "LOYVERSE", type: "POS" },
      ]);

    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "SYNC_FAILED");

    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("WARNING");
    expect(alert!.id).toBe("sync-failed-conn-3");
  });

  it("generates PENDING_INVITATION alert with correct count wording", async () => {
    mockPrisma.membership.count.mockResolvedValue(3);
    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "PENDING_INVITATION");

    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("INFO");
    expect(alert!.message).toBe("3 team invitations are still pending.");
  });

  it("uses singular wording for a single pending invitation", async () => {
    mockPrisma.membership.count.mockResolvedValue(1);
    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "PENDING_INVITATION");

    expect(alert!.message).toBe("1 team invitation is still pending.");
  });

  it("generates BILLING_ISSUE alert for PAST_DUE subscription", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([
      { id: "sub-1", status: "PAST_DUE" },
    ]);
    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    const alert = alerts.find((a) => a.type === "BILLING_ISSUE");

    expect(alert).toBeDefined();
    expect(alert!.severity).toBe("CRITICAL");
    expect(alert!.href).toBe("/owner/billing");
  });

  it("only creates alerts for active stores (ignores INACTIVE store connections)", async () => {
    // Only STORE_A is active; connection belongs to a different store
    mockPrisma.connection.findMany
      .mockResolvedValueOnce([
        {
          id: "conn-inactive",
          storeId: "store-inactive",
          type: "POS",
          status: "ERROR",
          provider: "LOYVERSE",
          lastSyncStatus: null,
          lastErrorCode: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const alerts = await getOwnerDashboardAlerts(TENANT_ID);
    // The inactive store's POS error should produce no alert because we filter
    // to active store IDs inside the service
    expect(alerts.filter((a) => a.type === "POS_CONNECTION_ISSUE")).toHaveLength(0);
  });
});
