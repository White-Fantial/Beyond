-- Add isSoldOut field to catalog_products for per-product availability control
ALTER TABLE "catalog_products"
  ADD COLUMN "isSoldOut" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "catalog_products_storeId_isSoldOut_isActive_idx"
  ON "catalog_products"("storeId", "isSoldOut", "isActive");
