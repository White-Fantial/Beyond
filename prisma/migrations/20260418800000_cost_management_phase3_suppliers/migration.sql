-- Cost Management Phase 3: Supplier, SupplierProduct, IngredientSupplierLink
-- Migration: 20260418800000_cost_management_phase3_suppliers

-- ─── suppliers ───────────────────────────────────────────────────────────────

CREATE TABLE "suppliers" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"     TEXT        NOT NULL,
  "storeId"      TEXT        NOT NULL,
  "name"         TEXT        NOT NULL,
  "websiteUrl"   TEXT,
  "contactEmail" TEXT,
  "contactPhone" TEXT,
  "notes"        TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "deletedAt"    TIMESTAMP(3),

  CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "suppliers_tenantId_storeId_idx" ON "suppliers"("tenantId", "storeId");
CREATE INDEX "suppliers_storeId_name_idx" ON "suppliers"("storeId", "name");

-- ─── supplier_products ───────────────────────────────────────────────────────

CREATE TABLE "supplier_products" (
  "id"            TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "supplierId"    TEXT        NOT NULL,
  "name"          TEXT        NOT NULL,
  "externalUrl"   TEXT,
  "currentPrice"  INTEGER     NOT NULL DEFAULT 0,
  "unit"          "IngredientUnit" NOT NULL DEFAULT 'EACH',
  "lastScrapedAt" TIMESTAMP(3),
  "metadata"      JSONB       NOT NULL DEFAULT '{}',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL,
  "deletedAt"     TIMESTAMP(3),

  CONSTRAINT "supplier_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_products_supplierId_idx" ON "supplier_products"("supplierId");

ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── ingredient_supplier_links ────────────────────────────────────────────────

CREATE TABLE "ingredient_supplier_links" (
  "id"                TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "ingredientId"      TEXT        NOT NULL,
  "supplierProductId" TEXT        NOT NULL,
  "isPreferred"       BOOLEAN     NOT NULL DEFAULT false,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ingredient_supplier_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ingredient_supplier_links_ingredientId_supplierProductId_key"
  ON "ingredient_supplier_links"("ingredientId", "supplierProductId");
CREATE INDEX "ingredient_supplier_links_ingredientId_idx" ON "ingredient_supplier_links"("ingredientId");
CREATE INDEX "ingredient_supplier_links_supplierProductId_idx" ON "ingredient_supplier_links"("supplierProductId");

ALTER TABLE "ingredient_supplier_links" ADD CONSTRAINT "ingredient_supplier_links_ingredientId_fkey"
  FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ingredient_supplier_links" ADD CONSTRAINT "ingredient_supplier_links_supplierProductId_fkey"
  FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
