import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
    },
    subscriptionPlan: {
      findMany: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  getOwnerCustomers,
  getOwnerCustomerDetail,
  getOwnerCustomerOrders,
  getOwnerCustomerSubscriptions,
  updateOwnerCustomerNote,
  getOwnerCustomerKpi,
} from "@/services/owner/customer-service";

const mockPrisma = prisma as unknown as {
  order: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  store: { findMany: ReturnType<typeof vi.fn> };
  subscriptionPlan: { findMany: ReturnType<typeof vi.fn> };
  subscription: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn> };
  customer: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockAudit = logAuditEvent as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-001";
const TENANT_B_ID = "tenant-002"; // different tenant
const STORE_A = "store-aaa";
const STORE_B = "store-bbb";
const CUSTOMER_1 = "cust-001";
const CUSTOMER_2 = "cust-002";

const baseOrder = (customerId: string, storeId: string, overrides = {}) => ({
  customerId,
  customerName: `Customer ${customerId}`,
  customerEmail: `${customerId}@example.com`,
  customerPhone: "021-000-0001",
  storeId,
  status: "COMPLETED",
  totalAmount: 1500,
  orderedAt: new Date("2026-03-15T10:00:00Z"),
  createdAt: new Date("2026-03-15T10:00:00Z"),
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();

  mockPrisma.store.findMany.mockResolvedValue([
    { id: STORE_A, name: "Store Alpha", tenantId: TENANT_ID },
    { id: STORE_B, name: "Store Beta", tenantId: TENANT_ID },
  ]);

  mockPrisma.subscriptionPlan.findMany.mockResolvedValue([
    { id: "plan-1", name: "Monthly Box", interval: "MONTHLY", price: 2000, storeId: STORE_A,
      store: { name: "Store Alpha", id: STORE_A, tenantId: TENANT_ID } },
  ]);

  mockPrisma.subscription.findMany.mockResolvedValue([]);
  mockPrisma.subscription.count.mockResolvedValue(0);
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.order.count.mockResolvedValue(0);
  mockPrisma.order.findFirst.mockResolvedValue(null);
  mockPrisma.customer.findFirst.mockResolvedValue(null);
  mockPrisma.customer.create.mockResolvedValue({ id: "cust-profile-001" });
  mockPrisma.customer.update.mockResolvedValue({ id: "cust-profile-001" });
});

// ─── getOwnerCustomers ────────────────────────────────────────────────────────

describe("getOwnerCustomers", () => {
  it("returns only customers from this tenant's orders", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A),
      baseOrder(CUSTOMER_2, STORE_B),
    ]);

    const result = await getOwnerCustomers({ tenantId: TENANT_ID });

    // Verify order query was scoped to tenant
    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      })
    );
    expect(result.customers).toHaveLength(2);
    expect(result.total).toBe(2);
  });

  it("aggregates totalOrders and lifetimeRevenue per customer", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A, { totalAmount: 1000, status: "COMPLETED" }),
      baseOrder(CUSTOMER_1, STORE_A, { totalAmount: 2000, status: "COMPLETED" }),
      baseOrder(CUSTOMER_1, STORE_A, { totalAmount: 500, status: "CANCELLED" }),
    ]);

    const result = await getOwnerCustomers({ tenantId: TENANT_ID });

    const customer = result.customers.find((c) => c.id === CUSTOMER_1);
    expect(customer).toBeDefined();
    expect(customer?.totalOrders).toBe(3);
    // Cancelled order excluded from revenue
    expect(customer?.lifetimeRevenueMinorUnit).toBe(3000);
  });

  it("filters by search query (name)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A, { customerName: "Alice Smith" }),
      baseOrder(CUSTOMER_2, STORE_B, { customerName: "Bob Jones" }),
    ]);

    const result = await getOwnerCustomers({ tenantId: TENANT_ID, q: "alice" });
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].name).toBe("Alice Smith");
  });

  it("filters by search query (email)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A, { customerEmail: "alice@example.com" }),
      baseOrder(CUSTOMER_2, STORE_B, { customerEmail: "bob@example.com" }),
    ]);

    const result = await getOwnerCustomers({ tenantId: TENANT_ID, q: "bob@" });
    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].email).toBe("bob@example.com");
  });

  it("filters by subscription status ACTIVE", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A),
      baseOrder(CUSTOMER_2, STORE_B),
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([
      { customerId: CUSTOMER_1, status: "ACTIVE" },
    ]);

    const result = await getOwnerCustomers({
      tenantId: TENANT_ID,
      subscriptionStatus: "ACTIVE",
    });

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].id).toBe(CUSTOMER_1);
  });

  it("filters by subscription status NONE (no subscription)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A),
      baseOrder(CUSTOMER_2, STORE_B),
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([
      { customerId: CUSTOMER_1, status: "ACTIVE" },
    ]);

    const result = await getOwnerCustomers({
      tenantId: TENANT_ID,
      subscriptionStatus: "NONE",
    });

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].id).toBe(CUSTOMER_2);
  });

  it("sorts by lifetime_revenue descending", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      baseOrder(CUSTOMER_1, STORE_A, { totalAmount: 1000 }),
      baseOrder(CUSTOMER_2, STORE_B, { totalAmount: 5000 }),
    ]);

    const result = await getOwnerCustomers({ tenantId: TENANT_ID, sort: "lifetime_revenue" });
    expect(result.customers[0].id).toBe(CUSTOMER_2);
    expect(result.customers[1].id).toBe(CUSTOMER_1);
  });

  it("paginates results", async () => {
    // Create 5 different customers
    const orders = Array.from({ length: 5 }, (_, i) =>
      baseOrder(`cust-00${i + 1}`, STORE_A)
    );
    mockPrisma.order.findMany.mockResolvedValue(orders);

    const page1 = await getOwnerCustomers({ tenantId: TENANT_ID, page: 1, pageSize: 2 });
    const page2 = await getOwnerCustomers({ tenantId: TENANT_ID, page: 2, pageSize: 2 });

    expect(page1.customers).toHaveLength(2);
    expect(page2.customers).toHaveLength(2);
    expect(page1.total).toBe(5);
  });

  it("scopes subscription query to tenant plans (no cross-tenant subs)", async () => {
    await getOwnerCustomers({ tenantId: TENANT_ID });

    // subscriptionPlan.findMany must be scoped to tenant via store relation
    expect(mockPrisma.subscriptionPlan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          store: expect.objectContaining({ tenantId: TENANT_ID }),
        }),
      })
    );
  });
});

