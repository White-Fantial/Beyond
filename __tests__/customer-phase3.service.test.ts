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
  getLoyaltyAccount,
  getLoyaltyTransactions,
  redeemLoyaltyPoints,
  getReferralCode,
  listSavedPaymentMethods,
  addSavedPaymentMethod,
  removeSavedPaymentMethod,
  setDefaultPaymentMethod,
  LoyaltyAccountNotFoundError,
  LoyaltyInsufficientPointsError,
  SavedPaymentMethodNotFoundError,
} from "@/services/customer.service";

const mockPrisma = prisma as unknown as {
  loyaltyAccount: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  loyaltyTransaction: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  referralCode: {
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  savedPaymentMethod: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const NOW = new Date("2026-01-01T00:00:00Z");
const USER_ID = "user-001";
const ACCOUNT_ID = "acct-001";
const METHOD_ID = "pm-001";

function baseAccount(overrides = {}) {
  return {
    id: ACCOUNT_ID,
    userId: USER_ID,
    points: 750,
    tier: "SILVER",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseMethod(overrides = {}) {
  return {
    id: METHOD_ID,
    userId: USER_ID,
    provider: "STRIPE",
    last4: "4242",
    brand: "visa",
    expiryMonth: 12,
    expiryYear: 2027,
    isDefault: true,
    providerMethodId: "pm_stripe_001",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseTransaction(overrides = {}) {
  return {
    id: "tx-001",
    accountId: ACCOUNT_ID,
    orderId: null,
    type: "EARN",
    pointsDelta: 100,
    description: "Test earn",
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getLoyaltyAccount ────────────────────────────────────────────────────────

describe("getLoyaltyAccount", () => {
  it("returns existing account summary", async () => {
    const account = baseAccount();
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyAccount.update.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst.mockResolvedValue(null);

    const result = await getLoyaltyAccount(USER_ID);

    expect(result.account.userId).toBe(USER_ID);
    expect(result.account.points).toBe(750);
    expect(result.account.tier).toBe("SILVER");
    expect(result.referralCode).toBeNull();
  });

  it("creates account if it doesn't exist", async () => {
    const newAccount = baseAccount({ points: 0, tier: "BRONZE" });
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);
    mockPrisma.loyaltyAccount.create.mockResolvedValue(newAccount);
    mockPrisma.referralCode.findFirst.mockResolvedValue(null);

    const result = await getLoyaltyAccount(USER_ID);

    expect(mockPrisma.loyaltyAccount.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: USER_ID }) })
    );
    expect(result.account.points).toBe(0);
  });

  it("includes referral code when present", async () => {
    const account = baseAccount();
    const referral = { id: "ref-1", userId: USER_ID, accountId: ACCOUNT_ID, code: "BEYOND100", usedCount: 2, rewardPoints: 100, createdAt: NOW, updatedAt: NOW };
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyAccount.update.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst.mockResolvedValue(referral);

    const result = await getLoyaltyAccount(USER_ID);
    expect(result.referralCode).toBe("BEYOND100");
  });

  it("returns nextTier and pointsToNextTier for SILVER account", async () => {
    const account = baseAccount({ points: 750, tier: "SILVER" });
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyAccount.update.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst.mockResolvedValue(null);

    const result = await getLoyaltyAccount(USER_ID);
    expect(result.nextTier).not.toBeNull();
    expect(result.nextTier?.tier).toBe("GOLD");
    expect(result.pointsToNextTier).toBe(750); // 1500 - 750
  });

  it("returns null nextTier for PLATINUM account", async () => {
    const account = baseAccount({ points: 6000, tier: "PLATINUM" });
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst.mockResolvedValue(null);

    const result = await getLoyaltyAccount(USER_ID);
    expect(result.nextTier).toBeNull();
    expect(result.pointsToNextTier).toBeNull();
  });
});

// ─── getLoyaltyTransactions ───────────────────────────────────────────────────

describe("getLoyaltyTransactions", () => {
  it("returns transactions for existing account", async () => {
    const account = baseAccount();
    const tx = baseTransaction();
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([tx]);
    mockPrisma.loyaltyTransaction.count.mockResolvedValue(1);

    const result = await getLoyaltyTransactions(USER_ID, { page: 1, pageSize: 20 });

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].type).toBe("EARN");
  });

  it("returns empty result when account doesn't exist", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);

    const result = await getLoyaltyTransactions(USER_ID);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("applies type filter", async () => {
    const account = baseAccount();
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyTransaction.findMany.mockResolvedValue([]);
    mockPrisma.loyaltyTransaction.count.mockResolvedValue(0);

    await getLoyaltyTransactions(USER_ID, { type: "REDEEM" });

    const findManyCall = mockPrisma.loyaltyTransaction.findMany.mock.calls[0][0];
    expect(findManyCall.where.type).toBe("REDEEM");
  });
});

// ─── redeemLoyaltyPoints ─────────────────────────────────────────────────────

describe("redeemLoyaltyPoints", () => {
  it("deducts points and creates REDEEM transaction", async () => {
    const account = baseAccount({ points: 750 });
    const updatedAccount = baseAccount({ points: 650 });
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    mockPrisma.loyaltyAccount.update.mockResolvedValue(updatedAccount);
    mockPrisma.loyaltyTransaction.create.mockResolvedValue(baseTransaction({ type: "REDEEM" }));

    const result = await redeemLoyaltyPoints(USER_ID, "order-123", 100);
    expect(result.points).toBe(650);
  });

  it("throws LoyaltyAccountNotFoundError when account missing", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);
    await expect(redeemLoyaltyPoints(USER_ID, "order-123", 100)).rejects.toThrow(
      LoyaltyAccountNotFoundError
    );
  });

  it("throws LoyaltyInsufficientPointsError when not enough points", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(baseAccount({ points: 50 }));
    await expect(redeemLoyaltyPoints(USER_ID, "order-123", 100)).rejects.toThrow(
      LoyaltyInsufficientPointsError
    );
  });

  it("throws LoyaltyInsufficientPointsError for zero or negative points", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(baseAccount());
    await expect(redeemLoyaltyPoints(USER_ID, "order-123", 0)).rejects.toThrow(
      LoyaltyInsufficientPointsError
    );
  });
});

