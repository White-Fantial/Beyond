-- Migration: Increase unitCost precision from cents to millicents (1/100000 dollar).
--
-- Previously, unitCost (and related supplier price fields) were stored as cents
-- (integer, ×100 of 1 dollar). This caused sub-cent unit prices (e.g. $0.00175/g
-- for 20 kg flour at $35) to round to 0 and be rejected.
--
-- The new scale is millicents (1/100000 dollar = 1/1000 cent), which gives 5
-- decimal places of dollar precision. All existing values are multiplied by 1000.

-- Ingredient unit cost
UPDATE "ingredients" SET "unitCost" = "unitCost" * 1000;

-- Marketplace recipe ingredient unit cost snapshot
UPDATE "marketplace_recipe_ingredients" SET "unitCostSnapshot" = "unitCostSnapshot" * 1000;

-- Supplier product prices (used as effectiveCost in recipe calculations)
UPDATE "supplier_products" SET "currentPrice" = "currentPrice" * 1000, "basePrice" = "basePrice" * 1000;

-- Supplier price observations (per-user scrape results, used as effectiveCost)
UPDATE "supplier_price_observations" SET "observedPrice" = "observedPrice" * 1000;
