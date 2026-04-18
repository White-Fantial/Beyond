import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    marketplaceRecipe: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    marketplaceRecipeReview: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  submitRecipeForReview,
  reviewRecipe,
  publishRecipe,
  getRecipeReviews,
} from "@/services/marketplace/recipe-moderation.service";

const mockPrisma = prisma as unknown as {
  marketplaceRecipe: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  marketplaceRecipeReview: {
    findMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const PROVIDER_ID = "user-provider-1";
const MODERATOR_ID = "user-mod-1";

const mockDraftRecipe = {
  id: "recipe-1",
  type: "PREMIUM",
  status: "DRAFT",
  providerId: PROVIDER_ID,
  publishedAt: null,
};

const mockReviewRow = {
  id: "review-1",
  recipeId: "recipe-1",
  reviewerId: MODERATOR_ID,
  action: "APPROVED",
  notes: "좋은 레시피입니다",
  createdAt: new Date("2026-01-02"),
  reviewer: { name: "모더레이터" },
};

beforeEach(() => {
  vi.clearAllMocks();
  // Default $transaction implementation: run all callbacks and return their results
  mockPrisma.$transaction.mockImplementation(
    async (ops: unknown[]) => Promise.all(ops)
  );
});

// ─── submitRecipeForReview ────────────────────────────────────────────────────

describe("submitRecipeForReview", () => {
  it("transitions DRAFT recipe to PENDING_REVIEW", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockDraftRecipe);
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockDraftRecipe,
      status: "PENDING_REVIEW",
    });
    mockPrisma.marketplaceRecipeReview.create.mockResolvedValue(mockReviewRow);

    await submitRecipeForReview("recipe-1", PROVIDER_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("throws when recipe is not in an editable state", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "PENDING_REVIEW",
    });

    await expect(
      submitRecipeForReview("recipe-1", PROVIDER_ID)
    ).rejects.toThrow("Recipe cannot be submitted from status 'PENDING_REVIEW'");
  });

  it("throws when recipe is BASIC", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      type: "BASIC",
    });

    await expect(
      submitRecipeForReview("recipe-1", PROVIDER_ID)
    ).rejects.toThrow("Only PREMIUM recipes require moderation submission");
  });

  it("throws when submitter is not the provider", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(mockDraftRecipe);

    await expect(
      submitRecipeForReview("recipe-1", "other-user")
    ).rejects.toThrow("Only the recipe provider can submit for review");
  });

  it("uses REVISION_SUBMITTED action when re-submitting after CHANGE_REQUESTED", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "CHANGE_REQUESTED",
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({});
    mockPrisma.marketplaceRecipeReview.create.mockResolvedValue({});

    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      return Promise.all(ops);
    });

    await submitRecipeForReview("recipe-1", PROVIDER_ID);

    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.anything(),
        expect.anything(),
      ])
    );
  });
});

// ─── reviewRecipe ─────────────────────────────────────────────────────────────

describe("reviewRecipe", () => {
  it("approves a pending recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "PENDING_REVIEW",
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockDraftRecipe,
      status: "APPROVED",
    });
    mockPrisma.marketplaceRecipeReview.create.mockResolvedValue(mockReviewRow);

    mockPrisma.$transaction.mockImplementation(
      async (ops: unknown[]) => Promise.all(ops)
    );

    const review = await reviewRecipe("recipe-1", MODERATOR_ID, {
      action: "APPROVED",
      notes: "좋은 레시피입니다",
    });

    expect(review.action).toBe("APPROVED");
    expect(review.reviewerName).toBe("모더레이터");
  });

  it("rejects a pending recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "PENDING_REVIEW",
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockDraftRecipe,
      status: "REJECTED",
    });
    mockPrisma.marketplaceRecipeReview.create.mockResolvedValue({
      ...mockReviewRow,
      action: "REJECTED",
    });

    mockPrisma.$transaction.mockImplementation(
      async (ops: unknown[]) => Promise.all(ops)
    );

    const review = await reviewRecipe("recipe-1", MODERATOR_ID, {
      action: "REJECTED",
      notes: "품질 기준 미달",
    });

    expect(review.action).toBe("REJECTED");
  });

  it("throws when recipe is not in a reviewable state", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "DRAFT",
    });

    await expect(
      reviewRecipe("recipe-1", MODERATOR_ID, { action: "APPROVED" })
    ).rejects.toThrow(/Cannot perform review action/);
  });

  it("throws when recipe not found", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue(null);

    await expect(
      reviewRecipe("nonexistent", MODERATOR_ID, { action: "APPROVED" })
    ).rejects.toThrow("MarketplaceRecipe nonexistent not found");
  });
});

// ─── publishRecipe ────────────────────────────────────────────────────────────

describe("publishRecipe", () => {
  it("publishes an approved recipe", async () => {
    mockPrisma.marketplaceRecipe.findFirst.mockResolvedValue({
      ...mockDraftRecipe,
      status: "APPROVED",
      publishedAt: null,
    });
    mockPrisma.marketplaceRecipe.update.mockResolvedValue({
      ...mockDraftRecipe,
      status: "PUBLISHED",
    });
    mockPrisma.marketplaceRecipeReview.create.mockResolvedValue({
      ...mockReviewRow,
      action: "PUBLISHED",
    });

    mockPrisma.$transaction.mockImplementation(
      async (ops: unknown[]) => Promise.all(ops)
    );

    const review = await publishRecipe("recipe-1", MODERATOR_ID);
    expect(review.action).toBe("PUBLISHED");
  });
});

// ─── getRecipeReviews ─────────────────────────────────────────────────────────

describe("getRecipeReviews", () => {
  it("returns review history for a recipe", async () => {
    mockPrisma.marketplaceRecipeReview.findMany.mockResolvedValue([
      mockReviewRow,
    ]);

    const reviews = await getRecipeReviews("recipe-1");

    expect(reviews).toHaveLength(1);
    expect(reviews[0].action).toBe("APPROVED");
    expect(reviews[0].reviewerName).toBe("모더레이터");
    expect(typeof reviews[0].createdAt).toBe("string");
  });

  it("returns empty array when no reviews", async () => {
    mockPrisma.marketplaceRecipeReview.findMany.mockResolvedValue([]);

    const reviews = await getRecipeReviews("recipe-1");
    expect(reviews).toHaveLength(0);
  });
});
