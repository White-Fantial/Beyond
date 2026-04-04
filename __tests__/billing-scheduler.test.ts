import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantSubscription: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    tenantSubscriptionEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getSubscriptionsDueForRenewal,
  markSubscriptionPastDue,
} from "@/lib/billing/scheduler";

const mockPrisma = prisma as unknown as {
  tenantSubscription: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  tenantSubscriptionEvent: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

function makeSub(
  overrides: Partial<{
    id: string;
    tenantId: string;
    planId: string;
    status: string;
    billingInterval: string;
    currentPeriodEnd: Date;
    providerSubscriptionId: string | null;
    providerCustomerId: string | null;
    cancelAtPeriodEnd: boolean;
  }> = {}
) {
  const periodEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  return {
    id: "sub-001",
    tenantId: "tenant-001",
    planId: "plan-001",
    status: "ACTIVE",
    billingInterval: "MONTHLY",
    currentPeriodEnd: periodEnd,
    providerSubscriptionId: "sub_stripe_001",
    providerCustomerId: "cus_stripe_001",
    cancelAtPeriodEnd: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
    for (const op of ops) await op;
  });
});

// ─── getSubscriptionsDueForRenewal ────────────────────────────────────────────

describe("getSubscriptionsDueForRenewal", () => {
  it("returns empty result when no subscriptions due", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([]);
    const result = await getSubscriptionsDueForRenewal();
    expect(result.totalCount).toBe(0);
    expect(result.subscriptionsDue).toHaveLength(0);
  });

  it("returns subscriptions due within lookahead window", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([makeSub()]);
    const result = await getSubscriptionsDueForRenewal(3);
    expect(result.totalCount).toBe(1);
    expect(result.subscriptionsDue[0].subscriptionId).toBe("sub-001");
  });

  it("includes correct daysUntilRenewal", async () => {
    const twodays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([
      makeSub({ currentPeriodEnd: twodays }),
    ]);
    const result = await getSubscriptionsDueForRenewal();
    const days = result.subscriptionsDue[0].daysUntilRenewal;
    expect(days).toBeGreaterThanOrEqual(1);
    expect(days).toBeLessThanOrEqual(2);
  });

  it("sets daysUntilRenewal to 0 for already-expired subscriptions", async () => {
    const expired = new Date(Date.now() - 60_000);
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([
      makeSub({ currentPeriodEnd: expired }),
    ]);
    const result = await getSubscriptionsDueForRenewal();
    expect(result.subscriptionsDue[0].daysUntilRenewal).toBe(0);
  });

  it("includes processedAt timestamp", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([]);
    const result = await getSubscriptionsDueForRenewal();
    expect(result.processedAt).toBeInstanceOf(Date);
  });

  it("includes correct lookaheadDays in result", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([]);
    const result = await getSubscriptionsDueForRenewal(7);
    expect(result.lookaheadDays).toBe(7);
  });

  it("handles multiple subscriptions across tenants", async () => {
    mockPrisma.tenantSubscription.findMany.mockResolvedValue([
      makeSub({ id: "sub-001", tenantId: "t1" }),
      makeSub({ id: "sub-002", tenantId: "t2" }),
    ]);
    const result = await getSubscriptionsDueForRenewal();
    expect(result.totalCount).toBe(2);
    expect(result.subscriptionsDue.map((s) => s.subscriptionId)).toContain("sub-002");
  });
});

// ─── markSubscriptionPastDue ──────────────────────────────────────────────────

describe("markSubscriptionPastDue", () => {
  it("returns false when subscription not found", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue(null);
    const result = await markSubscriptionPastDue("sub-missing");
    expect(result).toBe(false);
  });

  it("returns false when subscription is not ACTIVE", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      status: "PAST_DUE",
      tenantId: "tenant-001",
    });
    const result = await markSubscriptionPastDue("sub-001");
    expect(result).toBe(false);
  });

  it("returns true and calls transaction for ACTIVE subscription", async () => {
    mockPrisma.tenantSubscription.findUnique.mockResolvedValue({
      status: "ACTIVE",
      tenantId: "tenant-001",
    });
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
    const result = await markSubscriptionPastDue("sub-001");
    expect(result).toBe(true);
    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });
});