// ─── getReferralCode ──────────────────────────────────────────────────────────

describe("getReferralCode", () => {
  it("returns existing referral code", async () => {
    const account = baseAccount();
    const referral = { id: "ref-1", userId: USER_ID, accountId: ACCOUNT_ID, code: "BEYOND100", usedCount: 0, rewardPoints: 100, createdAt: NOW, updatedAt: NOW };
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyAccount.update.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst
      .mockResolvedValueOnce(null) // in getLoyaltyAccount call
      .mockResolvedValueOnce(referral); // in getReferralCode

    const result = await getReferralCode(USER_ID);
    expect(result.code).toBe("BEYOND100");
  });

  it("creates new referral code if none exists", async () => {
    const account = baseAccount();
    const newReferral = { id: "ref-2", userId: USER_ID, accountId: ACCOUNT_ID, code: "NEWCODE1", usedCount: 0, rewardPoints: 100, createdAt: NOW, updatedAt: NOW };
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(account);
    mockPrisma.loyaltyAccount.update.mockResolvedValue(account);
    mockPrisma.referralCode.findFirst.mockResolvedValue(null);
    mockPrisma.referralCode.findUnique.mockResolvedValue(null); // no conflict
    mockPrisma.referralCode.create.mockResolvedValue(newReferral);

    const result = await getReferralCode(USER_ID);
    expect(mockPrisma.referralCode.create).toHaveBeenCalled();
    expect(result.userId).toBe(USER_ID);
  });
});

// ─── listSavedPaymentMethods ──────────────────────────────────────────────────

describe("listSavedPaymentMethods", () => {
  it("returns payment methods ordered by default first", async () => {
    const methods = [baseMethod(), baseMethod({ id: "pm-002", isDefault: false })];
    mockPrisma.savedPaymentMethod.findMany.mockResolvedValue(methods);

    const result = await listSavedPaymentMethods(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].isDefault).toBe(true);
  });

  it("returns empty array when no methods", async () => {
    mockPrisma.savedPaymentMethod.findMany.mockResolvedValue([]);
    const result = await listSavedPaymentMethods(USER_ID);
    expect(result).toHaveLength(0);
  });
});

