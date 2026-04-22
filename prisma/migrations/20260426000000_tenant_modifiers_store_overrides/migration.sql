-- Migration: tenant_modifiers_store_overrides
-- Feature 1: TenantModifierGroup / TenantModifierOption / TenantProductModifierGroup
-- Feature 4: StoreCategorySelection (store-level override for tenant categories)
-- Feature 5: StoreModifierGroupSelection (store-level override for tenant modifier groups)

-- ─── Feature 1: Tenant Modifier Groups ───────────────────────────────────────

CREATE TABLE "tenant_modifier_groups" (
    "id"            TEXT        NOT NULL,
    "tenantId"      TEXT        NOT NULL,
    "name"          TEXT        NOT NULL,
    "description"   TEXT,
    "selectionMin"  INTEGER     NOT NULL DEFAULT 0,
    "selectionMax"  INTEGER,
    "isRequired"    BOOLEAN     NOT NULL DEFAULT false,
    "displayOrder"  INTEGER     NOT NULL DEFAULT 0,
    "isActive"      BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    "deletedAt"     TIMESTAMP(3),

    CONSTRAINT "tenant_modifier_groups_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_modifier_options" (
    "id"                    TEXT        NOT NULL,
    "tenantId"              TEXT        NOT NULL,
    "tenantModifierGroupId" TEXT        NOT NULL,
    "name"                  TEXT        NOT NULL,
    "priceDeltaAmount"      INTEGER     NOT NULL DEFAULT 0,
    "currency"              TEXT        NOT NULL DEFAULT 'USD',
    "displayOrder"          INTEGER     NOT NULL DEFAULT 0,
    "isDefault"             BOOLEAN     NOT NULL DEFAULT false,
    "isActive"              BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,
    "deletedAt"             TIMESTAMP(3),

    CONSTRAINT "tenant_modifier_options_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "tenant_product_modifier_groups" (
    "id"                    TEXT        NOT NULL,
    "tenantId"              TEXT        NOT NULL,
    "tenantProductId"       TEXT        NOT NULL,
    "tenantModifierGroupId" TEXT        NOT NULL,
    "displayOrder"          INTEGER     NOT NULL DEFAULT 0,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_product_modifier_groups_pkey" PRIMARY KEY ("id")
);

-- ─── Feature 4: Store Category Selections ────────────────────────────────────

CREATE TABLE "store_category_selections" (
    "id"                    TEXT        NOT NULL,
    "tenantId"              TEXT        NOT NULL,
    "storeId"               TEXT        NOT NULL,
    "tenantCategoryId"      TEXT        NOT NULL,
    "isEnabled"             BOOLEAN     NOT NULL DEFAULT true,
    "displayOrderOverride"  INTEGER,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_category_selections_pkey" PRIMARY KEY ("id")
);

-- ─── Feature 5: Store Modifier Group Selections ───────────────────────────────

CREATE TABLE "store_modifier_group_selections" (
    "id"                    TEXT        NOT NULL,
    "tenantId"              TEXT        NOT NULL,
    "storeId"               TEXT        NOT NULL,
    "tenantModifierGroupId" TEXT        NOT NULL,
    "isEnabled"             BOOLEAN     NOT NULL DEFAULT true,
    "displayOrderOverride"  INTEGER,
    "createdAt"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"             TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_modifier_group_selections_pkey" PRIMARY KEY ("id")
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────

CREATE INDEX "tenant_modifier_groups_tenantId_isActive_displayOrder_idx"
    ON "tenant_modifier_groups"("tenantId", "isActive", "displayOrder");

CREATE INDEX "tenant_modifier_groups_tenantId_name_idx"
    ON "tenant_modifier_groups"("tenantId", "name");

CREATE INDEX "tenant_modifier_options_tenantModifierGroupId_isActive_displayOrder_idx"
    ON "tenant_modifier_options"("tenantModifierGroupId", "isActive", "displayOrder");

CREATE UNIQUE INDEX "tenant_product_modifier_groups_tenantProductId_tenantModifierGroupId_key"
    ON "tenant_product_modifier_groups"("tenantProductId", "tenantModifierGroupId");

CREATE INDEX "tenant_product_modifier_groups_tenantProductId_displayOrder_idx"
    ON "tenant_product_modifier_groups"("tenantProductId", "displayOrder");

CREATE UNIQUE INDEX "store_category_selections_storeId_tenantCategoryId_key"
    ON "store_category_selections"("storeId", "tenantCategoryId");

CREATE INDEX "store_category_selections_tenantId_storeId_idx"
    ON "store_category_selections"("tenantId", "storeId");

CREATE UNIQUE INDEX "store_modifier_group_selections_storeId_tenantModifierGroupId_key"
    ON "store_modifier_group_selections"("storeId", "tenantModifierGroupId");

CREATE INDEX "store_modifier_group_selections_tenantId_storeId_idx"
    ON "store_modifier_group_selections"("tenantId", "storeId");

-- ─── Foreign Keys ─────────────────────────────────────────────────────────────

ALTER TABLE "tenant_modifier_options"
    ADD CONSTRAINT "tenant_modifier_options_tenantModifierGroupId_fkey"
    FOREIGN KEY ("tenantModifierGroupId")
    REFERENCES "tenant_modifier_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_product_modifier_groups"
    ADD CONSTRAINT "tenant_product_modifier_groups_tenantProductId_fkey"
    FOREIGN KEY ("tenantProductId")
    REFERENCES "tenant_catalog_products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "tenant_product_modifier_groups"
    ADD CONSTRAINT "tenant_product_modifier_groups_tenantModifierGroupId_fkey"
    FOREIGN KEY ("tenantModifierGroupId")
    REFERENCES "tenant_modifier_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_category_selections"
    ADD CONSTRAINT "store_category_selections_tenantCategoryId_fkey"
    FOREIGN KEY ("tenantCategoryId")
    REFERENCES "tenant_product_categories"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "store_modifier_group_selections"
    ADD CONSTRAINT "store_modifier_group_selections_tenantModifierGroupId_fkey"
    FOREIGN KEY ("tenantModifierGroupId")
    REFERENCES "tenant_modifier_groups"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
