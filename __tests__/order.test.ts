import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    order: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    orderItem: {
      create: vi.fn(),
    },
    orderItemModifier: {
      createMany: vi.fn(),
    },
    orderChannelLink: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    orderEvent: {
      create: vi.fn(),
    },
    inboundWebhookLog: {
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createCanonicalOrderFromInbound,
  reconcilePosWebhookOrSync,
  forwardOrderToPos,
  recordPosForwardResponse,
  updateOrderStatus,
  logInboundWebhook,
  markWebhookLogProcessed,
  DuplicateOrderError,
  OrderNotFoundError,
} from "@/services/order.service";
import type { Order } from "@prisma/client";

const mockPrisma = prisma as ReturnType<typeof vi.mocked<typeof prisma>>;

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const TENANT = "tenant-001";
const STORE = "store-001";
const CONN = "conn-uber-001";

const BASE_ORDER: Order = {
  id: "order-uuid-001",
  tenantId: TENANT,
  storeId: STORE,
  sourceChannel: "UBER_EATS",
  sourceConnectionId: CONN,
  sourceOrderRef: "uber-ext-001",
  sourceCustomerRef: null,
  originSubmittedAt: null,
  orderedAt: new Date("2026-01-01T12:00:00Z"),
  acceptedAt: null,
  completedAt: null,
  cancelledAt: null,
  status: "RECEIVED",
  subtotalAmount: 1500,
  discountAmount: 0,
  taxAmount: 150,
  tipAmount: 0,
  totalAmount: 1650,
  currencyCode: "NZD",
  customerId: null,
  customerName: "Alice",
  customerPhone: null,
  customerEmail: null,
  posForwardingRequired: false,
  posConnectionId: null,
  posSubmissionStatus: "NOT_REQUIRED",
  posOrderRef: null,
  posSubmittedAt: null,
  posAcceptedAt: null,
  canonicalOrderKey: "UBER_EATS:store-001:uber-ext-001",
  externalCreatedByBeyond: false,
  notes: null,
  rawSourcePayload: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeOrder(overrides: Partial<Order> = {}): Order {
  return { ...BASE_ORDER, ...overrides };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Wire $transaction to execute its callback with the prisma mock itself.
 * Simulates the Prisma interactive transaction API.
 */
function mockTransaction() {
  vi.mocked(mockPrisma.$transaction).mockImplementation(
    async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(mockPrisma)
  );
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createCanonicalOrderFromInbound ─────────────────────────────────────────

describe("createCanonicalOrderFromInbound", () => {
  it("creates a new canonical order when none exists", async () => {
    const order = makeOrder();
    mockTransaction();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(order);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "UBER_EATS",
      connectionId: CONN,
      externalOrderRef: "uber-ext-001",
      orderedAt: new Date("2026-01-01T12:00:00Z"),
      totalAmount: 1650,
      subtotalAmount: 1500,
      taxAmount: 150,
      rawPayload: { source: "uber" },
    });

    expect(result.created).toBe(true);
    expect(result.order.id).toBe("order-uuid-001");
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();
    expect(mockPrisma.orderChannelLink.create).toHaveBeenCalledOnce();
    expect(mockPrisma.orderEvent.create).toHaveBeenCalledOnce();
  });

  it("returns existing order (idempotent) when canonicalOrderKey already exists", async () => {
    const existing = makeOrder();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(existing);

    const result = await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "UBER_EATS",
      connectionId: CONN,
      externalOrderRef: "uber-ext-001",
      orderedAt: new Date(),
      totalAmount: 1650,
      rawPayload: {},
    });

    expect(result.created).toBe(false);
    expect(result.order.id).toBe(existing.id);
    // Should NOT have created anything
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("sets SOURCE channel link role to INBOUND", async () => {
    const order = makeOrder();
    mockTransaction();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(order);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "DOORDASH",
      connectionId: "conn-dd-001",
      externalOrderRef: "dd-order-777",
      orderedAt: new Date(),
      totalAmount: 2000,
      rawPayload: {},
    });

    const linkCall = vi.mocked(mockPrisma.orderChannelLink.create).mock.calls[0][0];
    expect(linkCall.data.role).toBe("SOURCE");
    expect(linkCall.data.direction).toBe("INBOUND");
    expect(linkCall.data.channelType).toBe("DOORDASH");
  });

  it("sets posSubmissionStatus to PENDING when posForwardingRequired=true", async () => {
    const order = makeOrder({
      posForwardingRequired: true,
      posSubmissionStatus: "PENDING",
    });
    mockTransaction();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(order);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "ONLINE",
      orderedAt: new Date(),
      totalAmount: 800,
      rawPayload: {},
      posForwardingRequired: true,
      posConnectionId: "conn-pos-001",
    });

    const createCall = vi.mocked(mockPrisma.order.create).mock.calls[0][0];
    expect(createCall.data.posSubmissionStatus).toBe("PENDING");
    expect(createCall.data.posForwardingRequired).toBe(true);
  });

  it("does not create channel link when externalOrderRef is absent", async () => {
    const order = makeOrder({ sourceOrderRef: null, canonicalOrderKey: null });
    mockTransaction();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(order);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "MANUAL",
      orderedAt: new Date(),
      totalAmount: 500,
      rawPayload: {},
      // no externalOrderRef
    });

    expect(mockPrisma.orderChannelLink.create).not.toHaveBeenCalled();
  });
});

