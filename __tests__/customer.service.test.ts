import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    subscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import {
  listCustomerOrders,
  getCustomerOrderDetail,
  listCustomerSubscriptions,
  pauseCustomerSubscription,
  resumeCustomerSubscription,
  cancelCustomerSubscription,
  updateNextOrderDate,
  getCustomerAccount,
  updateCustomerName,
  changeCustomerPassword,
  CustomerOrderNotFoundError,
  CustomerSubscriptionNotFoundError,
  CustomerSubscriptionOwnershipError,
  CustomerSubscriptionTransitionError,
  CustomerPasswordError,
} from "@/services/customer.service";

const mockPrisma = prisma as unknown as {
  order: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  store: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  customer: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  subscription: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const mockBcrypt = bcrypt as unknown as {
  compare: ReturnType<typeof vi.fn>;
  hash: ReturnType<typeof vi.fn>;
};

const USER_EMAIL = "alice@example.com";
const OTHER_EMAIL = "bob@example.com";
const USER_ID = "user-001";
const STORE_ID = "store-aaa";
const ORDER_ID = "order-001";
const SUB_ID = "sub-001";
const CUSTOMER_ID = "cust-001";

const baseOrder = (overrides = {}) => ({
  id: ORDER_ID,
  status: "COMPLETED",
  sourceChannel: "ONLINE",
  storeId: STORE_ID,
  orderedAt: new Date("2026-01-10T10:00:00Z"),
  acceptedAt: new Date("2026-01-10T10:01:00Z"),
  completedAt: new Date("2026-01-10T10:30:00Z"),
  cancelledAt: null,
  subtotalAmount: 1500,
  discountAmount: 0,
  taxAmount: 150,
  tipAmount: 0,
  totalAmount: 1650,
  currencyCode: "NZD",
  notes: null,
  customerEmail: USER_EMAIL,
  items: [],
  events: [],
  _count: { items: 0 },
  ...overrides,
});

const baseSubscription = (overrides = {}) => ({
  id: SUB_ID,
  customerId: CUSTOMER_ID,
  status: "ACTIVE",
  planId: "plan-001",
  startDate: new Date("2026-01-01"),
  nextBillingDate: new Date("2026-02-01"),
  nextOrderAt: null,
  pausedAt: null,
  cancelledAt: null,
  tenantId: "tenant-001",
  plan: {
    id: "plan-001",
    name: "Monthly Box",
    interval: "MONTHLY",
    price: 2000,
    store: { id: STORE_ID, name: "Store Alpha" },
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.order.count.mockResolvedValue(0);
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.order.findUnique.mockResolvedValue(null);
  mockPrisma.store.findMany.mockResolvedValue([]);
  mockPrisma.store.findUnique.mockResolvedValue(null);
  mockPrisma.customer.findMany.mockResolvedValue([]);
  mockPrisma.customer.findUnique.mockResolvedValue(null);
  mockPrisma.subscription.findMany.mockResolvedValue([]);
  mockPrisma.subscription.findUnique.mockResolvedValue(null);
  mockPrisma.subscription.update.mockResolvedValue({});
  mockPrisma.user.findUnique.mockResolvedValue(null);
  mockPrisma.user.update.mockResolvedValue({});
});

// ─── listCustomerOrders ───────────────────────────────────────────────────────

describe("listCustomerOrders", () => {
  it("returns empty list when no orders", async () => {
    const result = await listCustomerOrders(USER_EMAIL);
    expect(result.orders).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("maps orders to summaries with store name", async () => {
    mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.store.findMany.mockResolvedValue([{ id: STORE_ID, name: "Store Alpha" }]);

    const result = await listCustomerOrders(USER_EMAIL);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].storeName).toBe("Store Alpha");
    expect(result.orders[0].status).toBe("COMPLETED");
    expect(result.orders[0].totalAmount).toBe(1650);
    expect(result.total).toBe(1);
  });

  it("scopes query to user email", async () => {
    await listCustomerOrders(USER_EMAIL, { status: "COMPLETED" });
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.where.customerEmail).toBe(USER_EMAIL);
    expect(call.where.status).toBe("COMPLETED");
  });

  it("respects limit and offset", async () => {
    await listCustomerOrders(USER_EMAIL, { limit: 5, offset: 10 });
    const call = mockPrisma.order.findMany.mock.calls[0][0];
    expect(call.take).toBe(5);
    expect(call.skip).toBe(10);
  });

  it("handles unknown store gracefully (null storeName)", async () => {
    mockPrisma.order.findMany.mockResolvedValue([baseOrder()]);
    mockPrisma.order.count.mockResolvedValue(1);
    mockPrisma.store.findMany.mockResolvedValue([]); // no stores returned

    const result = await listCustomerOrders(USER_EMAIL);
    expect(result.orders[0].storeName).toBeNull();
  });
});

// ─── getCustomerOrderDetail ───────────────────────────────────────────────────

describe("getCustomerOrderDetail", () => {
  it("returns order detail when ownership matches", async () => {
    const order = {
      ...baseOrder(),
      items: [
        {
          id: "item-1",
          productName: "Latte",
          quantity: 2,
          unitPriceAmount: 700,
          totalPriceAmount: 1400,
          notes: null,
          createdAt: new Date(),
          modifiers: [],
        },
      ],
      events: [
        {
          id: "evt-1",
          eventType: "ORDER_RECEIVED",
          message: null,
          createdAt: new Date("2026-01-10T10:00:00Z"),
        },
      ],
    };
    mockPrisma.order.findUnique.mockResolvedValue(order);
    mockPrisma.store.findUnique.mockResolvedValue({ name: "Store Alpha" });

    const detail = await getCustomerOrderDetail(ORDER_ID, USER_EMAIL);
    expect(detail.id).toBe(ORDER_ID);
    expect(detail.storeName).toBe("Store Alpha");
    expect(detail.items).toHaveLength(1);
    expect(detail.items[0].productName).toBe("Latte");
    expect(detail.events).toHaveLength(1);
  });

  it("throws CustomerOrderNotFoundError when order not found", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(null);
    await expect(getCustomerOrderDetail(ORDER_ID, USER_EMAIL)).rejects.toThrow(
      CustomerOrderNotFoundError
    );
  });

  it("throws CustomerOrderNotFoundError when email does not match", async () => {
    mockPrisma.order.findUnique.mockResolvedValue(baseOrder({ customerEmail: OTHER_EMAIL }));
    await expect(getCustomerOrderDetail(ORDER_ID, USER_EMAIL)).rejects.toThrow(
      CustomerOrderNotFoundError
    );
  });
});

