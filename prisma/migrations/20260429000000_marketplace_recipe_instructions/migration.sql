-- Add free-text instructions field to marketplace_recipes.
-- The legacy MarketplaceRecipeStep table is retained for backward compatibility
-- but the UI now uses this single text field instead of numbered rows.
ALTER TABLE "marketplace_recipes" ADD COLUMN "instructions" TEXT;