// ─── reconcilePosWebhookOrSync ────────────────────────────────────────────────

describe("reconcilePosWebhookOrSync", () => {
  it("updates existing order when a FORWARDED link is found (POS echo path)", async () => {
    const existingOrder = makeOrder({
      posForwardingRequired: true,
      posSubmissionStatus: "SENT",
    });
    const forwardedLink = {
      id: "link-001",
      orderId: existingOrder.id,
      tenantId: TENANT,
      storeId: STORE,
      channelType: "POS" as const,
      connectionId: "conn-pos-001",
      role: "FORWARDED" as const,
      direction: "OUTBOUND" as const,
      externalOrderRef: "pos-docket-001",
    };

    vi.mocked(mockPrisma.orderChannelLink.findFirst).mockResolvedValue(
      forwardedLink as never
    );
    mockTransaction();
    vi.mocked(mockPrisma.orderChannelLink.update).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderChannelLink.upsert).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(existingOrder);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await reconcilePosWebhookOrSync({
      tenantId: TENANT,
      storeId: STORE,
      connectionId: "conn-pos-001",
      externalOrderRef: "pos-docket-001",
      externalStatus: "ACCEPTED",
      rawPayload: { pos: "event" },
    });

    expect(result.action).toBe("updated");
    expect(result.order.id).toBe(existingOrder.id);
    // No new order should be created
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });

  it("creates new POS-origin order when no existing link or posOrderRef match found", async () => {
    vi.mocked(mockPrisma.orderChannelLink.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.findFirst)
      .mockResolvedValueOnce(null)  // byPosRef lookup
      .mockResolvedValueOnce(null); // idempotency check

    const newOrder = makeOrder({
      sourceChannel: "POS",
      posSubmissionStatus: "NOT_REQUIRED",
    });
    mockTransaction();
    vi.mocked(mockPrisma.order.create).mockResolvedValue(newOrder);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await reconcilePosWebhookOrSync({
      tenantId: TENANT,
      storeId: STORE,
      connectionId: "conn-pos-001",
      externalOrderRef: "pos-brand-new-001",
      rawPayload: { pos: "new" },
    });

    expect(result.action).toBe("created");
    expect(mockPrisma.order.create).toHaveBeenCalledOnce();

    const createData = vi.mocked(mockPrisma.order.create).mock.calls[0][0].data;
    expect(createData.sourceChannel).toBe("POS");
    expect(createData.canonicalOrderKey).toBe("POS:store-001:pos-brand-new-001");
  });

  it("returns existing order (idempotent) when canonicalOrderKey already exists for POS order", async () => {
    vi.mocked(mockPrisma.orderChannelLink.findFirst).mockResolvedValue(null);
    const existingPosOrder = makeOrder({ sourceChannel: "POS" });
    vi.mocked(mockPrisma.order.findFirst)
      .mockResolvedValueOnce(null)          // byPosRef lookup
      .mockResolvedValueOnce(existingPosOrder); // idempotency check

    const result = await reconcilePosWebhookOrSync({
      tenantId: TENANT,
      storeId: STORE,
      connectionId: "conn-pos-001",
      externalOrderRef: "uber-ext-001", // matches existing key
      rawPayload: {},
    });

    expect(result.action).toBe("updated");
    expect(result.order.id).toBe(existingPosOrder.id);
    expect(mockPrisma.order.create).not.toHaveBeenCalled();
  });
});