// ─── listCustomerSubscriptions ────────────────────────────────────────────────

describe("listCustomerSubscriptions", () => {
  it("returns empty list when no customer records", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([]);
    const result = await listCustomerSubscriptions(USER_EMAIL);
    expect(result).toHaveLength(0);
  });

  it("returns subscriptions mapped to summary shape", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([{ id: CUSTOMER_ID }]);
    mockPrisma.subscription.findMany.mockResolvedValue([baseSubscription()]);

    const result = await listCustomerSubscriptions(USER_EMAIL);
    expect(result).toHaveLength(1);
    expect(result[0].planName).toBe("Monthly Box");
    expect(result[0].status).toBe("ACTIVE");
    expect(result[0].storeName).toBe("Store Alpha");
    expect(result[0].planPrice).toBe(2000);
  });

  it("queries subscriptions using customer IDs derived from email", async () => {
    mockPrisma.customer.findMany.mockResolvedValue([{ id: CUSTOMER_ID }]);
    mockPrisma.subscription.findMany.mockResolvedValue([]);

    await listCustomerSubscriptions(USER_EMAIL);
    const call = mockPrisma.subscription.findMany.mock.calls[0][0];
    expect(call.where.customerId.in).toContain(CUSTOMER_ID);
  });
});

// ─── pauseCustomerSubscription ────────────────────────────────────────────────

describe("pauseCustomerSubscription", () => {
  it("pauses an ACTIVE subscription belonging to the customer", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription());
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await pauseCustomerSubscription(SUB_ID, USER_EMAIL);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PAUSED" }) })
    );
  });

  it("throws CustomerSubscriptionNotFoundError when subscription missing", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);
    await expect(pauseCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionNotFoundError
    );
  });

  it("throws CustomerSubscriptionOwnershipError when email does not match", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription());
    mockPrisma.customer.findUnique.mockResolvedValue({ email: OTHER_EMAIL });

    await expect(pauseCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionOwnershipError
    );
  });

  it("throws CustomerSubscriptionTransitionError when already PAUSED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "PAUSED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await expect(pauseCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });

  it("throws CustomerSubscriptionTransitionError when CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "CANCELLED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await expect(pauseCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });
});

// ─── resumeCustomerSubscription ───────────────────────────────────────────────

