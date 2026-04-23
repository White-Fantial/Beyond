-- Add platformSourceId to recipes to track when a recipe was copied from a
-- platform-level Recipe (tenantId = null). Distinct from marketplaceSourceId
-- which tracks copies from MarketplaceRecipe records.
ALTER TABLE "recipes" ADD COLUMN "platformSourceId" TEXT;

CREATE INDEX "recipes_platformSourceId_idx" ON "recipes"("platformSourceId");
