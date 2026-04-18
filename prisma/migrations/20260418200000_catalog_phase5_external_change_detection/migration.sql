-- Phase 5: External Change Detection
-- Adds diff-status fields to catalog_import_runs,
-- importRunId to link table,
-- and new tables: external_catalog_changes + external_catalog_change_fields.

-- 1. Extend catalog_import_runs with diff tracking fields
ALTER TABLE "catalog_import_runs"
  ADD COLUMN IF NOT EXISTS "comparedToImportRunId" TEXT,
  ADD COLUMN IF NOT EXISTS "diffStatus"            TEXT,
  ADD COLUMN IF NOT EXISTS "diffCompletedAt"       TIMESTAMP(3);

-- 2. Extend product-modifier-group link table with importRunId for deletion detection
ALTER TABLE "external_catalog_product_modifier_group_links"
  ADD COLUMN IF NOT EXISTS "importRunId" TEXT;

-- 3. New enums
CREATE TYPE "ExternalCatalogChangeKind" AS ENUM (
  'CREATED',
  'UPDATED',
  'DELETED',
  'RELINKED',
  'STRUCTURE_UPDATED'
);

CREATE TYPE "ExternalCatalogChangeStatus" AS ENUM (
  'OPEN',
  'ACKNOWLEDGED',
  'IGNORED',
  'SUPERSEDED'
);

-- 4. External catalog change log
CREATE TABLE "external_catalog_changes" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "storeId"             TEXT NOT NULL,
  "connectionId"        TEXT NOT NULL,

  "entityType"          "CatalogEntityType" NOT NULL,
  "externalEntityId"    TEXT NOT NULL,

  "internalEntityId"    TEXT,
  "mappingId"           TEXT,

  "changeKind"          "ExternalCatalogChangeKind" NOT NULL,
  "status"              "ExternalCatalogChangeStatus" NOT NULL DEFAULT 'OPEN',

  "previousEntityHash"  TEXT,
  "currentEntityHash"   TEXT,

  "importRunId"         TEXT NOT NULL,
  "comparedImportRunId" TEXT,

  "summary"             TEXT,
  "detectedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acknowledgedAt"      TIMESTAMP(3),
  "ignoredAt"           TIMESTAMP(3),

  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "external_catalog_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_catalog_changes_tenantId_storeId_connectionId_status_idx"
  ON "external_catalog_changes" ("tenantId", "storeId", "connectionId", "status");

CREATE INDEX "external_catalog_changes_tenantId_storeId_connectionId_entityType_idx"
  ON "external_catalog_changes" ("tenantId", "storeId", "connectionId", "entityType");

CREATE INDEX "external_catalog_changes_connectionId_externalEntityId_entityType_idx"
  ON "external_catalog_changes" ("connectionId", "externalEntityId", "entityType");

CREATE INDEX "external_catalog_changes_importRunId_idx"
  ON "external_catalog_changes" ("importRunId");

-- 5. Field-level diff log
CREATE TABLE "external_catalog_change_fields" (
  "id"            TEXT NOT NULL,
  "changeId"      TEXT NOT NULL,
  "fieldPath"     TEXT NOT NULL,
  "previousValue" JSONB,
  "currentValue"  JSONB,
  "changeType"    TEXT NOT NULL,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "external_catalog_change_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_catalog_change_fields_changeId_idx"
  ON "external_catalog_change_fields" ("changeId");

ALTER TABLE "external_catalog_change_fields"
  ADD CONSTRAINT "external_catalog_change_fields_changeId_fkey"
  FOREIGN KEY ("changeId")
  REFERENCES "external_catalog_changes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
