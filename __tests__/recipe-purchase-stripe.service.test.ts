import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipe: {
      findFirst: vi.fn(),
    },
    marketplaceRecipePurchase: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock Stripe connect lib
vi.mock("@/lib/stripe/connect", () => ({
  createRecipePaymentIntent: vi.fn(),
  createProviderTransfer: vi.fn(),
  PLATFORM_FEE_PERCENT: 10,
}));

import { prisma } from "@/lib/prisma";
import { createRecipePaymentIntent, createProviderTransfer } from "@/lib/stripe/connect";
import {
  createPurchaseIntent,
  handlePurchaseWebhook,
} from "@/services/marketplace/recipe-purchase.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipe: { findFirst: ReturnType<typeof vi.fn> };
  marketplaceRecipePurchase: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: { findUnique: ReturnType<typeof vi.fn> };
};

const mockCreateIntent = createRecipePaymentIntent as ReturnType<typeof vi.fn>;
const mockCreateTransfer = createProviderTransfer as ReturnType<typeof vi.fn>;

const RECIPE_ID = "recipe-1";
const BUYER_ID = "buyer-1";
const PROVIDER_ID = "provider-1";
const PI_ID = "pi_test_123";

const mockRecipe = {
  id: RECIPE_ID,
  type: "PREMIUM",
  status: "PUBLISHED",
  salePrice: 10000,
  currency: "KRW",
  providerId: PROVIDER_ID,
  title: "테스트 레시피",
};

const mockProvider = {
  stripeConnectAccountId: "acct_test",
  stripeConnectPayoutsEnabled: true,
};

const mockPurchaseRow = {
  id: "purchase-1",
  recipeId: RECIPE_ID,
  buyerUserId: BUYER_ID,
  tenantId: null,
  pricePaid: 10000,
  currency: "KRW",
  paymentRef: null,
  stripePaymentIntentId: PI_ID,
  platformFeeAmount: 1000,
  providerPayoutAmount: 9000,
  payoutStatus: "PENDING",
  purchasedAt: new Date(),
  refundedAt: null,
  transferredAt: null,
  stripeTransferId: null,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createPurchaseIntent ─────────────────────────────────────────────────────

describe("createPurchaseIntent", () => {
  it("creates a PaymentIntent and returns clientSecret", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipe);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
    mockCreateIntent.mockResolvedValue({
      paymentIntentId: PI_ID,
      clientSecret: "cs_test_abc",
    });

    const result = await createPurchaseIntent(RECIPE_ID, BUYER_ID);

    expect(result.clientSecret).toBe("cs_test_abc");
    expect(result.paymentIntentId).toBe(PI_ID);
    expect(result.amount).toBe(10000);
    expect(mockCreateIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 10000,
        currency: "KRW",
        providerAccountId: "acct_test",
        recipeId: RECIPE_ID,
        buyerUserId: BUYER_ID,
      })
    );
  });

  it("throws for BASIC recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockRecipe,
      type: "BASIC",
    });

    await expect(createPurchaseIntent(RECIPE_ID, BUYER_ID)).rejects.toThrow(
      "BASIC recipes are free"
    );
  });

  it("throws for unpublished recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockRecipe,
      status: "DRAFT",
    });

    await expect(createPurchaseIntent(RECIPE_ID, BUYER_ID)).rejects.toThrow(
      "not available for purchase"
    );
  });

  it("throws when recipe already purchased", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipe);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(
      mockPurchaseRow
    );

    await expect(createPurchaseIntent(RECIPE_ID, BUYER_ID)).rejects.toThrow(
      "already purchased"
    );
  });

  it("throws when provider has no Stripe account", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipe);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
      stripeConnectPayoutsEnabled: false,
    });

    await expect(createPurchaseIntent(RECIPE_ID, BUYER_ID)).rejects.toThrow(
      "not connected a Stripe account"
    );
  });

  it("throws when provider payouts not enabled", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockRecipe);
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_test",
      stripeConnectPayoutsEnabled: false,
    });

    await expect(createPurchaseIntent(RECIPE_ID, BUYER_ID)).rejects.toThrow(
      "not ready to receive payouts"
    );
  });
});

// ─── handlePurchaseWebhook ────────────────────────────────────────────────────

