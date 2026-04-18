-- Cost Management Phase 5: Supplier Credentials & Base Price
-- Migration: 20260418900000_cost_management_phase5_supplier_credentials

-- ─── supplier_credentials ─────────────────────────────────────────────────────
-- Stores per-user login credentials for supplier websites (encrypted at rest).

CREATE TABLE "supplier_credentials" (
  "id"           TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"     TEXT        NOT NULL,
  "userId"       TEXT        NOT NULL,
  "supplierId"   TEXT        NOT NULL,
  "loginUrl"     TEXT,
  "username"     TEXT        NOT NULL,
  "passwordEnc"  TEXT        NOT NULL,
  "lastVerified" TIMESTAMP(3),
  "isActive"     BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"    TIMESTAMP(3) NOT NULL,
  "deletedAt"    TIMESTAMP(3),

  CONSTRAINT "supplier_credentials_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_credentials_tenantId_userId_supplierId_key"
  ON "supplier_credentials"("tenantId", "userId", "supplierId")
  WHERE "deletedAt" IS NULL;

CREATE INDEX "supplier_credentials_tenantId_userId_idx"
  ON "supplier_credentials"("tenantId", "userId");
CREATE INDEX "supplier_credentials_supplierId_idx"
  ON "supplier_credentials"("supplierId");

ALTER TABLE "supplier_credentials"
  ADD CONSTRAINT "supplier_credentials_supplierId_fkey"
  FOREIGN KEY ("supplierId") REFERENCES "suppliers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── supplier_products: add base-price columns ────────────────────────────────

ALTER TABLE "supplier_products"
  ADD COLUMN "basePrice"                INTEGER     NOT NULL DEFAULT 0,
  ADD COLUMN "basePriceUpdatedAt"       TIMESTAMP(3),
  ADD COLUMN "basePriceScrapedUserCount" INTEGER    NOT NULL DEFAULT 0;

-- ─── supplier_price_observations ──────────────────────────────────────────────
-- One row per (supplierProduct, user) – updated in-place on each scrape.

CREATE TABLE "supplier_price_observations" (
  "id"                TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "supplierProductId" TEXT        NOT NULL,
  "userId"            TEXT        NOT NULL,
  "credentialId"      TEXT        NOT NULL,
  "observedPrice"     INTEGER     NOT NULL,
  "scrapedAt"         TIMESTAMP(3) NOT NULL,

  CONSTRAINT "supplier_price_observations_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "supplier_price_observations_supplierProductId_userId_key"
  ON "supplier_price_observations"("supplierProductId", "userId");

CREATE INDEX "supplier_price_observations_supplierProductId_idx"
  ON "supplier_price_observations"("supplierProductId");
CREATE INDEX "supplier_price_observations_credentialId_idx"
  ON "supplier_price_observations"("credentialId");

ALTER TABLE "supplier_price_observations"
  ADD CONSTRAINT "supplier_price_observations_supplierProductId_fkey"
  FOREIGN KEY ("supplierProductId") REFERENCES "supplier_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "supplier_price_observations"
  ADD CONSTRAINT "supplier_price_observations_credentialId_fkey"
  FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;
