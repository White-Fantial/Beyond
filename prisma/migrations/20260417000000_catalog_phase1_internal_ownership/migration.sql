-- Phase 1: Catalog Internal Ownership
-- Adds provenance fields (originType, originConnectionId, originExternalRef, importedAt)
-- to all internal catalog models.
--
-- These fields record WHERE an entity ORIGINALLY came from (historical metadata only).
-- They do NOT represent the current authoritative source — the Beyond internal catalog
-- is always the canonical operational model, regardless of origin.
--
-- The old sourceType / sourceOfTruthConnectionId / source*Ref fields are kept as-is
-- for migration safety and backward compatibility with existing catalog-sync code paths.

-- ─── Add CatalogOriginType enum ───────────────────────────────────────────────

CREATE TYPE "CatalogOriginType" AS ENUM (
  'BEYOND_CREATED',
  'IMPORTED_FROM_POS',
  'IMPORTED_FROM_DELIVERY',
  'IMPORTED_FROM_OTHER'
);

-- ─── catalog_categories ───────────────────────────────────────────────────────

ALTER TABLE "catalog_categories"
  ADD COLUMN "originType"         "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
  ADD COLUMN "originConnectionId" TEXT,
  ADD COLUMN "originExternalRef"  TEXT,
  ADD COLUMN "importedAt"         TIMESTAMP(3);

-- Backfill: entities that had sourceType = 'POS' originated from a POS import.
UPDATE "catalog_categories"
  SET "originType" = 'IMPORTED_FROM_POS'
  WHERE "sourceType" = 'POS';

-- Backfill: entities that had sourceType = 'DELIVERY' originated from a delivery platform.
UPDATE "catalog_categories"
  SET "originType" = 'IMPORTED_FROM_DELIVERY'
  WHERE "sourceType" = 'DELIVERY';

-- Backfill: propagate the old connection / external-ref into the new provenance fields.
UPDATE "catalog_categories"
  SET "originConnectionId" = "sourceOfTruthConnectionId",
      "originExternalRef"  = "sourceCategoryRef"
  WHERE "sourceOfTruthConnectionId" IS NOT NULL;

CREATE INDEX "catalog_categories_storeId_originConnectionId_originExternalRef_idx"
  ON "catalog_categories" ("storeId", "originConnectionId", "originExternalRef");

-- ─── catalog_products ─────────────────────────────────────────────────────────

ALTER TABLE "catalog_products"
  ADD COLUMN "originType"         "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
  ADD COLUMN "originConnectionId" TEXT,
  ADD COLUMN "originExternalRef"  TEXT,
  ADD COLUMN "importedAt"         TIMESTAMP(3);

UPDATE "catalog_products"
  SET "originType" = 'IMPORTED_FROM_POS'
  WHERE "sourceType" = 'POS';

UPDATE "catalog_products"
  SET "originType" = 'IMPORTED_FROM_DELIVERY'
  WHERE "sourceType" = 'DELIVERY';

UPDATE "catalog_products"
  SET "originConnectionId" = "sourceOfTruthConnectionId",
      "originExternalRef"  = "sourceProductRef"
  WHERE "sourceOfTruthConnectionId" IS NOT NULL;

CREATE INDEX "catalog_products_storeId_originConnectionId_originExternalRef_idx"
  ON "catalog_products" ("storeId", "originConnectionId", "originExternalRef");

-- ─── catalog_modifier_groups ──────────────────────────────────────────────────

ALTER TABLE "catalog_modifier_groups"
  ADD COLUMN "originType"         "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
  ADD COLUMN "originConnectionId" TEXT,
  ADD COLUMN "originExternalRef"  TEXT,
  ADD COLUMN "importedAt"         TIMESTAMP(3);

UPDATE "catalog_modifier_groups"
  SET "originType" = 'IMPORTED_FROM_POS'
  WHERE "sourceType" = 'POS';

UPDATE "catalog_modifier_groups"
  SET "originType" = 'IMPORTED_FROM_DELIVERY'
  WHERE "sourceType" = 'DELIVERY';

UPDATE "catalog_modifier_groups"
  SET "originConnectionId" = "sourceOfTruthConnectionId",
      "originExternalRef"  = "sourceModifierGroupRef"
  WHERE "sourceOfTruthConnectionId" IS NOT NULL;

CREATE INDEX "catalog_modifier_groups_storeId_originConnectionId_originExternalRef_idx"
  ON "catalog_modifier_groups" ("storeId", "originConnectionId", "originExternalRef");

-- ─── catalog_modifier_options ─────────────────────────────────────────────────

ALTER TABLE "catalog_modifier_options"
  ADD COLUMN "originType"         "CatalogOriginType" NOT NULL DEFAULT 'BEYOND_CREATED',
  ADD COLUMN "originConnectionId" TEXT,
  ADD COLUMN "originExternalRef"  TEXT,
  ADD COLUMN "importedAt"         TIMESTAMP(3);

UPDATE "catalog_modifier_options"
  SET "originType" = 'IMPORTED_FROM_POS'
  WHERE "sourceType" = 'POS';

UPDATE "catalog_modifier_options"
  SET "originType" = 'IMPORTED_FROM_DELIVERY'
  WHERE "sourceType" = 'DELIVERY';

UPDATE "catalog_modifier_options"
  SET "originConnectionId" = "sourceOfTruthConnectionId",
      "originExternalRef"  = "sourceModifierOptionRef"
  WHERE "sourceOfTruthConnectionId" IS NOT NULL;

CREATE INDEX "catalog_modifier_options_storeId_originConnectionId_originExternalRef_idx"
  ON "catalog_modifier_options" ("storeId", "originConnectionId", "originExternalRef");