describe("handlePurchaseWebhook", () => {
  const makeEvent = (overrides?: Partial<{ recipeId: string; buyerUserId: string }>) => ({
    type: "payment_intent.succeeded" as const,
    data: {
      object: {
        id: PI_ID,
        amount: 10000,
        currency: "krw",
        metadata: {
          recipeId: overrides?.recipeId ?? RECIPE_ID,
          buyerUserId: overrides?.buyerUserId ?? BUYER_ID,
        },
      },
    },
  });

  it("creates a purchase record and transfers to provider", async () => {
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      salePrice: 10000,
      currency: "KRW",
      providerId: PROVIDER_ID,
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
    mockPrisma.marketplaceRecipePurchase.create.mockResolvedValue({
      ...mockPurchaseRow,
    });
    mockCreateTransfer.mockResolvedValue({ transferId: "tr_test" });
    mockPrisma.marketplaceRecipePurchase.update.mockResolvedValue({});

    await handlePurchaseWebhook(makeEvent());

    expect(mockPrisma.marketplaceRecipePurchase.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          recipeId: RECIPE_ID,
          buyerUserId: BUYER_ID,
          pricePaid: 10000,
          stripePaymentIntentId: PI_ID,
          platformFeeAmount: 1000,
          providerPayoutAmount: 9000,
          payoutStatus: "PENDING",
        }),
      })
    );
    expect(mockCreateTransfer).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 9000,
        destination: "acct_test",
      })
    );
    expect(mockPrisma.marketplaceRecipePurchase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          stripeTransferId: "tr_test",
          payoutStatus: "TRANSFERRED",
          transferredAt: expect.any(Date),
        }),
      })
    );
  });

  it("is idempotent — skips if payment intent already recorded", async () => {
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(
      mockPurchaseRow
    );

    await handlePurchaseWebhook(makeEvent());

    expect(mockPrisma.marketplaceRecipePurchase.create).not.toHaveBeenCalled();
  });

  it("records FAILED payout status when transfer throws", async () => {
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      salePrice: 10000,
      currency: "KRW",
      providerId: PROVIDER_ID,
    });
    mockPrisma.user.findUnique.mockResolvedValue(mockProvider);
    mockPrisma.marketplaceRecipePurchase.create.mockResolvedValue(mockPurchaseRow);
    mockCreateTransfer.mockRejectedValue(new Error("Transfer failed"));
    mockPrisma.marketplaceRecipePurchase.update.mockResolvedValue({});

    await handlePurchaseWebhook(makeEvent());

    expect(mockPrisma.marketplaceRecipePurchase.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ payoutStatus: "FAILED" }),
      })
    );
  });

  it("keeps PENDING status when provider has no Stripe account", async () => {
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      salePrice: 10000,
      currency: "KRW",
      providerId: PROVIDER_ID,
    });
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
      stripeConnectPayoutsEnabled: false,
    });
    mockPrisma.marketplaceRecipePurchase.create.mockResolvedValue(mockPurchaseRow);

    await handlePurchaseWebhook(makeEvent());

    expect(mockCreateTransfer).not.toHaveBeenCalled();
    // No update to FAILED or TRANSFERRED — stays PENDING
    expect(mockPrisma.marketplaceRecipePurchase.update).not.toHaveBeenCalled();
  });

  it("ignores non-payment_intent.succeeded events", async () => {
    await handlePurchaseWebhook({
      type: "payment_intent.created",
      data: {
        object: {
          id: PI_ID,
          amount: 10000,
          currency: "krw",
          metadata: { recipeId: RECIPE_ID, buyerUserId: BUYER_ID },
        },
      },
    });

    expect(mockPrisma.marketplaceRecipePurchase.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.marketplaceRecipePurchase.create).not.toHaveBeenCalled();
  });

  it("throws when metadata is missing", async () => {
    mockPrisma.marketplaceRecipePurchase.findFirst.mockResolvedValue(null);

    await expect(
      handlePurchaseWebhook({
        type: "payment_intent.succeeded",
        data: {
          object: {
            id: PI_ID,
            amount: 10000,
            currency: "krw",
            metadata: { recipeId: "", buyerUserId: "" },
          },
        },
      })
    ).rejects.toThrow("missing recipeId or buyerUserId");
  });
});