// ─── addSavedPaymentMethod ────────────────────────────────────────────────────

describe("addSavedPaymentMethod", () => {
  it("creates a new payment method, sets isDefault=true when first", async () => {
    mockPrisma.savedPaymentMethod.count.mockResolvedValue(0);
    const method = baseMethod();
    mockPrisma.savedPaymentMethod.create.mockResolvedValue(method);

    const result = await addSavedPaymentMethod(USER_ID, {
      providerMethodId: "pm_stripe_001",
      last4: "4242",
      brand: "visa",
      expiryMonth: 12,
      expiryYear: 2027,
    });

    expect(result.last4).toBe("4242");
    const createCall = mockPrisma.savedPaymentMethod.create.mock.calls[0][0];
    expect(createCall.data.isDefault).toBe(true);
  });

  it("sets isDefault=false when other methods exist", async () => {
    mockPrisma.savedPaymentMethod.count.mockResolvedValue(2);
    mockPrisma.savedPaymentMethod.create.mockResolvedValue(baseMethod({ isDefault: false }));

    await addSavedPaymentMethod(USER_ID, {
      providerMethodId: "pm_stripe_002",
      last4: "1234",
      brand: "mastercard",
      expiryMonth: 6,
      expiryYear: 2026,
    });

    const createCall = mockPrisma.savedPaymentMethod.create.mock.calls[0][0];
    expect(createCall.data.isDefault).toBe(false);
  });
});

// ─── removeSavedPaymentMethod ─────────────────────────────────────────────────

describe("removeSavedPaymentMethod", () => {
  it("removes method and promotes next if default", async () => {
    const method = baseMethod({ isDefault: true });
    const nextMethod = baseMethod({ id: "pm-002", isDefault: false });
    mockPrisma.savedPaymentMethod.findUnique.mockResolvedValue(method);
    mockPrisma.savedPaymentMethod.delete.mockResolvedValue(method);
    mockPrisma.savedPaymentMethod.findFirst.mockResolvedValue(nextMethod);
    mockPrisma.savedPaymentMethod.update.mockResolvedValue({ ...nextMethod, isDefault: true });

    await removeSavedPaymentMethod(USER_ID, METHOD_ID);

    expect(mockPrisma.savedPaymentMethod.delete).toHaveBeenCalledWith({ where: { id: METHOD_ID } });
    expect(mockPrisma.savedPaymentMethod.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { isDefault: true } })
    );
  });

  it("throws SavedPaymentMethodNotFoundError when not found", async () => {
    mockPrisma.savedPaymentMethod.findUnique.mockResolvedValue(null);
    await expect(removeSavedPaymentMethod(USER_ID, METHOD_ID)).rejects.toThrow(
      SavedPaymentMethodNotFoundError
    );
  });

  it("throws SavedPaymentMethodNotFoundError when method belongs to another user", async () => {
    mockPrisma.savedPaymentMethod.findUnique.mockResolvedValue(baseMethod({ userId: "other-user" }));
    await expect(removeSavedPaymentMethod(USER_ID, METHOD_ID)).rejects.toThrow(
      SavedPaymentMethodNotFoundError
    );
  });
});

// ─── setDefaultPaymentMethod ──────────────────────────────────────────────────

describe("setDefaultPaymentMethod", () => {
  it("sets method as default and clears others", async () => {
    const method = baseMethod({ isDefault: false });
    const updated = baseMethod({ isDefault: true });
    mockPrisma.savedPaymentMethod.findUnique.mockResolvedValue(method);
    mockPrisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));
    mockPrisma.savedPaymentMethod.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.savedPaymentMethod.update.mockResolvedValue(updated);
    mockPrisma.savedPaymentMethod.findUniqueOrThrow.mockResolvedValue(updated);

    const result = await setDefaultPaymentMethod(USER_ID, METHOD_ID);
    expect(result.isDefault).toBe(true);
  });

  it("throws SavedPaymentMethodNotFoundError when method not found", async () => {
    mockPrisma.savedPaymentMethod.findUnique.mockResolvedValue(null);
    await expect(setDefaultPaymentMethod(USER_ID, METHOD_ID)).rejects.toThrow(
      SavedPaymentMethodNotFoundError
    );
  });
});
