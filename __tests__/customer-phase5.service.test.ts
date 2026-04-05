import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    loyaltyAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loyaltyTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
    },
    referralCode: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    pushPreference: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    savedPaymentMethod: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/adapters/billing/stripe.adapter", () => ({
  stripeBillingAdapter: {
    detachPaymentMethod: vi.fn().mockResolvedValue(undefined),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getReferralStats,
  getUserPushPreferences,
  updatePushPreferences,
} from "@/services/customer.service";

const mockPrisma = prisma as unknown as {
  loyaltyAccount: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  loyaltyTransaction: { findMany: ReturnType<typeof vi.fn>; count: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  referralCode: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> };
  pushPreference: { findUnique: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
};

const USER_ID = "user-1";

const mockAccount = {
  id: "acc-1",
  userId: USER_ID,
  points: 500,
  tier: "SILVER",
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

const mockReferralCode = {
  id: "ref-1",
  userId: USER_ID,
  accountId: "acc-1",
  code: "FRIEND8",
  usedCount: 3,
  rewardPoints: 100,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

const mockTx = {
  id: "tx-1",
  accountId: "acc-1",
  orderId: null,
  type: "ADJUSTMENT",
  pointsDelta: 100,
  description: "Referral reward for FRIEND8",
  createdAt: new Date("2026-01-10"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getReferralStats ─────────────────────────────────────────────────────────

describe("getReferralStats", () => {
  function setupLoyalty() {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(mockAccount);
    mockPrisma.referralCode.findFirst.mockResolvedValue(mockReferralCode);
  }

  it("returns stats for a user with referral history", async () => {
    setupLoyalty();
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([mockTx]);

    const result = await getReferralStats(USER_ID);

    expect(result.code.code).toBe("FRIEND8");
    expect(result.totalReferrals).toBe(3);
    expect(result.pointsEarned).toBe(100);
    expect(result.referralHistory).toHaveLength(1);
    expect(result.referralHistory[0].pointsDelta).toBe(100);
  });

  it("returns zero pointsEarned when no referral transactions", async () => {
    setupLoyalty();
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);

    const result = await getReferralStats(USER_ID);

    expect(result.pointsEarned).toBe(0);
    expect(result.referralHistory).toHaveLength(0);
  });

  it("ignores negative pointsDelta when summing pointsEarned", async () => {
    setupLoyalty();
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([
      { ...mockTx, pointsDelta: 100 },
      { ...mockTx, id: "tx-2", pointsDelta: -50 },
    ]);

    const result = await getReferralStats(USER_ID);
    expect(result.pointsEarned).toBe(100);
  });

  it("creates referral code if user has none", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(mockAccount);
    // First call (findFirst in getReferralCode) returns null → code is created
    mockPrisma.referralCode.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(null);
    mockPrisma.referralCode.findUnique.mockResolvedValue(null);
    mockPrisma.referralCode.create.mockResolvedValue(mockReferralCode);
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);

    const result = await getReferralStats(USER_ID);
    expect(result.code.code).toBe("FRIEND8");
  });

  it("sums multiple positive transactions correctly", async () => {
    setupLoyalty();
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([
      { ...mockTx, pointsDelta: 100 },
      { ...mockTx, id: "tx-2", pointsDelta: 100 },
      { ...mockTx, id: "tx-3", pointsDelta: 100 },
    ]);

    const result = await getReferralStats(USER_ID);
    expect(result.pointsEarned).toBe(300);
    expect(result.referralHistory).toHaveLength(3);
  });

  it("referralHistory entries have ISO createdAt string", async () => {
    setupLoyalty();
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([mockTx]);

    const result = await getReferralStats(USER_ID);
    expect(result.referralHistory[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── getUserPushPreferences ───────────────────────────────────────────────────

describe("getUserPushPreferences", () => {
  it("returns defaults when no preference record exists", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue(null);

    const prefs = await getUserPushPreferences(USER_ID);

    expect(prefs).toEqual({ orders: true, promotions: true, loyalty: true });
  });

  it("returns stored preferences", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue({
      id: "pref-1",
      userId: USER_ID,
      orders: true,
      promotions: false,
      loyalty: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const prefs = await getUserPushPreferences(USER_ID);
    expect(prefs.orders).toBe(true);
    expect(prefs.promotions).toBe(false);
    expect(prefs.loyalty).toBe(true);
  });

  it("returns all-false preferences when all are disabled", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue({
      id: "pref-1",
      userId: USER_ID,
      orders: false,
      promotions: false,
      loyalty: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const prefs = await getUserPushPreferences(USER_ID);
    expect(prefs).toEqual({ orders: false, promotions: false, loyalty: false });
  });

  it("queries by userId", async () => {
    mockPrisma.pushPreference.findUnique.mockResolvedValue(null);
    await getUserPushPreferences(USER_ID);
    expect(mockPrisma.pushPreference.findUnique).toHaveBeenCalledWith({
      where: { userId: USER_ID },
    });
  });
});

// ─── updatePushPreferences ────────────────────────────────────────────────────

describe("updatePushPreferences", () => {
  const upsertResult = {
    id: "pref-1",
    userId: USER_ID,
    orders: true,
    promotions: false,
    loyalty: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("upserts and returns updated preferences", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue(upsertResult);

    const result = await updatePushPreferences(USER_ID, { promotions: false });

    expect(result.promotions).toBe(false);
    expect(result.orders).toBe(true);
  });

  it("calls upsert with correct data for partial update", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue(upsertResult);

    await updatePushPreferences(USER_ID, { loyalty: false });

    const call = mockPrisma.pushPreference.upsert.mock.calls[0][0];
    expect(call.where).toEqual({ userId: USER_ID });
    expect(call.update).toEqual({ loyalty: false });
  });

  it("creates with defaults when no existing record", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue({
      ...upsertResult,
      orders: true,
      promotions: true,
      loyalty: true,
    });

    const result = await updatePushPreferences(USER_ID, {});
    expect(result).toEqual({ orders: true, promotions: true, loyalty: true });
  });

  it("can disable all preferences", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue({
      ...upsertResult,
      orders: false,
      promotions: false,
      loyalty: false,
    });

    const result = await updatePushPreferences(USER_ID, {
      orders: false,
      promotions: false,
      loyalty: false,
    });
    expect(result).toEqual({ orders: false, promotions: false, loyalty: false });
  });

  it("passes userId in upsert where clause", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue(upsertResult);

    await updatePushPreferences(USER_ID, { orders: false });

    expect(mockPrisma.pushPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
  });

  it("includes all three fields in create data", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue(upsertResult);

    await updatePushPreferences(USER_ID, { orders: false });

    const call = mockPrisma.pushPreference.upsert.mock.calls[0][0];
    expect(call.create).toHaveProperty("userId", USER_ID);
    expect(call.create).toHaveProperty("orders");
    expect(call.create).toHaveProperty("promotions");
    expect(call.create).toHaveProperty("loyalty");
  });

  it("only includes changed key in update data for single key update", async () => {
    mockPrisma.pushPreference.upsert.mockResolvedValue(upsertResult);

    await updatePushPreferences(USER_ID, { promotions: false });

    const call = mockPrisma.pushPreference.upsert.mock.calls[0][0];
    expect(Object.keys(call.update)).toEqual(["promotions"]);
  });
});