// ─── forwardOrderToPos ────────────────────────────────────────────────────────

describe("forwardOrderToPos", () => {
  it("updates order with posSubmissionStatus PENDING and creates OUTBOUND link", async () => {
    const order = makeOrder();
    const updatedOrder = makeOrder({
      posForwardingRequired: true,
      posSubmissionStatus: "PENDING",
      posConnectionId: "conn-pos-001",
    });

    mockTransaction();
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(updatedOrder);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await forwardOrderToPos({
      orderId: order.id,
      posConnectionId: "conn-pos-001",
      requestPayload: { items: [] },
    });

    expect(result.posSubmissionStatus).toBe("PENDING");
    expect(result.posForwardingRequired).toBe(true);

    const linkData = vi.mocked(mockPrisma.orderChannelLink.create).mock.calls[0][0].data;
    expect(linkData.role).toBe("FORWARDED");
    expect(linkData.direction).toBe("OUTBOUND");
    expect(linkData.channelType).toBe("POS");
    expect(linkData.createdByBeyond).toBe(true);
  });

  it("throws OrderNotFoundError when order does not exist", async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(null);

    await expect(
      forwardOrderToPos({ orderId: "non-existent", posConnectionId: "conn-pos-001" })
    ).rejects.toThrow(OrderNotFoundError);
  });
});

// ─── recordPosForwardResponse ─────────────────────────────────────────────────

describe("recordPosForwardResponse", () => {
  it("sets posSubmissionStatus to ACCEPTED on success", async () => {
    const order = makeOrder({ posSubmissionStatus: "PENDING" });
    const acceptedOrder = makeOrder({
      posSubmissionStatus: "ACCEPTED",
      posOrderRef: "pos-receipt-001",
    });

    mockTransaction();
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(acceptedOrder);
    vi.mocked(mockPrisma.orderChannelLink.updateMany).mockResolvedValue({ count: 1 });
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await recordPosForwardResponse({
      orderId: order.id,
      posConnectionId: "conn-pos-001",
      success: true,
      posOrderRef: "pos-receipt-001",
      responsePayload: { status: "ok" },
    });

    expect(result.posSubmissionStatus).toBe("ACCEPTED");
    expect(result.posOrderRef).toBe("pos-receipt-001");

    const eventData = vi.mocked(mockPrisma.orderEvent.create).mock.calls[0][0].data;
    expect(eventData.eventType).toBe("POS_FORWARD_ACCEPTED");
  });

  it("sets posSubmissionStatus to FAILED on failure", async () => {
    const order = makeOrder({ posSubmissionStatus: "PENDING" });
    const failedOrder = makeOrder({ posSubmissionStatus: "FAILED" });

    mockTransaction();
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(failedOrder);
    vi.mocked(mockPrisma.orderChannelLink.updateMany).mockResolvedValue({ count: 0 });
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await recordPosForwardResponse({
      orderId: order.id,
      posConnectionId: "conn-pos-001",
      success: false,
      errorMessage: "POS timeout",
    });

    expect(result.posSubmissionStatus).toBe("FAILED");

    const eventData = vi.mocked(mockPrisma.orderEvent.create).mock.calls[0][0].data;
    expect(eventData.eventType).toBe("POS_FORWARD_FAILED");
  });

  it("throws OrderNotFoundError when order does not exist", async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(null);

    await expect(
      recordPosForwardResponse({
        orderId: "ghost-id",
        posConnectionId: "pos",
        success: true,
      })
    ).rejects.toThrow(OrderNotFoundError);
  });
});

// ─── updateOrderStatus ────────────────────────────────────────────────────────

