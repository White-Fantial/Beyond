import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipePurchase: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listEarnings,
  getEarningsSummary,
} from "@/services/provider/provider-earnings.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipePurchase: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const PROVIDER_ID = "provider-1";

const mockPurchaseRow = {
  id: "purchase-1",
  recipeId: "recipe-1",
  buyerUserId: "buyer-1",
  pricePaid: 10000,
  currency: "USD",
  platformFeeAmount: 1000,
  providerPayoutAmount: 9000,
  payoutStatus: "TRANSFERRED",
  purchasedAt: new Date("2026-01-01"),
  transferredAt: new Date("2026-01-02"),
  stripeTransferId: "tr_test123",
  recipe: { title: "기본 된장찌개" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listEarnings ─────────────────────────────────────────────────────────────

describe("listEarnings", () => {
  it("returns paginated earnings with summary", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([
      mockPurchaseRow,
    ]);
    mockPrisma.marketplaceRecipePurchase.count.mockResolvedValue(1);

    const result = await listEarnings(PROVIDER_ID);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].recipeTitle).toBe("기본 된장찌개");
    expect(result.items[0].providerPayoutAmount).toBe(9000);
    expect(result.items[0].payoutStatus).toBe("TRANSFERRED");
    expect(result.summary.totalSales).toBe(1);
    expect(result.summary.totalRevenue).toBe(10000);
    expect(result.summary.totalPayoutAmount).toBe(9000);
    expect(result.summary.pendingPayoutAmount).toBe(0);
  });

  it("counts pending amounts correctly", async () => {
    const pendingRow = {
      ...mockPurchaseRow,
      id: "purchase-2",
      payoutStatus: "PENDING",
      stripeTransferId: null,
      transferredAt: null,
    };
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([
      mockPurchaseRow,
      pendingRow,
    ]);
    mockPrisma.marketplaceRecipePurchase.count.mockResolvedValue(2);

    const result = await listEarnings(PROVIDER_ID);

    expect(result.summary.totalSales).toBe(2);
    expect(result.summary.totalRevenue).toBe(20000);
    expect(result.summary.pendingPayoutAmount).toBe(9000);
  });

  it("filters by payoutStatus", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([]);
    mockPrisma.marketplaceRecipePurchase.count.mockResolvedValue(0);

    await listEarnings(PROVIDER_ID, { payoutStatus: "PENDING" });

    expect(mockPrisma.marketplaceRecipePurchase.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ payoutStatus: "PENDING" }),
      })
    );
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([
      mockPurchaseRow,
    ]);
    mockPrisma.marketplaceRecipePurchase.count.mockResolvedValue(1);

    const result = await listEarnings(PROVIDER_ID);

    expect(typeof result.items[0].purchasedAt).toBe("string");
    expect(result.items[0].purchasedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── getEarningsSummary ───────────────────────────────────────────────────────

describe("getEarningsSummary", () => {
  it("returns correct totals across all purchases", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([
      {
        pricePaid: 10000,
        currency: "USD",
        platformFeeAmount: 1000,
        providerPayoutAmount: 9000,
        payoutStatus: "TRANSFERRED",
      },
      {
        pricePaid: 5000,
        currency: "USD",
        platformFeeAmount: 500,
        providerPayoutAmount: 4500,
        payoutStatus: "PENDING",
      },
    ]);

    const summary = await getEarningsSummary(PROVIDER_ID);

    expect(summary.totalSales).toBe(2);
    expect(summary.totalRevenue).toBe(15000);
    expect(summary.totalPlatformFees).toBe(1500);
    expect(summary.totalPayoutAmount).toBe(13500);
    expect(summary.pendingPayoutAmount).toBe(4500);
  });

  it("returns zero summary when no purchases", async () => {
    mockPrisma.marketplaceRecipePurchase.findMany.mockResolvedValue([]);

    const summary = await getEarningsSummary(PROVIDER_ID);

    expect(summary.totalSales).toBe(0);
    expect(summary.totalRevenue).toBe(0);
    expect(summary.pendingPayoutAmount).toBe(0);
  });
});
