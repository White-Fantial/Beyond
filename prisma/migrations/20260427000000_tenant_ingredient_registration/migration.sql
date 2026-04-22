-- Migration: tenant_ingredient_registration
-- Feature 1: TenantIngredient — tracks which PLATFORM ingredients each tenant has registered for use.
-- Feature 2: IngredientSupplierLink.tenantId — per-tenant preferred supplier product overrides on PLATFORM ingredients.
-- Feature 3: Supplier.adapterType — per-supplier scraper adapter type for domain-specific scraping.

-- ─── 1. TenantIngredient table ────────────────────────────────────────────────

CREATE TABLE "tenant_ingredients" (
    "id"           TEXT         NOT NULL,
    "tenantId"     TEXT         NOT NULL,
    "ingredientId" TEXT         NOT NULL,
    "isActive"     BOOLEAN      NOT NULL DEFAULT true,
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_ingredients_tenantId_ingredientId_key"
    ON "tenant_ingredients"("tenantId", "ingredientId");

CREATE INDEX "tenant_ingredients_tenantId_idx"
    ON "tenant_ingredients"("tenantId");

ALTER TABLE "tenant_ingredients"
    ADD CONSTRAINT "tenant_ingredients_ingredientId_fkey"
    FOREIGN KEY ("ingredientId") REFERENCES "ingredients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 2. IngredientSupplierLink.tenantId ───────────────────────────────────────

-- Add nullable tenantId column (null = platform-level link; set = owner-specific override)
ALTER TABLE "ingredient_supplier_links" ADD COLUMN "tenantId" TEXT;

-- Drop old unique constraint (ingredientId, supplierProductId) — now must be scoped by tenantId
DROP INDEX IF EXISTS "ingredient_supplier_links_ingredientId_supplierProductId_key";

-- Partial unique index for platform-level links (tenantId IS NULL)
-- Ensures only one platform link per (ingredientId, supplierProductId)
CREATE UNIQUE INDEX "ingredient_supplier_links_platform_unique"
    ON "ingredient_supplier_links"("ingredientId", "supplierProductId")
    WHERE "tenantId" IS NULL;

-- Partial unique index for tenant-specific links (tenantId IS NOT NULL)
-- Ensures only one tenant override per (ingredientId, supplierProductId, tenantId)
CREATE UNIQUE INDEX "ingredient_supplier_links_tenant_unique"
    ON "ingredient_supplier_links"("ingredientId", "supplierProductId", "tenantId")
    WHERE "tenantId" IS NOT NULL;

-- Index for tenant-scoped queries
CREATE INDEX "ingredient_supplier_links_tenantId_idx"
    ON "ingredient_supplier_links"("tenantId");

-- ─── 3. Supplier.adapterType ──────────────────────────────────────────────────

-- Optional scraper adapter identifier (e.g. "foodstuffs", "countdown").
-- null means use the generic scraper.
ALTER TABLE "suppliers" ADD COLUMN "adapterType" TEXT;
