/**
 * Recipe Moderation Service — Marketplace.
 *
 * Handles the review workflow: submit → pending_review → approve/reject/request_changes → publish.
 * Only PLATFORM_MODERATOR and PLATFORM_ADMIN may perform review actions.
 */
import { prisma } from "@/lib/prisma";
import type {
  MarketplaceRecipeReview,
  ReviewActionInput,
  RecipeReviewAction,
  MarketplaceRecipeStatus,
} from "@/types/marketplace";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toReview(row: {
  id: string;
  recipeId: string;
  reviewerId: string;
  action: string;
  notes: string | null;
  createdAt: Date;
  reviewer: { name: string };
}): MarketplaceRecipeReview {
  return {
    id: row.id,
    recipeId: row.recipeId,
    reviewerId: row.reviewerId,
    reviewerName: row.reviewer.name,
    action: row.action as RecipeReviewAction,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Maps a review action to the resulting recipe status. */
function statusFromAction(action: RecipeReviewAction): MarketplaceRecipeStatus {
  switch (action) {
    case "SUBMITTED":
      return "PENDING_REVIEW";
    case "REVISION_SUBMITTED":
      return "PENDING_REVIEW";
    case "APPROVED":
      return "APPROVED";
    case "REJECTED":
      return "REJECTED";
    case "CHANGE_REQUESTED":
      return "CHANGE_REQUESTED";
    case "PUBLISHED":
      return "PUBLISHED";
    case "ARCHIVED":
      return "ARCHIVED";
  }
}

// ─── Public functions ─────────────────────────────────────────────────────────

/** Provider submits a recipe for review. */
export async function submitRecipeForReview(
  recipeId: string,
  providerId: string
): Promise<void> {
  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId, deletedAt: null },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found`);

  const allowedStatuses: MarketplaceRecipeStatus[] = [
    "DRAFT",
    "CHANGE_REQUESTED",
  ];
  if (!allowedStatuses.includes(recipe.status as MarketplaceRecipeStatus)) {
    throw new Error(
      `Recipe cannot be submitted from status '${recipe.status}'`
    );
  }
  if (recipe.type !== "PREMIUM") {
    throw new Error("Only PREMIUM recipes require moderation submission");
  }
  if (recipe.providerId !== providerId) {
    throw new Error("Only the recipe provider can submit for review");
  }

  const action: RecipeReviewAction =
    recipe.status === "CHANGE_REQUESTED" ? "REVISION_SUBMITTED" : "SUBMITTED";

  await prisma.$transaction([
    prisma.marketplaceRecipe.update({
      where: { id: recipeId },
      data: { status: "PENDING_REVIEW" },
    }),
    prisma.marketplaceRecipeReview.create({
      data: {
        recipeId,
        reviewerId: providerId,
        action,
        notes: null,
      },
    }),
  ]);
}

/** Moderator / admin performs a review action. */
export async function reviewRecipe(
  recipeId: string,
  reviewerId: string,
  input: ReviewActionInput
): Promise<MarketplaceRecipeReview> {
  const recipe = await prisma.marketplaceRecipe.findFirst({
    where: { id: recipeId, deletedAt: null },
  });
  if (!recipe) throw new Error(`MarketplaceRecipe ${recipeId} not found`);

  const reviewableStatuses: MarketplaceRecipeStatus[] = [
    "PENDING_REVIEW",
    "APPROVED",
    "PUBLISHED",
    "REJECTED",
  ];
  if (
    !reviewableStatuses.includes(recipe.status as MarketplaceRecipeStatus) &&
    input.action !== "ARCHIVED"
  ) {
    throw new Error(
      `Cannot perform review action '${input.action}' on recipe with status '${recipe.status}'`
    );
  }

  const newStatus = statusFromAction(input.action);
  const publishedAt =
    input.action === "PUBLISHED"
      ? (recipe.publishedAt ?? new Date())
      : undefined;

  const [, review] = await prisma.$transaction([
    prisma.marketplaceRecipe.update({
      where: { id: recipeId },
      data: {
        status: newStatus,
        ...(publishedAt !== undefined ? { publishedAt } : {}),
      },
    }),
    prisma.marketplaceRecipeReview.create({
      data: {
        recipeId,
        reviewerId,
        action: input.action,
        notes: input.notes ?? null,
      },
      include: { reviewer: { select: { name: true } } },
    }),
  ]);

  return toReview(
    review as typeof review & { reviewer: { name: string } }
  );
}

/** Moderator publishes an approved recipe. */
export async function publishRecipe(
  recipeId: string,
  reviewerId: string,
  notes?: string
): Promise<MarketplaceRecipeReview> {
  return reviewRecipe(recipeId, reviewerId, { action: "PUBLISHED", notes });
}

/** List moderation history for a recipe. */
export async function getRecipeReviews(
  recipeId: string
): Promise<MarketplaceRecipeReview[]> {
  const rows = await prisma.marketplaceRecipeReview.findMany({
    where: { recipeId },
    include: { reviewer: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) =>
    toReview(r as typeof r & { reviewer: { name: string } })
  );
}
