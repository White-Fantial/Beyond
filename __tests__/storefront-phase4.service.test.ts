import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    store: {
      findFirst: vi.fn(),
    },
    catalogProduct: {
      findMany: vi.fn(),
    },
    promoCode: {
      findFirst: vi.fn(),
    },
    loyaltyAccount: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    loyaltyTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// ─── Mock order service ───────────────────────────────────────────────────────

vi.mock("@/services/order.service", () => ({
  createCanonicalOrderFromInbound: vi.fn(),
}));

// ─── Mock owner-promotions service ───────────────────────────────────────────

vi.mock("@/services/owner/owner-promotions.service", () => ({
  applyPromoCode: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createCanonicalOrderFromInbound } from "@/services/order.service";
import { applyPromoCode } from "@/services/owner/owner-promotions.service";
import { validatePromoCode, placeGuestOrder } from "@/services/customer-menu.service";

const mockPrisma = prisma as unknown as {
  store: { findFirst: ReturnType<typeof vi.fn> };
  catalogProduct: { findMany: ReturnType<typeof vi.fn> };
  promoCode: { findFirst: ReturnType<typeof vi.fn> };
  loyaltyAccount: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  loyaltyTransaction: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockCreateOrder = createCanonicalOrderFromInbound as ReturnType<typeof vi.fn>;
const mockApplyPromoCode = applyPromoCode as ReturnType<typeof vi.fn>;

const TENANT = "tenant-001";
const STORE_ID = "store-001";
const USER_ID = "user-001";
const ORDER_ID = "order-001";
const NOW = new Date("2026-06-01T12:00:00Z");

function makePromoRow(overrides: Partial<{
  id: string;
  tenantId: string;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: object;
  minOrderAmount: object | null;
  maxUses: number | null;
  usedCount: number;
  status: string;
  startsAt: Date | null;
  expiresAt: Date | null;
}> = {}) {
  return {
    id: "promo-001",
    tenantId: TENANT,
    storeId: null,
    code: "SAVE10",
    description: null,
    discountType: "PERCENT",
    discountValue: { toString: () => "10.0000" },
    minOrderAmount: null,
    maxUses: null,
    usedCount: 0,
    status: "ACTIVE",
    startsAt: null,
    expiresAt: null,
    createdBy: null,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeOrderItems() {
  return [
    {
      productId: "prod-001",
      productName: "Burger",
      unitPriceAmount: 1200,
      quantity: 1,
      selectedModifiers: [],
      notes: undefined,
    },
  ];
}

function makePlaceOrderInput(overrides: object = {}) {
  return {
    storeId: STORE_ID,
    customerName: "Jane",
    customerPhone: "+64210000000",
    pickupTime: "2026-06-01T13:00:00Z",
    items: makeOrderItems(),
    currencyCode: "NZD",
    ...overrides,
  };
}

function setupStoreMock() {
  mockPrisma.store.findFirst.mockResolvedValue({
    id: STORE_ID,
    tenantId: TENANT,
    currency: "NZD",
  });
}

function setupProductMock() {
  mockPrisma.catalogProduct.findMany.mockResolvedValue([
    { id: "prod-001", name: "Burger", basePriceAmount: 1200, isSoldOut: false },
  ]);
}

function setupOrderMock() {
  mockCreateOrder.mockResolvedValue({
    order: { id: ORDER_ID, status: "RECEIVED" },
  });
}

// ─── validatePromoCode ────────────────────────────────────────────────────────

describe("validatePromoCode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns valid result for a PERCENT promo", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow());

    const result = await validatePromoCode(TENANT, "SAVE10", 2000);

    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(200); // 10% of 2000
    expect(result.discountType).toBe("PERCENT");
  });

  it("returns correct discount for FIXED_AMOUNT promo", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "FIXED_AMOUNT",
        discountValue: { toString: () => "5.0000" },
      })
    );

    const result = await validatePromoCode(TENANT, "FLAT5", 3000);

    expect(result.valid).toBe(true);
    expect(result.discountMinor).toBe(500); // $5.00 = 500 minor
  });

  it("caps FIXED_AMOUNT discount at order total", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "FIXED_AMOUNT",
        discountValue: { toString: () => "20.0000" },
      })
    );

    const result = await validatePromoCode(TENANT, "BIG20", 500);

    expect(result.discountMinor).toBe(500); // capped at order total
  });

  it("throws if promo code not found", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(null);

    await expect(validatePromoCode(TENANT, "NOPE", 1000)).rejects.toThrow("not valid");
  });

  it("throws if promo has expired", async () => {
    const pastDate = new Date(Date.now() - 86400000);
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow({ expiresAt: pastDate }));

    await expect(validatePromoCode(TENANT, "OLD", 1000)).rejects.toThrow("expired");
  });

  it("throws if promo not yet started", async () => {
    const futureDate = new Date(Date.now() + 86400000);
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow({ startsAt: futureDate }));

    await expect(validatePromoCode(TENANT, "SOON", 1000)).rejects.toThrow("not yet active");
  });

  it("throws if max uses reached", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({ maxUses: 10, usedCount: 10 })
    );

    await expect(validatePromoCode(TENANT, "FULL", 1000)).rejects.toThrow("usage limit");
  });

  it("throws if min order amount not met", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({ minOrderAmount: { toString: () => "10.0000" } })
    );

    await expect(validatePromoCode(TENANT, "MINORDER", 500)).rejects.toThrow(
      "Minimum order amount"
    );
  });

  it("normalises code to uppercase for lookup", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow());

    await validatePromoCode(TENANT, "save10", 2000);

    expect(mockPrisma.promoCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ code: "SAVE10" }),
      })
    );
  });

  it("scopes lookup to the given tenantId", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow());

    await validatePromoCode("other-tenant", "SAVE10", 2000);

    expect(mockPrisma.promoCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "other-tenant" }),
      })
    );
  });
});

