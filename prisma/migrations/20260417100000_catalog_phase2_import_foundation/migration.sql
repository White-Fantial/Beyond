-- Phase 2: External Catalog Import Foundation
--
-- Adds two new tables:
--   catalog_import_runs        — tracks each full catalog import run per channel connection
--   external_catalog_snapshots — immutable raw payload snapshot per entity per run
--
-- Enhances existing external_catalog_* tables with:
--   entityHash  — SHA-256 fingerprint of normalised key fields (for future diff)
--   importRunId — which import run last upserted this row

-- ─── catalog_import_runs ─────────────────────────────────────────────────────

CREATE TABLE "catalog_import_runs" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "storeId"      TEXT NOT NULL,
  "connectionId" TEXT NOT NULL,
  "provider"     TEXT NOT NULL,
  "status"       TEXT NOT NULL,
  "startedAt"    TIMESTAMP(3) NOT NULL,
  "completedAt"  TIMESTAMP(3),
  "importedCategoriesCount"      INTEGER NOT NULL DEFAULT 0,
  "importedProductsCount"        INTEGER NOT NULL DEFAULT 0,
  "importedModifierGroupsCount"  INTEGER NOT NULL DEFAULT 0,
  "importedModifierOptionsCount" INTEGER NOT NULL DEFAULT 0,
  "errorMessage" TEXT,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "catalog_import_runs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_import_runs_tenantId_storeId_createdAt_idx"
  ON "catalog_import_runs" ("tenantId", "storeId", "createdAt");

CREATE INDEX "catalog_import_runs_connectionId_status_idx"
  ON "catalog_import_runs" ("connectionId", "status");

-- ─── external_catalog_snapshots ──────────────────────────────────────────────

CREATE TABLE "external_catalog_snapshots" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "storeId"          TEXT NOT NULL,
  "connectionId"     TEXT NOT NULL,
  "entityType"       TEXT NOT NULL,
  "externalEntityId" TEXT NOT NULL,
  "payload"          JSONB NOT NULL,
  "payloadChecksum"  TEXT NOT NULL,
  "fetchedAt"        TIMESTAMP(3) NOT NULL,
  "importRunId"      TEXT NOT NULL,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "external_catalog_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "external_catalog_snapshots_connectionId_entityType_externalEntityId_idx"
  ON "external_catalog_snapshots" ("connectionId", "entityType", "externalEntityId");

CREATE INDEX "external_catalog_snapshots_importRunId_idx"
  ON "external_catalog_snapshots" ("importRunId");

ALTER TABLE "external_catalog_snapshots"
  ADD CONSTRAINT "external_catalog_snapshots_importRunId_fkey"
  FOREIGN KEY ("importRunId")
  REFERENCES "catalog_import_runs" ("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── Enhance external_catalog_categories ─────────────────────────────────────

ALTER TABLE "external_catalog_categories"
  ADD COLUMN "entityHash"  TEXT,
  ADD COLUMN "importRunId" TEXT;

-- ─── Enhance external_catalog_products ───────────────────────────────────────

ALTER TABLE "external_catalog_products"
  ADD COLUMN "entityHash"  TEXT,
  ADD COLUMN "importRunId" TEXT;

-- ─── Enhance external_catalog_modifier_groups ─────────────────────────────────

ALTER TABLE "external_catalog_modifier_groups"
  ADD COLUMN "entityHash"  TEXT,
  ADD COLUMN "importRunId" TEXT;

-- ─── Enhance external_catalog_modifier_options ────────────────────────────────

ALTER TABLE "external_catalog_modifier_options"
  ADD COLUMN "entityHash"  TEXT,
  ADD COLUMN "importRunId" TEXT;