// ─── getOwnerCustomerKpi ──────────────────────────────────────────────────────

describe("getOwnerCustomerKpi", () => {
  it("returns correct KPI counts", async () => {
    mockPrisma.order.findMany.mockImplementation(({ where }) => {
      // distinct customerId queries
      if (where?.orderedAt) {
        return Promise.resolve([{ customerId: CUSTOMER_1 }]); // 1 in last 30 days
      }
      return Promise.resolve([{ customerId: CUSTOMER_1 }, { customerId: CUSTOMER_2 }]);
    });
    mockPrisma.subscription.count.mockResolvedValue(3);
    mockPrisma.subscription.findMany.mockResolvedValue([{ customerId: CUSTOMER_1 }]);

    const kpi = await getOwnerCustomerKpi(TENANT_ID);
    expect(kpi.totalCustomers).toBe(2);
    expect(kpi.customersOrderedLast30Days).toBe(1);
    expect(kpi.totalActiveSubscriptions).toBe(3);
    expect(kpi.customersWithActiveSubscriptions).toBe(1);
  });
});

// ─── getOwnerCustomerDetail ───────────────────────────────────────────────────

describe("getOwnerCustomerDetail", () => {
  it("returns null when no orders or subscriptions found for tenant", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

    const result = await getOwnerCustomerDetail("nonexistent", TENANT_ID);
    expect(result).toBeNull();
  });

  it("aggregates store and channel breakdowns", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: "order-1",
        storeId: STORE_A,
        status: "COMPLETED",
        sourceChannel: "ONLINE",
        totalAmount: 1000,
        orderedAt: new Date("2026-03-15"),
        customerName: "Alice",
        customerEmail: "alice@test.com",
        customerPhone: "021",
        store: { name: "Store Alpha" },
      },
      {
        id: "order-2",
        storeId: STORE_B,
        status: "COMPLETED",
        sourceChannel: "POS",
        totalAmount: 2000,
        orderedAt: new Date("2026-03-10"),
        customerName: "Alice",
        customerEmail: "alice@test.com",
        customerPhone: "021",
        store: { name: "Store Beta" },
      },
    ]);
    mockPrisma.subscription.findMany.mockResolvedValue([{ status: "ACTIVE" }]);

    const result = await getOwnerCustomerDetail(CUSTOMER_1, TENANT_ID);
    expect(result).not.toBeNull();
    expect(result?.totalOrders).toBe(2);
    expect(result?.lifetimeRevenueMinorUnit).toBe(3000);
    expect(result?.storeBreakdown).toHaveLength(2);
    expect(result?.channelBreakdown).toHaveLength(2);
    expect(result?.activeSubscriptionCount).toBe(1);
  });

  it("includes internalNote from Customer profile", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: "order-1",
        storeId: STORE_A,
        status: "COMPLETED",
        sourceChannel: "ONLINE",
        totalAmount: 1000,
        orderedAt: new Date(),
        customerName: "Alice",
        customerEmail: "alice@test.com",
        customerPhone: "021",
        store: { name: "Store Alpha" },
      },
    ]);
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: "profile-001",
      internalNote: "VIP customer",
      noteUpdatedAt: new Date("2026-04-01"),
    });

    const result = await getOwnerCustomerDetail(CUSTOMER_1, TENANT_ID);
    expect(result?.internalNote).toBe("VIP customer");
  });
});

