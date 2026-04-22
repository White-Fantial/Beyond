-- Migration: 20260428000000_marketplace_recipe_instructions
-- Replace the MarketplaceRecipeStep child table with a single `instructions`
-- text column on marketplace_recipes. Also adds missing indexes.

-- 1. Add instructions column to marketplace_recipes
ALTER TABLE "marketplace_recipes" ADD COLUMN "instructions" TEXT;

-- 2. Migrate existing step data: concatenate steps ordered by stepNumber into instructions
UPDATE "marketplace_recipes" mr
SET "instructions" = (
  SELECT string_agg(s."instruction", E'\n\n' ORDER BY s."step_number")
  FROM "marketplace_recipe_steps" s
  WHERE s."recipe_id" = mr."id"
)
WHERE EXISTS (
  SELECT 1 FROM "marketplace_recipe_steps" s WHERE s."recipe_id" = mr."id"
);

-- 3. Drop the steps table (cascade removes the index and unique constraint)
DROP TABLE IF EXISTS "marketplace_recipe_steps";

-- 4. Add deletedAt index on marketplace_recipes
CREATE INDEX "marketplace_recipes_deleted_at_idx" ON "marketplace_recipes"("deleted_at");

-- 5. Add marketplaceSourceId index on recipes
CREATE INDEX "recipes_marketplace_source_id_idx" ON "recipes"("marketplace_source_id");
