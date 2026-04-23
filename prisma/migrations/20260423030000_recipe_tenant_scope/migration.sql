-- Recipe tenant-scope migration: remove storeId from recipes.
-- Recipes are now scoped to tenant only (not per-store).

-- DropIndex
DROP INDEX IF EXISTS "recipes_tenantId_storeId_idx";

-- DropIndex
DROP INDEX IF EXISTS "recipes_storeId_catalogProductId_idx";

-- AlterTable
ALTER TABLE "recipes" DROP COLUMN IF EXISTS "storeId";
