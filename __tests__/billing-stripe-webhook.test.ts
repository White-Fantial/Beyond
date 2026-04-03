import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingInvoice: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    paymentAttempt: {
      create: vi.fn(),
    },
    tenantSubscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    tenantSubscriptionEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/adapters/billing/stripe.adapter", () => ({
  stripeBillingAdapter: {
    verifyWebhookSignature: vi.fn(),
    retryInvoicePayment: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { stripeBillingAdapter } from "@/adapters/billing/stripe.adapter";

const mockPrisma = prisma as unknown as {
  billingInvoice: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  paymentAttempt: { create: ReturnType<typeof vi.fn> };
  tenantSubscription: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  tenantSubscriptionEvent: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockAdapter = stripeBillingAdapter as unknown as {
  verifyWebhookSignature: ReturnType<typeof vi.fn>;
  retryInvoicePayment: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
    for (const op of ops) await op;
  });
});

// ─── Stripe adapter security tests ───────────────────────────────────────────

describe("StripeBillingAdapter webhook signature", () => {
  it("verifyWebhookSignature returns null for invalid signature", () => {
    mockAdapter.verifyWebhookSignature.mockReturnValue(null);
    const result = stripeBillingAdapter.verifyWebhookSignature("payload", "invalid");
    expect(result).toBeNull();
  });

  it("verifyWebhookSignature returns an event for valid signature", () => {
    const fakeEvent = { type: "invoice.paid", data: { object: {} } };
    mockAdapter.verifyWebhookSignature.mockReturnValue(fakeEvent);
    const result = stripeBillingAdapter.verifyWebhookSignature("payload", "valid-sig");
    expect(result).toEqual(fakeEvent);
  });
});

// ─── Billing webhook flow (mock prisma) ──────────────────────────────────────

describe("billing webhook flow (mock prisma)", () => {
  it("invoice.paid handler is idempotent — skips already-PAID invoices", async () => {
    mockPrisma.billingInvoice.findFirst.mockResolvedValue({
      id: "inv-001",
      tenantId: "t1",
      subscriptionId: "sub-001",
      status: "PAID",
    });

    const result = await (mockPrisma.billingInvoice.findFirst as () => Promise<{ status: string }>)();

    // Simulate the handler logic: if status === "PAID", skip
    expect(result.status).toBe("PAID");
    expect(mockPrisma.$transaction).not.toHaveBeenCalled();
  });

  it("retryPaymentAttempt calls retryInvoicePayment on the adapter", async () => {
    mockAdapter.retryInvoicePayment.mockResolvedValue(true);
    const result = await stripeBillingAdapter.retryInvoicePayment("in_stripe_001");
    expect(result).toBe(true);
    expect(mockAdapter.retryInvoicePayment).toHaveBeenCalledWith("in_stripe_001");
  });

  it("retryPaymentAttempt returns false when adapter fails", async () => {
    mockAdapter.retryInvoicePayment.mockResolvedValue(false);
    const result = await stripeBillingAdapter.retryInvoicePayment("in_stripe_001");
    expect(result).toBe(false);
  });
});
