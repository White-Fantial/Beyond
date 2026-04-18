-- Cost Management Phase 2: Recipe & RecipeIngredient
-- Migration: 20260418700000_cost_management_phase2_recipes

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "RecipeYieldUnit" AS ENUM (
  'EACH',
  'BATCH',
  'SERVING',
  'GRAM',
  'KG',
  'ML',
  'LITER'
);

-- ─── recipes ─────────────────────────────────────────────────────────────────

CREATE TABLE "recipes" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"         TEXT        NOT NULL,
  "storeId"          TEXT        NOT NULL,
  "catalogProductId" TEXT,
  "name"             TEXT        NOT NULL,
  "yieldQty"         INTEGER     NOT NULL DEFAULT 1,
  "yieldUnit"        "RecipeYieldUnit" NOT NULL DEFAULT 'EACH',
  "notes"            TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,
  "deletedAt"        TIMESTAMP(3),

  CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "recipes_tenantId_storeId_idx" ON "recipes"("tenantId", "storeId");
CREATE INDEX "recipes_storeId_catalogProductId_idx" ON "recipes"("storeId", "catalogProductId");

ALTER TABLE "recipes" ADD CONSTRAINT "recipes_catalogProductId_fkey"
  FOREIGN KEY ("catalogProductId") REFERENCES "catalog_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── recipe_ingredients ──────────────────────────────────────────────────────

CREATE TABLE "recipe_ingredients" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recipeId"     TEXT        NOT NULL,
  "ingredientId" TEXT        NOT NULL,
  "quantity"     DECIMAL(12,4) NOT NULL DEFAULT 1,
  "unit"         "IngredientUnit" NOT NULL DEFAULT 'GRAM',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,

  CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "recipe_ingredients_recipeId_ingredientId_key" ON "recipe_ingredients"("recipeId", "ingredientId");
CREATE INDEX "recipe_ingredients_recipeId_idx" ON "recipe_ingredients"("recipeId");
CREATE INDEX "recipe_ingredients_ingredientId_idx" ON "recipe_ingredients"("ingredientId");

ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
