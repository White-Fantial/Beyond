-- Migration: platform_only_ingredients
-- 1) Remove Ingredient scope concept (scope/tenantId/storeId)
-- 2) Add tenant ingredient selection table for owner-side activation
-- 3) Remove tempIngredientId from ingredient_requests

-- Drop FK first if it exists
ALTER TABLE "ingredient_requests"
  DROP CONSTRAINT IF EXISTS "ingredient_requests_tempIngredientId_fkey";

ALTER TABLE "ingredient_requests"
  DROP COLUMN IF EXISTS "tempIngredientId";

ALTER TABLE "ingredients"
  DROP COLUMN IF EXISTS "scope",
  DROP COLUMN IF EXISTS "tenantId",
  DROP COLUMN IF EXISTS "storeId";

-- Rebuild ingredient indexes for platform-only model
DROP INDEX IF EXISTS "ingredients_scope_isActive_idx";
DROP INDEX IF EXISTS "ingredients_scope_category_idx";
DROP INDEX IF EXISTS "ingredients_tenantId_storeId_idx";
DROP INDEX IF EXISTS "ingredients_storeId_name_idx";

CREATE INDEX IF NOT EXISTS "ingredients_isActive_idx" ON "ingredients"("isActive");
CREATE INDEX IF NOT EXISTS "ingredients_category_idx" ON "ingredients"("category");
CREATE INDEX IF NOT EXISTS "ingredients_name_idx" ON "ingredients"("name");

-- Owner-selected ingredient set (tenant-scoped)
CREATE TABLE IF NOT EXISTS "tenant_ingredient_selections" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ingredientId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "tenant_ingredient_selections_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "tenant_ingredient_selections_tenantId_ingredientId_key"
  ON "tenant_ingredient_selections"("tenantId", "ingredientId");
CREATE INDEX IF NOT EXISTS "tenant_ingredient_selections_tenantId_isActive_idx"
  ON "tenant_ingredient_selections"("tenantId", "isActive");
CREATE INDEX IF NOT EXISTS "tenant_ingredient_selections_ingredientId_idx"
  ON "tenant_ingredient_selections"("ingredientId");

ALTER TABLE "tenant_ingredient_selections"
  ADD CONSTRAINT "tenant_ingredient_selections_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Drop enum if no longer needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'IngredientScope') THEN
    DROP TYPE "IngredientScope";
  END IF;
END $$;
