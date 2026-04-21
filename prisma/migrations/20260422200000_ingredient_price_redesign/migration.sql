-- Migration: Ingredient Price Redesign
--
-- Separates conceptual ingredient from actual supplier pricing.
-- - Ingredient is now a taxonomy node (no price, no purchase unit/qty)
-- - SupplierProduct.currentPrice/basePrice replaced by SupplierContractPrice (per-owner
--   negotiated price with history) and SupplierPriceRecord (full observation history)
-- - SupplierPriceObservation (one-row-per-user, no history) is replaced by
--   SupplierPriceRecord (append-only, per-tenant, full history)

-- ─── 1. Add SupplierPriceSource enum ──────────────────────────────────────────

CREATE TYPE "SupplierPriceSource" AS ENUM ('SCRAPED', 'MANUAL_ENTRY', 'INVOICE_IMPORT');

-- ─── 2. Create supplier_contract_prices table ─────────────────────────────────

CREATE TABLE "supplier_contract_prices" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid(),
    "supplierProductId" TEXT NOT NULL,
    "tenantId"          TEXT NOT NULL,
    "price"             INTEGER NOT NULL,
    "effectiveFrom"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo"       TIMESTAMP(3),
    "contractRef"       TEXT,
    "notes"             TEXT,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "supplier_contract_prices_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_contract_prices_supplierProductId_tenantId_idx"
    ON "supplier_contract_prices"("supplierProductId", "tenantId");
CREATE INDEX "supplier_contract_prices_tenantId_idx"
    ON "supplier_contract_prices"("tenantId");

ALTER TABLE "supplier_contract_prices"
    ADD CONSTRAINT "supplier_contract_prices_supplierProductId_fkey"
    FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. Create supplier_price_records table ───────────────────────────────────

CREATE TABLE "supplier_price_records" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid(),
    "supplierProductId" TEXT NOT NULL,
    "tenantId"          TEXT NOT NULL,
    "observedPrice"     INTEGER NOT NULL,
    "source"            "SupplierPriceSource" NOT NULL DEFAULT 'MANUAL_ENTRY',
    "credentialId"      TEXT,
    "observedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"             TEXT,
    CONSTRAINT "supplier_price_records_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_price_records_supplierProductId_tenantId_idx"
    ON "supplier_price_records"("supplierProductId", "tenantId");
CREATE INDEX "supplier_price_records_tenantId_idx"
    ON "supplier_price_records"("tenantId");

ALTER TABLE "supplier_price_records"
    ADD CONSTRAINT "supplier_price_records_supplierProductId_fkey"
    FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_price_records"
    ADD CONSTRAINT "supplier_price_records_credentialId_fkey"
    FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 4. Backfill supplier_price_records from supplier_price_observations ──────
-- Each SupplierPriceObservation becomes a SCRAPED SupplierPriceRecord.
-- We derive tenantId via supplier_credentials → tenant.

INSERT INTO "supplier_price_records"
    ("id", "supplierProductId", "tenantId", "observedPrice", "source", "credentialId", "observedAt")
SELECT
    gen_random_uuid(),
    spo."supplierProductId",
    sc."tenantId",
    spo."observedPrice",
    'SCRAPED'::"SupplierPriceSource",
    spo."credentialId",
    spo."scrapedAt"
FROM "supplier_price_observations" spo
JOIN "supplier_credentials" sc ON sc."id" = spo."credentialId";

-- ─── 5. Backfill supplier_contract_prices from ingredients with unitCost ──────
-- For each ingredient with a non-zero unitCost and a preferred supplier link,
-- create an active (effectiveTo IS NULL) contract price entry.

INSERT INTO "supplier_contract_prices"
    ("id", "supplierProductId", "tenantId", "price", "effectiveFrom", "notes")
SELECT
    gen_random_uuid(),
    isl."supplierProductId",
    i."tenantId",
    i."unitCost",
    NOW(),
    'Migrated from ingredient unitCost'
FROM "ingredients" i
JOIN "ingredient_supplier_links" isl
    ON isl."ingredientId" = i."id" AND isl."isPreferred" = true
WHERE i."scope" = 'STORE'
  AND i."tenantId" IS NOT NULL
  AND i."unitCost" IS NOT NULL
  AND i."unitCost" > 0
  AND i."deletedAt" IS NULL;

-- ─── 6. Add referencePrice to supplier_products, backfill from basePrice ──────

ALTER TABLE "supplier_products" ADD COLUMN "referencePrice" INTEGER NOT NULL DEFAULT 0;

UPDATE "supplier_products" SET "referencePrice" = "basePrice" WHERE "basePrice" > 0;

-- ─── 7. Drop deprecated columns from supplier_products ────────────────────────

ALTER TABLE "supplier_products"
    DROP COLUMN IF EXISTS "currentPrice",
    DROP COLUMN IF EXISTS "basePrice",
    DROP COLUMN IF EXISTS "basePriceUpdatedAt",
    DROP COLUMN IF EXISTS "basePriceScrapedUserCount";

-- ─── 8. Drop deprecated columns from ingredients ─────────────────────────────

ALTER TABLE "ingredients"
    DROP COLUMN IF EXISTS "unitCost",
    DROP COLUMN IF EXISTS "purchaseUnit",
    DROP COLUMN IF EXISTS "purchaseQty",
    DROP COLUMN IF EXISTS "currency";

-- ─── 9. Drop supplier_price_observations table ────────────────────────────────

DROP TABLE IF EXISTS "supplier_price_observations";
