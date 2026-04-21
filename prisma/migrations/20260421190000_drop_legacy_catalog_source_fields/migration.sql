-- Migration: Drop legacy sourceOfTruthConnectionId and source*Ref fields from catalog models.
--
-- These fields were the original catalog sync keys added when the catalog was
-- first imported from Loyverse. They were superseded by the origin* fields
-- (originConnectionId, originExternalRef) in the Phase 1 provenance redesign.
-- The sync service now uses only the origin* fields for matching, so the
-- legacy columns and their indexes are no longer needed.

-- ─── CatalogCategory ──────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "catalog_categories_storeId_sourceOfTruthConnectionId_sourceCateg";
ALTER TABLE "catalog_categories"
    DROP COLUMN IF EXISTS "sourceOfTruthConnectionId",
    DROP COLUMN IF EXISTS "sourceCategoryRef";

-- ─── CatalogProduct ───────────────────────────────────────────────────────────

DROP INDEX IF EXISTS "catalog_products_storeId_sourceOfTruthConnectionId_sourceProduct";
ALTER TABLE "catalog_products"
    DROP COLUMN IF EXISTS "sourceOfTruthConnectionId",
    DROP COLUMN IF EXISTS "sourceProductRef";

-- ─── CatalogModifierGroup ─────────────────────────────────────────────────────

DROP INDEX IF EXISTS "catalog_modifier_groups_storeId_sourceOfTruthConnectionId_source";
ALTER TABLE "catalog_modifier_groups"
    DROP COLUMN IF EXISTS "sourceOfTruthConnectionId",
    DROP COLUMN IF EXISTS "sourceModifierGroupRef";

-- ─── CatalogModifierOption ────────────────────────────────────────────────────

DROP INDEX IF EXISTS "catalog_modifier_options_storeId_sourceOfTruthConnectionId_sourc";
ALTER TABLE "catalog_modifier_options"
    DROP COLUMN IF EXISTS "sourceOfTruthConnectionId",
    DROP COLUMN IF EXISTS "sourceModifierOptionRef";
