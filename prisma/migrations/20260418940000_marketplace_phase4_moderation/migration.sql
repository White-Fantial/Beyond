-- Marketplace Phase 4: Moderation — RecipeReviewAction enum + MarketplaceRecipeReview table.

CREATE TYPE "RecipeReviewAction" AS ENUM (
  'SUBMITTED',
  'APPROVED',
  'REJECTED',
  'CHANGE_REQUESTED',
  'REVISION_SUBMITTED',
  'PUBLISHED',
  'ARCHIVED'
);

CREATE TABLE "marketplace_recipe_reviews" (
  "id"         TEXT                  NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recipeId"   TEXT                  NOT NULL,
  "reviewerId" TEXT                  NOT NULL,
  "action"     "RecipeReviewAction"  NOT NULL,
  "notes"      TEXT,
  "createdAt"  TIMESTAMP(3)          NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "marketplace_recipe_reviews_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketplace_recipe_reviews_recipeId_createdAt_idx" ON "marketplace_recipe_reviews"("recipeId", "createdAt");
CREATE INDEX "marketplace_recipe_reviews_reviewerId_idx"          ON "marketplace_recipe_reviews"("reviewerId");

ALTER TABLE "marketplace_recipe_reviews"
  ADD CONSTRAINT "marketplace_recipe_reviews_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_recipe_reviews"
  ADD CONSTRAINT "marketplace_recipe_reviews_reviewerId_fkey"
  FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
