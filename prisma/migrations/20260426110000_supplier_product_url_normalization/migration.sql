ALTER TABLE "supplier_products"
  ADD COLUMN "externalUrlNormalized" TEXT;

CREATE INDEX "supplier_products_supplierId_externalUrlNormalized_idx"
  ON "supplier_products" ("supplierId", "externalUrlNormalized");

CREATE UNIQUE INDEX "supplier_products_active_normalized_url_unique"
  ON "supplier_products" ("supplierId", "externalUrlNormalized")
  WHERE "deletedAt" IS NULL
    AND "externalUrlNormalized" IS NOT NULL;
