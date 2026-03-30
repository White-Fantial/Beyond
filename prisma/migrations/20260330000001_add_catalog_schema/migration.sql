-- Migration: add_catalog_schema
-- Adds catalog enums, internal catalog tables, external raw mirror tables,
-- channel entity mapping table, and partial unique indexes.

-- ─── Enums ───────────────────────────────────────────────────────────────────

CREATE TYPE "CatalogSourceType" AS ENUM ('POS', 'DELIVERY', 'LOCAL', 'MERGED', 'IMPORTED');
CREATE TYPE "CatalogChannelType" AS ENUM ('LOYVERSE', 'UBER_EATS', 'DOORDASH', 'ONLINE_ORDER', 'SUBSCRIPTION', 'OTHER');
CREATE TYPE "CatalogEntityType" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION');
CREATE TYPE "MappingStatus" AS ENUM ('ACTIVE', 'BROKEN', 'PENDING', 'DISCONNECTED');

-- ─── Internal Catalog: catalog_categories ────────────────────────────────────

CREATE TABLE "catalog_categories" (
    "id"                        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"                  TEXT NOT NULL,
    "storeId"                   TEXT NOT NULL,
    "sourceType"                "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceCategoryRef"         TEXT,
    "name"                      TEXT NOT NULL,
    "description"               TEXT,
    "slug"                      TEXT,
    "displayOrder"              INTEGER NOT NULL DEFAULT 0,
    "isActive"                  BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnOnlineOrder"    BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnSubscription"   BOOLEAN NOT NULL DEFAULT false,
    "imageUrl"                  TEXT,
    "metadata"                  JSONB NOT NULL DEFAULT '{}',
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,
    "deletedAt"                 TIMESTAMP(3),
    CONSTRAINT "catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_categories_tenantId_storeId_idx" ON "catalog_categories"("tenantId", "storeId");
CREATE INDEX "catalog_categories_storeId_isActive_isVisibleOnOnlineOrder_dis_idx" ON "catalog_categories"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");
CREATE INDEX "catalog_categories_storeId_sourceOfTruthConnectionId_sourceCat_idx" ON "catalog_categories"("storeId", "sourceOfTruthConnectionId", "sourceCategoryRef");

-- Partial unique index: active source-of-truth category refs must be unique per store+connection
CREATE UNIQUE INDEX "catalog_categories_store_sotconn_ref_unique"
    ON "catalog_categories"("storeId", "sourceOfTruthConnectionId", "sourceCategoryRef")
    WHERE "deletedAt" IS NULL AND "sourceCategoryRef" IS NOT NULL;

-- ─── Internal Catalog: catalog_products ──────────────────────────────────────

CREATE TABLE "catalog_products" (
    "id"                        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"                  TEXT NOT NULL,
    "storeId"                   TEXT NOT NULL,
    "sourceType"                "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceProductRef"          TEXT,
    "sku"                       TEXT,
    "barcode"                   TEXT,
    "name"                      TEXT NOT NULL,
    "description"               TEXT,
    "shortDescription"          TEXT,
    "basePriceAmount"           INTEGER NOT NULL DEFAULT 0,
    "currency"                  TEXT NOT NULL DEFAULT 'NZD',
    "imageUrl"                  TEXT,
    "displayOrder"              INTEGER NOT NULL DEFAULT 0,
    "isActive"                  BOOLEAN NOT NULL DEFAULT true,
    "isSellable"                BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnOnlineOrder"    BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnSubscription"   BOOLEAN NOT NULL DEFAULT false,
    "isFeatured"                BOOLEAN NOT NULL DEFAULT false,
    "posName"                   TEXT,
    "onlineName"                TEXT,
    "subscriptionName"          TEXT,
    "internalNote"              TEXT,
    "metadata"                  JSONB NOT NULL DEFAULT '{}',
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,
    "deletedAt"                 TIMESTAMP(3),
    CONSTRAINT "catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_products_tenantId_storeId_idx" ON "catalog_products"("tenantId", "storeId");
CREATE INDEX "catalog_products_storeId_isActive_isVisibleOnOnlineOrder_displ_idx" ON "catalog_products"("storeId", "isActive", "isVisibleOnOnlineOrder", "displayOrder");
CREATE INDEX "catalog_products_storeId_sourceOfTruthConnectionId_sourceProdu_idx" ON "catalog_products"("storeId", "sourceOfTruthConnectionId", "sourceProductRef");
CREATE INDEX "catalog_products_storeId_name_idx" ON "catalog_products"("storeId", "name");

-- Partial unique index: active source-of-truth product refs must be unique per store+connection
CREATE UNIQUE INDEX "catalog_products_store_sotconn_ref_unique"
    ON "catalog_products"("storeId", "sourceOfTruthConnectionId", "sourceProductRef")
    WHERE "deletedAt" IS NULL AND "sourceProductRef" IS NOT NULL;

-- ─── Internal Catalog: catalog_product_categories ────────────────────────────

CREATE TABLE "catalog_product_categories" (
    "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"   TEXT NOT NULL,
    "storeId"    TEXT NOT NULL,
    "productId"  TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sortOrder"  INTEGER NOT NULL DEFAULT 0,
    "isPrimary"  BOOLEAN NOT NULL DEFAULT false,
    "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "catalog_product_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_product_categories_productId_categoryId_key" ON "catalog_product_categories"("productId", "categoryId");
CREATE INDEX "catalog_product_categories_storeId_categoryId_sortOrder_idx" ON "catalog_product_categories"("storeId", "categoryId", "sortOrder");
CREATE INDEX "catalog_product_categories_storeId_productId_idx" ON "catalog_product_categories"("storeId", "productId");

ALTER TABLE "catalog_product_categories"
    ADD CONSTRAINT "catalog_product_categories_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_product_categories"
    ADD CONSTRAINT "catalog_product_categories_categoryId_fkey"
        FOREIGN KEY ("categoryId") REFERENCES "catalog_categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Internal Catalog: catalog_modifier_groups ───────────────────────────────

CREATE TABLE "catalog_modifier_groups" (
    "id"                        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"                  TEXT NOT NULL,
    "storeId"                   TEXT NOT NULL,
    "sourceType"                "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceModifierGroupRef"    TEXT,
    "name"                      TEXT NOT NULL,
    "description"               TEXT,
    "selectionMin"              INTEGER NOT NULL DEFAULT 0,
    "selectionMax"              INTEGER,
    "isRequired"                BOOLEAN NOT NULL DEFAULT false,
    "displayOrder"              INTEGER NOT NULL DEFAULT 0,
    "isActive"                  BOOLEAN NOT NULL DEFAULT true,
    "isVisibleOnOnlineOrder"    BOOLEAN NOT NULL DEFAULT true,
    "metadata"                  JSONB NOT NULL DEFAULT '{}',
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,
    "deletedAt"                 TIMESTAMP(3),
    CONSTRAINT "catalog_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_modifier_groups_tenantId_storeId_idx" ON "catalog_modifier_groups"("tenantId", "storeId");
CREATE INDEX "catalog_modifier_groups_storeId_sourceOfTruthConnectionId_sour_idx" ON "catalog_modifier_groups"("storeId", "sourceOfTruthConnectionId", "sourceModifierGroupRef");
CREATE INDEX "catalog_modifier_groups_storeId_isActive_displayOrder_idx" ON "catalog_modifier_groups"("storeId", "isActive", "displayOrder");

-- Partial unique index: active source-of-truth modifier group refs must be unique per store+connection
CREATE UNIQUE INDEX "catalog_modifier_groups_store_sotconn_ref_unique"
    ON "catalog_modifier_groups"("storeId", "sourceOfTruthConnectionId", "sourceModifierGroupRef")
    WHERE "deletedAt" IS NULL AND "sourceModifierGroupRef" IS NOT NULL;

-- ─── Internal Catalog: catalog_modifier_options ──────────────────────────────

CREATE TABLE "catalog_modifier_options" (
    "id"                        TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"                  TEXT NOT NULL,
    "storeId"                   TEXT NOT NULL,
    "modifierGroupId"           TEXT NOT NULL,
    "sourceType"                "CatalogSourceType" NOT NULL,
    "sourceOfTruthConnectionId" TEXT,
    "sourceModifierOptionRef"   TEXT,
    "name"                      TEXT NOT NULL,
    "description"               TEXT,
    "priceDeltaAmount"          INTEGER NOT NULL DEFAULT 0,
    "currency"                  TEXT NOT NULL DEFAULT 'NZD',
    "displayOrder"              INTEGER NOT NULL DEFAULT 0,
    "isDefault"                 BOOLEAN NOT NULL DEFAULT false,
    "isActive"                  BOOLEAN NOT NULL DEFAULT true,
    "isSoldOut"                 BOOLEAN NOT NULL DEFAULT false,
    "metadata"                  JSONB NOT NULL DEFAULT '{}',
    "createdAt"                 TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"                 TIMESTAMP(3) NOT NULL,
    "deletedAt"                 TIMESTAMP(3),
    CONSTRAINT "catalog_modifier_options_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_modifier_options_tenantId_storeId_idx" ON "catalog_modifier_options"("tenantId", "storeId");
CREATE INDEX "catalog_modifier_options_modifierGroupId_isActive_isSoldOut_di_idx" ON "catalog_modifier_options"("modifierGroupId", "isActive", "isSoldOut", "displayOrder");
CREATE INDEX "catalog_modifier_options_storeId_sourceOfTruthConnectionId_sou_idx" ON "catalog_modifier_options"("storeId", "sourceOfTruthConnectionId", "sourceModifierOptionRef");

-- Partial unique index: active source-of-truth modifier option refs must be unique per store+connection
CREATE UNIQUE INDEX "catalog_modifier_options_store_sotconn_ref_unique"
    ON "catalog_modifier_options"("storeId", "sourceOfTruthConnectionId", "sourceModifierOptionRef")
    WHERE "deletedAt" IS NULL AND "sourceModifierOptionRef" IS NOT NULL;

ALTER TABLE "catalog_modifier_options"
    ADD CONSTRAINT "catalog_modifier_options_modifierGroupId_fkey"
        FOREIGN KEY ("modifierGroupId") REFERENCES "catalog_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── Internal Catalog: catalog_product_modifier_groups ───────────────────────

CREATE TABLE "catalog_product_modifier_groups" (
    "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"            TEXT NOT NULL,
    "storeId"             TEXT NOT NULL,
    "productId"           TEXT NOT NULL,
    "modifierGroupId"     TEXT NOT NULL,
    "displayOrder"        INTEGER NOT NULL DEFAULT 0,
    "overrideSelectionMin" INTEGER,
    "overrideSelectionMax" INTEGER,
    "overrideRequired"    BOOLEAN,
    "isActive"            BOOLEAN NOT NULL DEFAULT true,
    "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"           TIMESTAMP(3) NOT NULL,
    CONSTRAINT "catalog_product_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "catalog_product_modifier_groups_productId_modifierGroupId_key" ON "catalog_product_modifier_groups"("productId", "modifierGroupId");
CREATE INDEX "catalog_product_modifier_groups_storeId_productId_displayOrder_idx" ON "catalog_product_modifier_groups"("storeId", "productId", "displayOrder");
CREATE INDEX "catalog_product_modifier_groups_storeId_modifierGroupId_idx" ON "catalog_product_modifier_groups"("storeId", "modifierGroupId");

ALTER TABLE "catalog_product_modifier_groups"
    ADD CONSTRAINT "catalog_product_modifier_groups_productId_fkey"
        FOREIGN KEY ("productId") REFERENCES "catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "catalog_product_modifier_groups"
    ADD CONSTRAINT "catalog_product_modifier_groups_modifierGroupId_fkey"
        FOREIGN KEY ("modifierGroupId") REFERENCES "catalog_modifier_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── External Mirror: external_catalog_categories ────────────────────────────

CREATE TABLE "external_catalog_categories" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"          TEXT NOT NULL,
    "storeId"           TEXT NOT NULL,
    "connectionId"      TEXT NOT NULL,
    "channelType"       "CatalogChannelType" NOT NULL,
    "externalId"        TEXT NOT NULL,
    "externalParentId"  TEXT,
    "normalizedName"    TEXT,
    "rawPayload"        JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum"      TEXT,
    "lastSyncedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_catalog_categories_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_catalog_categories_connectionId_externalId_key" ON "external_catalog_categories"("connectionId", "externalId");
CREATE INDEX "external_catalog_categories_storeId_connectionId_idx" ON "external_catalog_categories"("storeId", "connectionId");

-- ─── External Mirror: external_catalog_products ──────────────────────────────

CREATE TABLE "external_catalog_products" (
    "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"              TEXT NOT NULL,
    "storeId"               TEXT NOT NULL,
    "connectionId"          TEXT NOT NULL,
    "channelType"           "CatalogChannelType" NOT NULL,
    "externalId"            TEXT NOT NULL,
    "externalParentId"      TEXT,
    "normalizedName"        TEXT,
    "normalizedPriceAmount" INTEGER,
    "rawPayload"            JSONB NOT NULL,
    "externalUpdatedAt"     TIMESTAMP(3),
    "syncChecksum"          TEXT,
    "lastSyncedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_catalog_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_catalog_products_connectionId_externalId_key" ON "external_catalog_products"("connectionId", "externalId");
CREATE INDEX "external_catalog_products_storeId_connectionId_idx" ON "external_catalog_products"("storeId", "connectionId");

-- ─── External Mirror: external_catalog_modifier_groups ───────────────────────

CREATE TABLE "external_catalog_modifier_groups" (
    "id"                TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"          TEXT NOT NULL,
    "storeId"           TEXT NOT NULL,
    "connectionId"      TEXT NOT NULL,
    "channelType"       "CatalogChannelType" NOT NULL,
    "externalId"        TEXT NOT NULL,
    "externalParentId"  TEXT,
    "normalizedName"    TEXT,
    "rawPayload"        JSONB NOT NULL,
    "externalUpdatedAt" TIMESTAMP(3),
    "syncChecksum"      TEXT,
    "lastSyncedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"         TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_catalog_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_catalog_modifier_groups_connectionId_externalId_key" ON "external_catalog_modifier_groups"("connectionId", "externalId");
CREATE INDEX "external_catalog_modifier_groups_storeId_connectionId_idx" ON "external_catalog_modifier_groups"("storeId", "connectionId");

-- ─── External Mirror: external_catalog_modifier_options ──────────────────────

CREATE TABLE "external_catalog_modifier_options" (
    "id"                    TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"              TEXT NOT NULL,
    "storeId"               TEXT NOT NULL,
    "connectionId"          TEXT NOT NULL,
    "channelType"           "CatalogChannelType" NOT NULL,
    "externalId"            TEXT NOT NULL,
    "externalParentId"      TEXT,
    "normalizedName"        TEXT,
    "normalizedPriceAmount" INTEGER,
    "rawPayload"            JSONB NOT NULL,
    "externalUpdatedAt"     TIMESTAMP(3),
    "syncChecksum"          TEXT,
    "lastSyncedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_catalog_modifier_options_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "external_catalog_modifier_options_connectionId_externalId_key" ON "external_catalog_modifier_options"("connectionId", "externalId");
CREATE INDEX "external_catalog_modifier_options_storeId_connectionId_idx" ON "external_catalog_modifier_options"("storeId", "connectionId");

-- ─── External Mirror: external_catalog_product_modifier_group_links ──────────

CREATE TABLE "external_catalog_product_modifier_group_links" (
    "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"                TEXT NOT NULL,
    "storeId"                 TEXT NOT NULL,
    "connectionId"            TEXT NOT NULL,
    "channelType"             "CatalogChannelType" NOT NULL,
    "externalProductId"       TEXT NOT NULL,
    "externalModifierGroupId" TEXT NOT NULL,
    "rawPayload"              JSONB,
    "lastSyncedAt"            TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"               TIMESTAMP(3) NOT NULL,
    CONSTRAINT "external_catalog_product_modifier_group_links_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ext_cat_pmg_links_conn_prod_mg_key"
    ON "external_catalog_product_modifier_group_links"("connectionId", "externalProductId", "externalModifierGroupId");
CREATE INDEX "ext_cat_pmg_links_storeId_connectionId_externalProductId_idx"
    ON "external_catalog_product_modifier_group_links"("storeId", "connectionId", "externalProductId");

-- ─── Channel Entity Mappings ──────────────────────────────────────────────────

CREATE TABLE "channel_entity_mappings" (
    "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    "tenantId"         TEXT NOT NULL,
    "storeId"          TEXT NOT NULL,
    "entityType"       "CatalogEntityType" NOT NULL,
    "internalEntityId" TEXT NOT NULL,
    "connectionId"     TEXT NOT NULL,
    "channelType"      "CatalogChannelType" NOT NULL,
    "externalEntityId" TEXT NOT NULL,
    "externalParentId" TEXT,
    "mappingStatus"    "MappingStatus" NOT NULL DEFAULT 'ACTIVE',
    "lastVerifiedAt"   TIMESTAMP(3),
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "channel_entity_mappings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "channel_entity_mappings_connectionId_entityType_externalEntityId_key"
    ON "channel_entity_mappings"("connectionId", "entityType", "externalEntityId");
CREATE UNIQUE INDEX "channel_entity_mappings_connectionId_entityType_internalEntityId_key"
    ON "channel_entity_mappings"("connectionId", "entityType", "internalEntityId");
CREATE INDEX "channel_entity_mappings_storeId_entityType_internalEntityId_idx"
    ON "channel_entity_mappings"("storeId", "entityType", "internalEntityId");
CREATE INDEX "channel_entity_mappings_storeId_connectionId_entityType_idx"
    ON "channel_entity_mappings"("storeId", "connectionId", "entityType");