describe("updateOrderStatus", () => {
  it("transitions order to ACCEPTED and records event", async () => {
    const order = makeOrder();
    const accepted = makeOrder({ status: "ACCEPTED", acceptedAt: new Date() });

    mockTransaction();
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(accepted);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await updateOrderStatus(order.id, "ACCEPTED");
    expect(result.status).toBe("ACCEPTED");

    const updateData = vi.mocked(mockPrisma.order.update).mock.calls[0][0].data;
    expect(updateData.acceptedAt).toBeDefined();
  });

  it("sets completedAt when transitioning to COMPLETED", async () => {
    const order = makeOrder({ status: "READY" });
    const completed = makeOrder({ status: "COMPLETED", completedAt: new Date() });

    mockTransaction();
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(order);
    vi.mocked(mockPrisma.order.update).mockResolvedValue(completed);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    const result = await updateOrderStatus(order.id, "COMPLETED");
    expect(result.status).toBe("COMPLETED");

    const updateData = vi.mocked(mockPrisma.order.update).mock.calls[0][0].data;
    expect(updateData.completedAt).toBeDefined();
  });

  it("throws OrderNotFoundError for unknown order", async () => {
    vi.mocked(mockPrisma.order.findUnique).mockResolvedValue(null);
    await expect(updateOrderStatus("bad-id", "ACCEPTED")).rejects.toThrow(OrderNotFoundError);
  });
});

// ─── logInboundWebhook / markWebhookLogProcessed ──────────────────────────────

describe("logInboundWebhook", () => {
  it("creates an InboundWebhookLog record", async () => {
    const log = {
      id: "log-001",
      processingStatus: "RECEIVED",
      receivedAt: new Date(),
    };
    vi.mocked(mockPrisma.inboundWebhookLog.create).mockResolvedValue(log as never);

    const result = await logInboundWebhook({
      tenantId: TENANT,
      storeId: STORE,
      connectionId: CONN,
      channelType: "UBER_EATS",
      eventName: "orders.notification",
      externalEventRef: "uber-event-001",
      processingStatus: "RECEIVED",
      requestBody: { order_id: "uber-ext-001" },
    });

    expect(result.id).toBe("log-001");
    expect(mockPrisma.inboundWebhookLog.create).toHaveBeenCalledOnce();
  });
});

describe("markWebhookLogProcessed", () => {
  it("updates processingStatus and processedAt", async () => {
    vi.mocked(mockPrisma.inboundWebhookLog.update).mockResolvedValue({} as never);

    await markWebhookLogProcessed("log-001", "PROCESSED");

    const call = vi.mocked(mockPrisma.inboundWebhookLog.update).mock.calls[0][0];
    expect(call.data.processingStatus).toBe("PROCESSED");
    expect(call.data.processedAt).toBeDefined();
    expect(call.data.errorMessage).toBeNull();
  });

  it("records errorMessage when provided", async () => {
    vi.mocked(mockPrisma.inboundWebhookLog.update).mockResolvedValue({} as never);

    await markWebhookLogProcessed("log-002", "FAILED", "Signature mismatch");

    const call = vi.mocked(mockPrisma.inboundWebhookLog.update).mock.calls[0][0];
    expect(call.data.processingStatus).toBe("FAILED");
    expect(call.data.errorMessage).toBe("Signature mismatch");
  });
});

// ─── Canonical key / dedup logic ─────────────────────────────────────────────

describe("canonical order key construction", () => {
  it("produces stable key format <CHANNEL>:<storeId>:<externalRef>", async () => {
    const order = makeOrder({ canonicalOrderKey: "DOORDASH:store-001:dd-99" });
    mockTransaction();
    vi.mocked(mockPrisma.order.findFirst).mockResolvedValue(null);
    vi.mocked(mockPrisma.order.create).mockResolvedValue(order);
    vi.mocked(mockPrisma.orderChannelLink.create).mockResolvedValue({} as never);
    vi.mocked(mockPrisma.orderEvent.create).mockResolvedValue({} as never);

    await createCanonicalOrderFromInbound({
      tenantId: TENANT,
      storeId: STORE,
      channelType: "DOORDASH",
      connectionId: "conn-dd",
      externalOrderRef: "dd-99",
      orderedAt: new Date(),
      totalAmount: 1000,
      rawPayload: {},
    });

    const createData = vi.mocked(mockPrisma.order.create).mock.calls[0][0].data;
    expect(createData.canonicalOrderKey).toBe("DOORDASH:store-001:dd-99");
  });
});
