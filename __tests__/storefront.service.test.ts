import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: { findFirst: vi.fn(), findUniqueOrThrow: vi.fn() },
    catalogProduct: { findMany: vi.fn() },
    order: { findFirst: vi.fn() },
    subscriptionPlan: { findMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    subscription: { create: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock("@/services/order.service", () => ({
  createCanonicalOrderFromInbound: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createCanonicalOrderFromInbound } from "@/services/order.service";
import {
  placeGuestOrder,
  getGuestOrderStatus,
  getSubscriptionPlansForStore,
  enrollGuestSubscription,
  getGuestSubscriptionStatus,
} from "@/services/customer-menu.service";
import type { PlaceGuestOrderInput, PlaceGuestSubscriptionInput } from "@/types/storefront";

const mockPrisma = prisma as unknown as {
  store: { findFirst: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
  catalogProduct: { findMany: ReturnType<typeof vi.fn> };
  order: { findFirst: ReturnType<typeof vi.fn> };
  subscriptionPlan: { findMany: ReturnType<typeof vi.fn>; findUniqueOrThrow: ReturnType<typeof vi.fn> };
  subscription: { create: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn> };
};
const mockCreateOrder = createCanonicalOrderFromInbound as ReturnType<typeof vi.fn>;

const STORE_ID = "store-001";
const TENANT_ID = "tenant-001";
const ORDER_ID = "order-001";

function makeStore() {
  return { id: STORE_ID, tenantId: TENANT_ID, currency: "NZD" };
}

function makeProduct(
  overrides: Partial<{ id: string; name: string; isSoldOut: boolean }> = {}
) {
  return {
    id: "product-001",
    name: "Burger",
    basePriceAmount: 1500,
    isSoldOut: false,
    ...overrides,
  };
}

function makeInput(overrides: Partial<PlaceGuestOrderInput> = {}): PlaceGuestOrderInput {
  return {
    storeId: STORE_ID,
    customerName: "Alice",
    customerPhone: "+64 21 000 0000",
    pickupTime: new Date(Date.now() + 20 * 60_000).toISOString(),
    items: [
      {
        productId: "product-001",
        productName: "Burger",
        unitPriceAmount: 1500,
        quantity: 1,
        selectedModifiers: [],
      },
    ],
    currencyCode: "NZD",
    ...overrides,
  };
}

const PLAN_ID = "plan-001";
const SUB_ID = "sub-001";

function makePlan(overrides: Partial<{ id: string; storeId: string; price: number; interval: string; isActive: boolean; benefits: string[] }> = {}) {
  return {
    id: PLAN_ID,
    storeId: STORE_ID,
    name: "Weekly Box",
    price: 2500,
    interval: "WEEKLY",
    isActive: true,
    benefits: ["Fresh produce", "Free delivery"],
    createdAt: new Date("2025-01-01T00:00:00Z"),
    ...overrides,
  };
}

function makeSubInput(overrides: Partial<PlaceGuestSubscriptionInput> = {}): PlaceGuestSubscriptionInput {
  return {
    storeId: STORE_ID,
    planId: PLAN_ID,
    customerName: "Alice",
    customerPhone: "+64 21 000 0000",
    customerEmail: "alice@example.com",
    frequency: "WEEKLY",
    startDate: "2025-07-01",
    currencyCode: "NZD",
    ...overrides,
  };
}

function makeSubscription(overrides: Partial<{ id: string; status: string; startDate: Date; nextBillingDate: Date }> = {}) {
  return {
    id: SUB_ID,
    planId: PLAN_ID,
    customerId: "alice@example.com",
    status: "ACTIVE",
    startDate: new Date("2025-07-01T00:00:00Z"),
    nextBillingDate: new Date("2025-07-08T00:00:00Z"),
    tenantId: TENANT_ID,
    storeId: STORE_ID,
    updatedAt: new Date("2025-07-01T00:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.store.findFirst.mockResolvedValue(makeStore());
  mockPrisma.store.findUniqueOrThrow.mockResolvedValue(makeStore());
  mockPrisma.catalogProduct.findMany.mockResolvedValue([makeProduct()]);
  mockPrisma.subscriptionPlan.findMany.mockResolvedValue([makePlan()]);
  mockPrisma.subscriptionPlan.findUniqueOrThrow.mockResolvedValue(makePlan());
  mockPrisma.subscription.create.mockResolvedValue(makeSubscription());
  mockPrisma.subscription.findUnique.mockResolvedValue(makeSubscription());
  mockCreateOrder.mockResolvedValue({
    order: { id: ORDER_ID, status: "RECEIVED" },
    created: true,
  });
});

// ─── placeGuestOrder ──────────────────────────────────────────────────────────

describe("placeGuestOrder", () => {
  it("returns orderId and status on success", async () => {
    const result = await placeGuestOrder(makeInput());
    expect(result.orderId).toBe(ORDER_ID);
    expect(result.status).toBe("RECEIVED");
    expect(typeof result.estimatedPickupAt).toBe("string");
  });

  it("throws when store not found", async () => {
    mockPrisma.store.findFirst.mockResolvedValue(null);
    await expect(placeGuestOrder(makeInput())).rejects.toThrow("Store not found");
  });

  it("throws when product not found in catalog", async () => {
    mockPrisma.catalogProduct.findMany.mockResolvedValue([]);
    await expect(placeGuestOrder(makeInput())).rejects.toThrow("Product not found");
  });

  it("throws when product is sold out", async () => {
    mockPrisma.catalogProduct.findMany.mockResolvedValue([
      makeProduct({ isSoldOut: true }),
    ]);
    await expect(placeGuestOrder(makeInput())).rejects.toThrow("sold out");
  });

  it("calculates totalAmount correctly", async () => {
    const input = makeInput({
      items: [
        {
          productId: "product-001",
          productName: "Burger",
          unitPriceAmount: 1500,
          quantity: 2,
          selectedModifiers: [
            {
              modifierGroupId: "mg-1",
              modifierGroupName: "Extras",
              optionId: "opt-1",
              optionName: "Extra Cheese",
              priceDeltaAmount: 200,
            },
          ],
        },
      ],
    });
    await placeGuestOrder(input);
    const callArg = mockCreateOrder.mock.calls[0][0];
    // 2 × (1500 + 200) = 3400
    expect(callArg.totalAmount).toBe(3400);
  });

  it("passes channelType ONLINE to createCanonicalOrderFromInbound", async () => {
    await placeGuestOrder(makeInput());
    const callArg = mockCreateOrder.mock.calls[0][0];
    expect(callArg.channelType).toBe("ONLINE");
  });

  it("passes customer details through", async () => {
    await placeGuestOrder(
      makeInput({ customerName: "Bob", customerPhone: "+64 21 111 0000" })
    );
    const callArg = mockCreateOrder.mock.calls[0][0];
    expect(callArg.customerName).toBe("Bob");
    expect(callArg.customerPhone).toBe("+64 21 111 0000");
  });

  it("handles multiple items and totals correctly", async () => {
    mockPrisma.catalogProduct.findMany.mockResolvedValue([
      makeProduct({ id: "product-001" }),
      makeProduct({ id: "product-002", name: "Fries" }),
    ]);
    const input = makeInput({
      items: [
        {
          productId: "product-001",
          productName: "Burger",
          unitPriceAmount: 1500,
          quantity: 1,
          selectedModifiers: [],
        },
        {
          productId: "product-002",
          productName: "Fries",
          unitPriceAmount: 500,
          quantity: 2,
          selectedModifiers: [],
        },
      ],
    });
    await placeGuestOrder(input);
    const callArg = mockCreateOrder.mock.calls[0][0];
    expect(callArg.totalAmount).toBe(2500); // 1500 + 2×500
    expect(callArg.items).toHaveLength(2);
  });

  it("validates that all unique productIds are present in the catalog", async () => {
    mockPrisma.catalogProduct.findMany.mockResolvedValue([makeProduct({ id: "product-001" })]);
    const input = makeInput({
      items: [
        {
          productId: "product-001",
          productName: "Burger",
          unitPriceAmount: 1500,
          quantity: 1,
          selectedModifiers: [],
        },
        {
          productId: "product-UNKNOWN",
          productName: "Ghost item",
          unitPriceAmount: 1000,
          quantity: 1,
          selectedModifiers: [],
        },
      ],
    });
    await expect(placeGuestOrder(input)).rejects.toThrow("Product not found");
  });
});

// ─── getGuestOrderStatus ──────────────────────────────────────────────────────

describe("getGuestOrderStatus", () => {
  it("returns null when order not found", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const result = await getGuestOrderStatus(STORE_ID, ORDER_ID);
    expect(result).toBeNull();
  });

  it("returns status object for known order", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: "ACCEPTED",
      customerName: "Alice",
      originSubmittedAt: null,
      updatedAt: new Date("2025-01-01T10:05:00Z"),
    });
    const result = await getGuestOrderStatus(STORE_ID, ORDER_ID);
    expect(result).not.toBeNull();
    expect(result!.orderId).toBe(ORDER_ID);
    expect(result!.status).toBe("ACCEPTED");
    expect(result!.customerName).toBe("Alice");
    expect(typeof result!.updatedAt).toBe("string");
  });

  it("converts updatedAt to ISO string", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: "RECEIVED",
      customerName: null,
      originSubmittedAt: null,
      updatedAt: new Date("2025-06-01T12:00:00Z"),
    });
    const result = await getGuestOrderStatus(STORE_ID, ORDER_ID);
    expect(result!.updatedAt).toBe("2025-06-01T12:00:00.000Z");
  });

  it("includes estimatedPickupAt from originSubmittedAt when set", async () => {
    const pickup = new Date("2025-01-01T10:30:00Z");
    mockPrisma.order.findFirst.mockResolvedValue({
      id: ORDER_ID,
      status: "RECEIVED",
      customerName: "Bob",
      originSubmittedAt: pickup,
      updatedAt: new Date(),
    });
    const result = await getGuestOrderStatus(STORE_ID, ORDER_ID);
    expect(result!.estimatedPickupAt).toBe(pickup.toISOString());
  });
});
