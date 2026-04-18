-- Marketplace Phase 3: Core recipe models.
-- Creates MarketplaceRecipeType / MarketplaceRecipeStatus / RecipeDifficulty enums
-- and MarketplaceRecipe, MarketplaceRecipeStep, MarketplaceRecipeIngredient tables.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "MarketplaceRecipeType" AS ENUM ('BASIC', 'PREMIUM');

CREATE TYPE "MarketplaceRecipeStatus" AS ENUM (
  'DRAFT',
  'PENDING_REVIEW',
  'CHANGE_REQUESTED',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED'
);

CREATE TYPE "RecipeDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- ─── marketplace_recipes ──────────────────────────────────────────────────────

CREATE TABLE "marketplace_recipes" (
  "id"                 TEXT                      NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "type"               "MarketplaceRecipeType"   NOT NULL DEFAULT 'PREMIUM',
  "status"             "MarketplaceRecipeStatus" NOT NULL DEFAULT 'DRAFT',
  "title"              TEXT                      NOT NULL,
  "description"        TEXT,
  "thumbnailUrl"       TEXT,
  "providerId"         TEXT,
  "createdByUserId"    TEXT                      NOT NULL,
  "yieldQty"           INTEGER                   NOT NULL DEFAULT 1,
  "yieldUnit"          TEXT                      NOT NULL DEFAULT 'EACH',
  "servings"           INTEGER,
  "cuisineTag"         TEXT,
  "difficulty"         "RecipeDifficulty",
  "prepTimeMinutes"    INTEGER,
  "cookTimeMinutes"    INTEGER,
  "currency"           TEXT                      NOT NULL DEFAULT 'KRW',
  "estimatedCostPrice" INTEGER                   NOT NULL DEFAULT 0,
  "recommendedPrice"   INTEGER                   NOT NULL DEFAULT 0,
  "salePrice"          INTEGER                   NOT NULL DEFAULT 0,
  "publishedAt"        TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3)              NOT NULL,
  "deletedAt"          TIMESTAMP(3),

  CONSTRAINT "marketplace_recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "marketplace_recipes_status_idx"      ON "marketplace_recipes"("status");
CREATE INDEX "marketplace_recipes_type_status_idx" ON "marketplace_recipes"("type", "status");
CREATE INDEX "marketplace_recipes_providerId_idx"  ON "marketplace_recipes"("providerId");

ALTER TABLE "marketplace_recipes"
  ADD CONSTRAINT "marketplace_recipes_providerId_fkey"
  FOREIGN KEY ("providerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "marketplace_recipes"
  ADD CONSTRAINT "marketplace_recipes_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── marketplace_recipe_steps ─────────────────────────────────────────────────

CREATE TABLE "marketplace_recipe_steps" (
  "id"              TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recipeId"        TEXT         NOT NULL,
  "stepNumber"      INTEGER      NOT NULL,
  "instruction"     TEXT         NOT NULL,
  "imageUrl"        TEXT,
  "durationMinutes" INTEGER,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "marketplace_recipe_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_recipe_steps_recipeId_stepNumber_key" UNIQUE ("recipeId", "stepNumber")
);

CREATE INDEX "marketplace_recipe_steps_recipeId_idx" ON "marketplace_recipe_steps"("recipeId");

ALTER TABLE "marketplace_recipe_steps"
  ADD CONSTRAINT "marketplace_recipe_steps_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── marketplace_recipe_ingredients ──────────────────────────────────────────

CREATE TABLE "marketplace_recipe_ingredients" (
  "id"                   TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recipeId"             TEXT          NOT NULL,
  "platformIngredientId" TEXT          NOT NULL,
  "quantity"             DECIMAL(12,4) NOT NULL DEFAULT 1,
  "unit"                 TEXT          NOT NULL DEFAULT 'GRAM',
  "notes"                TEXT,
  "unitCostSnapshot"     INTEGER       NOT NULL DEFAULT 0,
  "createdAt"            TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"            TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "marketplace_recipe_ingredients_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_recipe_ingredients_recipeId_platformIngredientId_key"
    UNIQUE ("recipeId", "platformIngredientId")
);

CREATE INDEX "marketplace_recipe_ingredients_recipeId_idx"             ON "marketplace_recipe_ingredients"("recipeId");
CREATE INDEX "marketplace_recipe_ingredients_platformIngredientId_idx" ON "marketplace_recipe_ingredients"("platformIngredientId");

ALTER TABLE "marketplace_recipe_ingredients"
  ADD CONSTRAINT "marketplace_recipe_ingredients_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "marketplace_recipe_ingredients"
  ADD CONSTRAINT "marketplace_recipe_ingredients_platformIngredientId_fkey"
  FOREIGN KEY ("platformIngredientId") REFERENCES "platform_ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
