-- Marketplace Phase 1: Add RECIPE_PROVIDER and PLATFORM_MODERATOR to PlatformRole enum.
-- Also adds marketplaceSourceId to recipes for linking imported marketplace recipes.
--
-- NOTE: PostgreSQL enum values cannot be removed once added. If these roles need to
-- be removed or renamed in the future, the entire PlatformRole enum must be recreated
-- (e.g. via a multi-step migration using a new type, data migration, and type swap).

ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'RECIPE_PROVIDER';
ALTER TYPE "PlatformRole" ADD VALUE IF NOT EXISTS 'PLATFORM_MODERATOR';

-- Link imported marketplace recipes back to the origin marketplace recipe
ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "marketplaceSourceId" TEXT;
