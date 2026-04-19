-- Migration: Unify PlatformIngredient into Ingredient
-- PlatformIngredient 모델을 Ingredient 모델로 통합.
-- Ingredient에 scope/category/isActive/createdByUserId 필드를 추가하고
-- platform_ingredients 데이터를 ingredients로 이관 후 platform_ingredients 테이블 삭제.

-- Step 1: Add IngredientScope enum
CREATE TYPE "IngredientScope" AS ENUM ('PLATFORM', 'STORE');

-- Step 2: Extend ingredients table with new columns
ALTER TABLE "ingredients"
  ADD COLUMN "scope"            "IngredientScope" NOT NULL DEFAULT 'STORE',
  ADD COLUMN "category"         TEXT,
  ADD COLUMN "is_active"        BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN "created_by_user_id" TEXT;

-- Step 3: Make tenantId and storeId nullable (they remain NOT NULL for STORE scope by app logic)
ALTER TABLE "ingredients"
  ALTER COLUMN "tenant_id" DROP NOT NULL,
  ALTER COLUMN "store_id"  DROP NOT NULL;

-- Step 4: Add foreign key from ingredients.created_by_user_id → users.id
ALTER TABLE "ingredients"
  ADD CONSTRAINT "ingredients_created_by_user_id_fkey"
  FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 5: Migrate platform_ingredients → ingredients (scope = PLATFORM)
INSERT INTO "ingredients" (
  "id", "scope", "tenant_id", "store_id",
  "name", "description", "category",
  "unit", "unit_cost", "currency",
  "is_active", "created_by_user_id", "notes",
  "created_at", "updated_at", "deleted_at"
)
SELECT
  pi."id",
  'PLATFORM'::"IngredientScope",
  NULL,  -- no tenant
  NULL,  -- no store
  pi."name",
  pi."description",
  pi."category",
  pi."unit",
  pi."reference_unit_cost",
  pi."currency",
  pi."is_active",
  pi."created_by_user_id",
  NULL,  -- no notes
  pi."created_at",
  pi."updated_at",
  pi."deleted_at"
FROM "platform_ingredients" pi;

-- Step 6: Update marketplace_recipe_ingredients — rename platform_ingredient_id → ingredient_id
ALTER TABLE "marketplace_recipe_ingredients"
  RENAME COLUMN "platform_ingredient_id" TO "ingredient_id";

-- Drop old FK and unique constraint, re-add with new name
ALTER TABLE "marketplace_recipe_ingredients"
  DROP CONSTRAINT "marketplace_recipe_ingredients_platform_ingredient_id_fkey";

ALTER TABLE "marketplace_recipe_ingredients"
  DROP CONSTRAINT "marketplace_recipe_ingredients_recipe_id_platform_ingredient_id_key";

ALTER TABLE "marketplace_recipe_ingredients"
  ADD CONSTRAINT "marketplace_recipe_ingredients_recipe_id_ingredient_id_key"
  UNIQUE ("recipe_id", "ingredient_id");

ALTER TABLE "marketplace_recipe_ingredients"
  ADD CONSTRAINT "marketplace_recipe_ingredients_ingredient_id_fkey"
  FOREIGN KEY ("ingredient_id") REFERENCES "ingredients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old index and create new one
DROP INDEX IF EXISTS "marketplace_recipe_ingredients_platform_ingredient_id_idx";
CREATE INDEX "marketplace_recipe_ingredients_ingredient_id_idx" ON "marketplace_recipe_ingredients"("ingredient_id");

-- Step 7: Update ingredient_requests — rename resolved_platform_ingredient_id → resolved_ingredient_id
ALTER TABLE "ingredient_requests"
  RENAME COLUMN "resolved_platform_ingredient_id" TO "resolved_ingredient_id";

-- Drop old FK, re-add pointing to ingredients
ALTER TABLE "ingredient_requests"
  DROP CONSTRAINT "ingredient_requests_resolved_platform_ingredient_id_fkey";

ALTER TABLE "ingredient_requests"
  ADD CONSTRAINT "ingredient_requests_resolved_ingredient_id_fkey"
  FOREIGN KEY ("resolved_ingredient_id") REFERENCES "ingredients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Step 8: Add new indexes on ingredients
CREATE INDEX "ingredients_scope_is_active_idx"  ON "ingredients"("scope", "is_active");
CREATE INDEX "ingredients_scope_category_idx"    ON "ingredients"("scope", "category");

-- Step 9: Drop platform_ingredients table (data is now in ingredients)
DROP TABLE "platform_ingredients";
