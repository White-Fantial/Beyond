-- Migration: ingredient_purchase_qty
-- Adds purchaseQty to the Ingredient model so the original purchase quantity
-- (e.g. 20 kg) is preserved alongside the purchase unit and computed unit cost.
-- This allows the edit form to restore the exact qty and total price the owner
-- originally entered instead of defaulting to 1 unit.

ALTER TABLE "ingredients"
  ADD COLUMN "purchaseQty" DOUBLE PRECISION NOT NULL DEFAULT 1;