// ─── placeGuestOrder with promoCode ──────────────────────────────────────────

describe("placeGuestOrder with promoCode", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupStoreMock();
    setupProductMock();
    setupOrderMock();
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
  });

  it("applies promo discount to order total", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "PERCENT",
        discountValue: { toString: () => "10.0000" },
      })
    );
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 120 });

    const result = await placeGuestOrder(makePlaceOrderInput({ promoCode: "SAVE10" }));

    // createCanonicalOrderFromInbound should be called with discounted total
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 1080 }) // 1200 - 120
    );
    expect(result.discountApplied).toBe(120);
  });

  it("records promo redemption via applyPromoCode with orderId", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow());
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 120 });

    await placeGuestOrder(makePlaceOrderInput({ promoCode: "SAVE10" }));

    expect(mockApplyPromoCode).toHaveBeenCalledWith(
      TENANT,
      "SAVE10",
      1200,
      undefined,
      ORDER_ID
    );
  });

  it("does not call applyPromoCode when no promoCode provided", async () => {
    await placeGuestOrder(makePlaceOrderInput());

    expect(mockApplyPromoCode).not.toHaveBeenCalled();
  });

  it("caps total at zero when discount exceeds total", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "FIXED_AMOUNT",
        discountValue: { toString: () => "20.0000" },
      })
    );
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 1200 });

    await placeGuestOrder(makePlaceOrderInput({ promoCode: "BIG20" }));

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 0 })
    );
  });
});

// ─── placeGuestOrder with redeemLoyaltyPoints ─────────────────────────────────