// ─── getOwnerCustomerOrders ───────────────────────────────────────────────────

describe("getOwnerCustomerOrders", () => {
  it("queries orders scoped to tenant and customer", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.order.count.mockResolvedValue(0);

    await getOwnerCustomerOrders(CUSTOMER_1, TENANT_ID);

    expect(mockPrisma.order.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID, customerId: CUSTOMER_1 },
      })
    );
  });

  it("returns orders with store name from storeNameById map", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      {
        id: "order-1",
        storeId: STORE_A,
        sourceChannel: "ONLINE",
        status: "COMPLETED",
        totalAmount: 1500,
        currencyCode: "NZD",
        orderedAt: new Date("2026-03-15"),
        createdAt: new Date("2026-03-15"),
        store: { name: "Store Alpha" },
      },
    ]);
    mockPrisma.order.count.mockResolvedValue(1);

    const result = await getOwnerCustomerOrders(CUSTOMER_1, TENANT_ID);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].storeName).toBe("Store Alpha");
    expect(result.total).toBe(1);
  });
});

// ─── getOwnerCustomerSubscriptions ───────────────────────────────────────────

describe("getOwnerCustomerSubscriptions", () => {
  it("returns empty array when no tenant plans exist", async () => {
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);
    const result = await getOwnerCustomerSubscriptions(CUSTOMER_1, TENANT_ID);
    expect(result).toEqual([]);
  });

  it("returns only subscriptions matching tenant plans", async () => {
    mockPrisma.subscription.findMany.mockResolvedValue([
      {
        id: "sub-001",
        planId: "plan-1",
        customerId: CUSTOMER_1,
        status: "ACTIVE",
        startDate: new Date("2026-01-01"),
        nextBillingDate: new Date("2026-05-01"),
        nextOrderAt: null,
        cancelledAt: null,
        pausedAt: null,
        cancelReason: null,
        internalNote: null,
        updatedAt: new Date("2026-04-01"),
      },
    ]);

    const result = await getOwnerCustomerSubscriptions(CUSTOMER_1, TENANT_ID);
    expect(result).toHaveLength(1);
    expect(result[0].planName).toBe("Monthly Box");
    expect(result[0].storeName).toBe("Store Alpha");
    expect(result[0].status).toBe("ACTIVE");
  });
});

// ─── updateOwnerCustomerNote ──────────────────────────────────────────────────

describe("updateOwnerCustomerNote", () => {
  it("creates a Customer profile and logs audit event", async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.findFirst.mockResolvedValue({
      customerEmail: "alice@test.com",
      customerName: "Alice",
      customerPhone: "021",
    });
    mockPrisma.customer.findFirst.mockResolvedValue(null);

    await updateOwnerCustomerNote(CUSTOMER_1, TENANT_ID, "VIP customer", {
      userId: "user-001",
    });

    expect(mockPrisma.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_ID,
          internalNote: "VIP customer",
          noteUpdatedByUserId: "user-001",
        }),
      })
    );

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_CUSTOMER_NOTE_UPDATED",
        targetType: "Customer",
        targetId: CUSTOMER_1,
        tenantId: TENANT_ID,
        actorUserId: "user-001",
      })
    );
  });

  it("updates existing Customer profile when one exists", async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.findFirst.mockResolvedValue({
      customerEmail: "alice@test.com",
      customerName: "Alice",
      customerPhone: "021",
    });
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: "profile-001",
      internalNote: "Old note",
      name: "Alice",
      phone: null,
    });

    await updateOwnerCustomerNote(CUSTOMER_1, TENANT_ID, "New note", { userId: "user-001" });

    expect(mockPrisma.customer.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "profile-001" },
        data: expect.objectContaining({ internalNote: "New note" }),
      })
    );
  });

  it("throws CUSTOMER_NOT_FOUND when customer has no orders or subscriptions", async () => {
    mockPrisma.order.count.mockResolvedValue(0);
    mockPrisma.subscriptionPlan.findMany.mockResolvedValue([]);

    await expect(
      updateOwnerCustomerNote("nonexistent", TENANT_ID, "note", { userId: "user-001" })
    ).rejects.toThrow("CUSTOMER_NOT_FOUND");
  });

  it("audit log contains before and after values", async () => {
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.order.findFirst.mockResolvedValue({
      customerEmail: "alice@test.com",
      customerName: "Alice",
      customerPhone: null,
    });
    mockPrisma.customer.findFirst.mockResolvedValue({
      id: "profile-001",
      internalNote: "Old note",
      name: "Alice",
      phone: null,
    });

    await updateOwnerCustomerNote(CUSTOMER_1, TENANT_ID, "New note", { userId: "user-001" });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          before: "Old note",
          after: "New note",
        }),
      })
    );
  });
});
