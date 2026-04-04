import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    orderEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listLiveOrders,
  getBackofficeOrderDetail,
  updateBackofficeOrderStatus,
  isValidTransition,
  VALID_TRANSITIONS,
} from "@/services/backoffice/backoffice-orders.service";

const mockPrisma = prisma as unknown as {
  order: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  orderEvent: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const STORE_ID = "store-001";
const ORDER_ID = "order-001";
const TENANT_ID = "tenant-001";

function makeOrderRow(overrides: Partial<{
  id: string; status: string; sourceChannel: string; orderedAt: Date;
  customerName: string | null; customerPhone: string | null;
  totalAmount: number; currencyCode: string;
  _count: { items: number };
}> = {}) {
  return {
    id: ORDER_ID,
    status: "RECEIVED",
    sourceChannel: "ONLINE",
    orderedAt: new Date("2025-01-01T10:00:00Z"),
    customerName: "Alice",
    customerPhone: "+64 21 000 0000",
    totalAmount: 2500,
    currencyCode: "NZD",
    _count: { items: 2 },
    ...overrides,
  };
}

function makeDetailRow() {
  return {
    id: ORDER_ID,
    status: "RECEIVED",
    sourceChannel: "ONLINE",
    orderedAt: new Date("2025-01-01T10:00:00Z"),
    customerName: "Alice",
    customerPhone: "+64 21 000 0000",
    customerEmail: "alice@example.com",
    totalAmount: 2500,
    currencyCode: "NZD",
    subtotalAmount: 2400,
    discountAmount: 0,
    taxAmount: 100,
    tipAmount: 0,
    notes: null,
    items: [
      {
        id: "item-001",
        productName: "Burger",
        quantity: 1,
        unitPriceAmount: 1800,
        totalPriceAmount: 1800,
        notes: null,
        modifiers: [
          { modifierOptionName: "Extra cheese", unitPriceAmount: 200 },
        ],
      },
    ],
    events: [
      {
        id: "event-001",
        eventType: "ORDER_RECEIVED",
        message: "Order received",
        createdAt: new Date("2025-01-01T10:00:00Z"),
      },
    ],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
    for (const op of ops) await op;
  });
});

// ─── isValidTransition ────────────────────────────────────────────────────────

describe("isValidTransition", () => {
  it("allows RECEIVED → ACCEPTED", () => {
    expect(isValidTransition("RECEIVED", "ACCEPTED")).toBe(true);
  });

  it("allows RECEIVED → CANCELLED", () => {
    expect(isValidTransition("RECEIVED", "CANCELLED")).toBe(true);
  });

  it("disallows RECEIVED → COMPLETED", () => {
    expect(isValidTransition("RECEIVED", "COMPLETED")).toBe(false);
  });

  it("disallows COMPLETED → anything", () => {
    for (const status of Object.keys(VALID_TRANSITIONS)) {
      if (status !== "COMPLETED") {
        expect(isValidTransition("COMPLETED", status)).toBe(false);
      }
    }
  });

  it("follows the full happy path", () => {
    const path = ["RECEIVED", "ACCEPTED", "IN_PROGRESS", "READY", "COMPLETED"];
    for (let i = 0; i < path.length - 1; i++) {
      expect(isValidTransition(path[i], path[i + 1])).toBe(true);
    }
  });
});

// ─── listLiveOrders ───────────────────────────────────────────────────────────

describe("listLiveOrders", () => {
  it("returns orders with correct structure", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrderRow({ status: "RECEIVED" }),
      makeOrderRow({ id: "order-002", status: "IN_PROGRESS", customerName: null }),
    ]);

    const result = await listLiveOrders(STORE_ID);

    expect(result.total).toBe(2);
    expect(result.orders).toHaveLength(2);
    expect(result.orders[0]).toMatchObject({
      id: ORDER_ID,
      status: "RECEIVED",
      sourceChannel: "ONLINE",
      customerName: "Alice",
    });
  });

  it("computes ageMinutes as a non-negative integer", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrderRow({ orderedAt: new Date(Date.now() - 5 * 60_000) }),
    ]);

    const result = await listLiveOrders(STORE_ID);
    expect(result.orders[0].ageMinutes).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(result.orders[0].ageMinutes)).toBe(true);
  });

  it("returns empty result when no orders", async () => {
    mockPrisma.order.findMany.mockResolvedValue([]);
    const result = await listLiveOrders(STORE_ID);
    expect(result.total).toBe(0);
    expect(result.orders).toHaveLength(0);
  });

  it("defaults sourceChannel to UNKNOWN for null", async () => {
    mockPrisma.order.findMany.mockResolvedValue([
      makeOrderRow({ sourceChannel: null as unknown as string }),
    ]);
    const result = await listLiveOrders(STORE_ID);
    expect(result.orders[0].sourceChannel).toBe("UNKNOWN");
  });
});

// ─── getBackofficeOrderDetail ─────────────────────────────────────────────────

describe("getBackofficeOrderDetail", () => {
  it("returns null when order not found", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const result = await getBackofficeOrderDetail(STORE_ID, ORDER_ID);
    expect(result).toBeNull();
  });

  it("returns full order detail with items and events", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeDetailRow());
    const result = await getBackofficeOrderDetail(STORE_ID, ORDER_ID);

    expect(result).not.toBeNull();
    expect(result!.id).toBe(ORDER_ID);
    expect(result!.items).toHaveLength(1);
    expect(result!.items[0].productName).toBe("Burger");
    expect(result!.items[0].modifiers).toHaveLength(1);
    expect(result!.events).toHaveLength(1);
  });

  it("maps modifier fields correctly", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeDetailRow());
    const result = await getBackofficeOrderDetail(STORE_ID, ORDER_ID);
    expect(result!.items[0].modifiers[0]).toMatchObject({
      modifierOptionName: "Extra cheese",
      unitPriceAmount: 200,
    });
  });

  it("converts event createdAt to ISO string", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(makeDetailRow());
    const result = await getBackofficeOrderDetail(STORE_ID, ORDER_ID);
    expect(typeof result!.events[0].createdAt).toBe("string");
  });
});

// ─── updateBackofficeOrderStatus ─────────────────────────────────────────────

describe("updateBackofficeOrderStatus", () => {
  it("returns error when order not found", async () => {
    mockPrisma.order.findFirst.mockResolvedValue(null);
    const result = await updateBackofficeOrderStatus(STORE_ID, ORDER_ID, "ACCEPTED");
    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns error for invalid transition", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      status: "RECEIVED",
      tenantId: TENANT_ID,
    });
    const result = await updateBackofficeOrderStatus(STORE_ID, ORDER_ID, "COMPLETED");
    expect(result.success).toBe(false);
    expect(result.error).toContain("Cannot transition");
  });

  it("succeeds for valid transition", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      status: "RECEIVED",
      tenantId: TENANT_ID,
    });
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
    const result = await updateBackofficeOrderStatus(STORE_ID, ORDER_ID, "ACCEPTED");
    expect(result.success).toBe(true);
  });

  it("calls $transaction with both update and event create", async () => {
    mockPrisma.order.findFirst.mockResolvedValue({
      status: "RECEIVED",
      tenantId: TENANT_ID,
    });
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
    await updateBackofficeOrderStatus(STORE_ID, ORDER_ID, "ACCEPTED");
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });
});
