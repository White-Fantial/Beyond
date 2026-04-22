-- Add purchaseQty to supplier_products so admins can store the package quantity
-- alongside the price, enabling unit-cost calculations (referencePrice / purchaseQty per unit).

ALTER TABLE "supplier_products"
  ADD COLUMN "purchaseQty" DOUBLE PRECISION NOT NULL DEFAULT 1;
