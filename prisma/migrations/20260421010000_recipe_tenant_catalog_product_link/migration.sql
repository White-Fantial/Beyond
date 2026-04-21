-- Migration: recipe_tenant_catalog_product_link
-- Adds tenantCatalogProductId to Recipe so recipes can be linked to
-- TenantCatalogProduct (tenant-level shared product catalog) in addition to
-- store-level CatalogProduct.

ALTER TABLE "recipes"
    ADD COLUMN "tenantCatalogProductId" TEXT;

CREATE INDEX "recipes_tenantId_tenantCatalogProductId_idx"
    ON "recipes"("tenantId", "tenantCatalogProductId");

ALTER TABLE "recipes"
    ADD CONSTRAINT "recipes_tenantCatalogProductId_fkey"
    FOREIGN KEY ("tenantCatalogProductId")
    REFERENCES "tenant_catalog_products"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
