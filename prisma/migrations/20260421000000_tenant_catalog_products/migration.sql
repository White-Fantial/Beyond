-- Migration: tenant_catalog_products
-- Adds TenantCatalogProduct (shared product catalog for all stores in a tenant)
-- and StoreProductSelection (per-store selection with optional overrides).

CREATE TABLE "tenant_catalog_products" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "name"             TEXT NOT NULL,
    "description"      TEXT,
    "shortDescription" TEXT,
    "basePriceAmount"  INTEGER NOT NULL DEFAULT 0,
    "currency"         TEXT NOT NULL DEFAULT 'USD',
    "imageUrl"         TEXT,
    "displayOrder"     INTEGER NOT NULL DEFAULT 0,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "internalNote"     TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    "deletedAt"        TIMESTAMP(3),

    CONSTRAINT "tenant_catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "store_product_selections" (
    "id"               TEXT NOT NULL,
    "tenantId"         TEXT NOT NULL,
    "storeId"          TEXT NOT NULL,
    "tenantProductId"  TEXT NOT NULL,
    "customPriceAmount" INTEGER,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "displayOrder"     INTEGER NOT NULL DEFAULT 0,
    "selectedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_product_selections_pkey" PRIMARY KEY ("id")
);

-- Indexes for TenantCatalogProduct
CREATE INDEX "tenant_catalog_products_tenantId_isActive_displayOrder_idx"
    ON "tenant_catalog_products"("tenantId", "isActive", "displayOrder");

CREATE INDEX "tenant_catalog_products_tenantId_name_idx"
    ON "tenant_catalog_products"("tenantId", "name");

-- Unique constraint + indexes for StoreProductSelection
CREATE UNIQUE INDEX "store_product_selections_storeId_tenantProductId_key"
    ON "store_product_selections"("storeId", "tenantProductId");

CREATE INDEX "store_product_selections_tenantId_storeId_idx"
    ON "store_product_selections"("tenantId", "storeId");

CREATE INDEX "store_product_selections_storeId_isActive_displayOrder_idx"
    ON "store_product_selections"("storeId", "isActive", "displayOrder");

-- Foreign key: StoreProductSelection → TenantCatalogProduct
ALTER TABLE "store_product_selections"
    ADD CONSTRAINT "store_product_selections_tenantProductId_fkey"
    FOREIGN KEY ("tenantProductId")
    REFERENCES "tenant_catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