describe("placeGuestOrder with redeemLoyaltyPoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupStoreMock();
    setupProductMock();
    setupOrderMock();
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
  });

  it("redeems loyalty points and subtracts from total", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 300,
      tier: "BRONZE",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({ redeemLoyaltyPoints: true, userId: USER_ID })
    );

    // 300 points redeemed (capped at 1200 order amount), totalAmount = 1200 - 300 = 900
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 900 })
    );
    expect(result.loyaltyPointsRedeemed).toBe(300);
  });

  it("caps redeemed points at order total", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 5000,
      tier: "GOLD",
    });

    await placeGuestOrder(
      makePlaceOrderInput({ redeemLoyaltyPoints: true, userId: USER_ID })
    );

    // points capped at order total (1200), totalAmount = 0
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 0 })
    );
  });

  it("creates REDEEM loyalty transaction after order creation", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 200,
      tier: "BRONZE",
    });

    await placeGuestOrder(
      makePlaceOrderInput({ redeemLoyaltyPoints: true, userId: USER_ID })
    );

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({}), // loyaltyAccount.update decrement
        expect.objectContaining({}), // loyaltyTransaction.create REDEEM
      ])
    );
  });

  it("earns loyalty points based on final paid amount", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null); // earn lookup: no existing
    mockPrisma.loyaltyAccount.create.mockResolvedValue({
      id: "acct-new",
      userId: USER_ID,
      points: 0,
      tier: "BRONZE",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({ userId: USER_ID })
    );

    // finalAmount = 1200, earned = Math.floor(1200 / 100) = 12
    expect(result.loyaltyPointsEarned).toBe(12);
  });

  it("does not earn points when fully covered by loyalty redemption", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 5000,
      tier: "GOLD",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({ redeemLoyaltyPoints: true, userId: USER_ID })
    );

    // totalAmount = 0 after redemption, no points earned
    expect(result.loyaltyPointsEarned).toBeUndefined();
  });

  it("does not redeem if no loyalty account exists", async () => {
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null); // redeem: no account
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce(null); // earn: no account
    mockPrisma.loyaltyAccount.create.mockResolvedValue({
      id: "acct-new",
      userId: USER_ID,
      points: 0,
      tier: "BRONZE",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({ redeemLoyaltyPoints: true, userId: USER_ID })
    );

    expect(result.loyaltyPointsRedeemed).toBeUndefined();
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 1200 })
    );
  });
});

// ─── placeGuestOrder with both promo and loyalty ──────────────────────────────

describe("placeGuestOrder with both promoCode and redeemLoyaltyPoints", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    setupStoreMock();
    setupProductMock();
    setupOrderMock();
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);
  });

  it("applies promo first, then loyalty on remaining total", async () => {
    // 10% promo on 1200 = 120 discount → afterPromo = 1080
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "PERCENT",
        discountValue: { toString: () => "10.0000" },
      })
    );
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 120 });

    // 200 loyalty points → redeem 200 from 1080 → finalAmount = 880
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 200,
      tier: "BRONZE",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({
        promoCode: "SAVE10",
        redeemLoyaltyPoints: true,
        userId: USER_ID,
      })
    );

    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 880 })
    );
    expect(result.discountApplied).toBe(120);
    expect(result.loyaltyPointsRedeemed).toBe(200);
  });

  it("loyalty cap is applied against after-promo amount", async () => {
    // 50% promo on 1200 = 600 discount → afterPromo = 600
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "PERCENT",
        discountValue: { toString: () => "50.0000" },
      })
    );
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 600 });

    // 1000 points, but capped at 600 (afterPromo amount)
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 1000,
      tier: "SILVER",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({
        promoCode: "HALF",
        redeemLoyaltyPoints: true,
        userId: USER_ID,
      })
    );

    expect(result.loyaltyPointsRedeemed).toBe(600);
    expect(mockCreateOrder).toHaveBeenCalledWith(
      expect.objectContaining({ totalAmount: 0 })
    );
  });

  it("earns points based on final amount after both discounts", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(
      makePromoRow({
        discountType: "FIXED_AMOUNT",
        discountValue: { toString: () => "2.0000" },
      })
    );
    mockApplyPromoCode.mockResolvedValue({ discountMinor: 200 });

    // 100 points redeemed, afterPromo = 1000, finalAmount = 900
    // loyaltyAccountId is set from redemption, so no second findUnique for earn
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValueOnce({
      id: "acct-001",
      userId: USER_ID,
      points: 100,
      tier: "BRONZE",
    });

    const result = await placeGuestOrder(
      makePlaceOrderInput({
        promoCode: "FLAT2",
        redeemLoyaltyPoints: true,
        userId: USER_ID,
      })
    );

    // finalAmount = 1200 - 200 - 100 = 900 → earn Math.floor(900/100) = 9
    expect(result.loyaltyPointsEarned).toBe(9);
  });
});