describe("resumeCustomerSubscription", () => {
  it("resumes a PAUSED subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "PAUSED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await resumeCustomerSubscription(SUB_ID, USER_EMAIL);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });

  it("throws when subscription is already ACTIVE", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "ACTIVE" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await expect(resumeCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });

  it("throws when subscription is CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "CANCELLED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await expect(resumeCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });
});

// ─── cancelCustomerSubscription ───────────────────────────────────────────────

describe("cancelCustomerSubscription", () => {
  it("cancels an ACTIVE subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription());
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await cancelCustomerSubscription(SUB_ID, USER_EMAIL);
    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "CANCELLED" }) })
    );
  });

  it("cancels a PAUSED subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "PAUSED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await cancelCustomerSubscription(SUB_ID, USER_EMAIL);
    expect(mockPrisma.subscription.update).toHaveBeenCalled();
  });

  it("throws when already CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "CANCELLED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    await expect(cancelCustomerSubscription(SUB_ID, USER_EMAIL)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });
});

// ─── updateNextOrderDate ──────────────────────────────────────────────────────

describe("updateNextOrderDate", () => {
  it("updates next order date to a future date", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription());
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    const future = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await updateNextOrderDate(SUB_ID, USER_EMAIL, future);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { nextOrderAt: future } })
    );
  });

  it("throws when date is in the past", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription());
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    const past = new Date(Date.now() - 1000);
    await expect(updateNextOrderDate(SUB_ID, USER_EMAIL, past)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });

  it("throws when subscription is CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSubscription({ status: "CANCELLED" }));
    mockPrisma.customer.findUnique.mockResolvedValue({ email: USER_EMAIL });

    const future = new Date(Date.now() + 86400000);
    await expect(updateNextOrderDate(SUB_ID, USER_EMAIL, future)).rejects.toThrow(
      CustomerSubscriptionTransitionError
    );
  });
});

// ─── getCustomerAccount ───────────────────────────────────────────────────────

describe("getCustomerAccount", () => {
  it("returns account info when user found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: USER_ID,
      name: "Alice",
      email: USER_EMAIL,
      phone: null,
    });

    const account = await getCustomerAccount(USER_ID);
    expect(account).toEqual({ id: USER_ID, name: "Alice", email: USER_EMAIL, phone: null });
  });

  it("returns null when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const account = await getCustomerAccount(USER_ID);
    expect(account).toBeNull();
  });
});

// ─── updateCustomerName ───────────────────────────────────────────────────────

describe("updateCustomerName", () => {
  it("updates user name", async () => {
    await updateCustomerName(USER_ID, "Alice Updated");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { name: "Alice Updated" } })
    );
  });

  it("trims whitespace from name", async () => {
    await updateCustomerName(USER_ID, "  Alice  ");
    const call = mockPrisma.user.update.mock.calls[0][0];
    expect(call.data.name).toBe("Alice");
  });

  it("throws when name is empty after trim", async () => {
    await expect(updateCustomerName(USER_ID, "   ")).rejects.toThrow("Name cannot be empty.");
  });
});

// ─── changeCustomerPassword ───────────────────────────────────────────────────

describe("changeCustomerPassword", () => {
  it("changes password when current password is correct", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: "hashed" });
    mockBcrypt.compare.mockResolvedValue(true);
    mockBcrypt.hash.mockResolvedValue("newHashed");

    await changeCustomerPassword(USER_ID, "old123456", "new123456");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { passwordHash: "newHashed" } })
    );
  });

  it("throws CustomerPasswordError when current password is wrong", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: "hashed" });
    mockBcrypt.compare.mockResolvedValue(false);

    await expect(changeCustomerPassword(USER_ID, "wrong", "new123456")).rejects.toThrow(
      CustomerPasswordError
    );
  });

  it("throws CustomerPasswordError when new password is too short", async () => {
    await expect(changeCustomerPassword(USER_ID, "current", "short")).rejects.toThrow(
      CustomerPasswordError
    );
  });

  it("throws CustomerPasswordError when user has no password hash", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ passwordHash: null });
    await expect(changeCustomerPassword(USER_ID, "old", "newpass123")).rejects.toThrow(
      CustomerPasswordError
    );
  });

  it("throws CustomerPasswordError when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(changeCustomerPassword(USER_ID, "old", "newpass123")).rejects.toThrow(
      CustomerPasswordError
    );
  });
});
