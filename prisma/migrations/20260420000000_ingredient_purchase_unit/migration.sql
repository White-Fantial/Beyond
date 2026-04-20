-- Migration: ingredient_purchase_unit
-- Separates the "purchase unit" (구매 단위) from the "recipe unit" (레시피 단위)
-- on the Ingredient model so owners can record how they buy an ingredient
-- (e.g. 2 KG bag) and how it is measured when used in recipes (e.g. GRAM),
-- with the unitCost stored per recipe unit.

-- Add purchaseUnit column — default to the same value as the existing `unit`
-- column so existing rows remain self-consistent.
ALTER TABLE "ingredients"
  ADD COLUMN "purchaseUnit" "IngredientUnit" NOT NULL DEFAULT 'GRAM';
