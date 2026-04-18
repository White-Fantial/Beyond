-- Phase 6: Conflict Detection & Resolution Foundation
-- Adds conflict models, internal change log, and supporting enums.

-- 1. New enums

CREATE TYPE "CatalogConflictType" AS ENUM (
  'FIELD_VALUE_CONFLICT',
  'STRUCTURE_CONFLICT',
  'MISSING_ON_EXTERNAL',
  'MISSING_ON_INTERNAL',
  'PARENT_RELATION_CONFLICT',
  'UNKNOWN_CONFLICT'
);

CREATE TYPE "CatalogConflictStatus" AS ENUM (
  'OPEN',
  'IN_REVIEW',
  'RESOLVED',
  'IGNORED',
  'SUPERSEDED'
);

CREATE TYPE "CatalogConflictResolutionStrategy" AS ENUM (
  'KEEP_INTERNAL',
  'ACCEPT_EXTERNAL',
  'MERGE_MANUALLY',
  'DEFER',
  'IGNORE'
);

CREATE TYPE "CatalogConflictScope" AS ENUM (
  'CATEGORY',
  'PRODUCT',
  'MODIFIER_GROUP',
  'MODIFIER_OPTION',
  'PRODUCT_CATEGORY_LINK',
  'PRODUCT_MODIFIER_GROUP_LINK'
);

-- 2. catalog_conflicts

CREATE TABLE "catalog_conflicts" (
  "id"                  TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "storeId"             TEXT NOT NULL,
  "connectionId"        TEXT NOT NULL,

  "internalEntityType"  "CatalogEntityType" NOT NULL,
  "internalEntityId"    TEXT NOT NULL,

  "externalEntityType"  "CatalogEntityType",
  "externalEntityId"    TEXT,

  "mappingId"           TEXT,
  "externalChangeId"    TEXT,

  "scope"               "CatalogConflictScope" NOT NULL,
  "conflictType"        "CatalogConflictType" NOT NULL,
  "status"              "CatalogConflictStatus" NOT NULL DEFAULT 'OPEN',

  "summary"             TEXT,
  "detectedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  "resolutionStrategy"  "CatalogConflictResolutionStrategy",
  "resolutionNote"      TEXT,
  "resolvedAt"          TIMESTAMP(3),
  "resolvedByUserId"    TEXT,

  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_conflicts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_conflicts_tenantId_storeId_connectionId_status_idx"
  ON "catalog_conflicts" ("tenantId", "storeId", "connectionId", "status");

CREATE INDEX "catalog_conflicts_tenantId_storeId_connectionId_internalEntityType_internalEntityId_idx"
  ON "catalog_conflicts" ("tenantId", "storeId", "connectionId", "internalEntityType", "internalEntityId");

CREATE INDEX "catalog_conflicts_connectionId_externalEntityType_externalEntityId_idx"
  ON "catalog_conflicts" ("connectionId", "externalEntityType", "externalEntityId");

CREATE INDEX "catalog_conflicts_externalChangeId_idx"
  ON "catalog_conflicts" ("externalChangeId");

-- 3. catalog_conflict_fields

CREATE TABLE "catalog_conflict_fields" (
  "id"               TEXT NOT NULL,
  "conflictId"       TEXT NOT NULL,

  "fieldPath"        TEXT NOT NULL,
  "fieldConflictType" TEXT NOT NULL,

  "baselineValue"    JSONB,
  "internalValue"    JSONB,
  "externalValue"    JSONB,

  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalog_conflict_fields_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_conflict_fields_conflictId_idx"
  ON "catalog_conflict_fields" ("conflictId");

ALTER TABLE "catalog_conflict_fields"
  ADD CONSTRAINT "catalog_conflict_fields_conflictId_fkey"
  FOREIGN KEY ("conflictId") REFERENCES "catalog_conflicts"("id") ON DELETE CASCADE;

-- 4. catalog_conflict_resolution_logs

CREATE TABLE "catalog_conflict_resolution_logs" (
  "id"               TEXT NOT NULL,
  "conflictId"       TEXT NOT NULL,

  "previousStatus"   "CatalogConflictStatus",
  "newStatus"        "CatalogConflictStatus" NOT NULL,
  "strategy"         "CatalogConflictResolutionStrategy",
  "note"             TEXT,
  "changedByUserId"  TEXT,

  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalog_conflict_resolution_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_conflict_resolution_logs_conflictId_idx"
  ON "catalog_conflict_resolution_logs" ("conflictId");

ALTER TABLE "catalog_conflict_resolution_logs"
  ADD CONSTRAINT "catalog_conflict_resolution_logs_conflictId_fkey"
  FOREIGN KEY ("conflictId") REFERENCES "catalog_conflicts"("id") ON DELETE CASCADE;

-- 5. internal_catalog_changes

CREATE TABLE "internal_catalog_changes" (
  "id"               TEXT NOT NULL,
  "tenantId"         TEXT NOT NULL,
  "storeId"          TEXT NOT NULL,

  "entityType"       "CatalogEntityType" NOT NULL,
  "internalEntityId" TEXT NOT NULL,

  "fieldPath"        TEXT NOT NULL,
  "previousValue"    JSONB,
  "currentValue"     JSONB,

  "changedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "changedByUserId"  TEXT,

  CONSTRAINT "internal_catalog_changes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "internal_catalog_changes_tenantId_storeId_entityType_internalEntityId_changedAt_idx"
  ON "internal_catalog_changes" ("tenantId", "storeId", "entityType", "internalEntityId", "changedAt");

CREATE INDEX "internal_catalog_changes_tenantId_storeId_changedAt_idx"
  ON "internal_catalog_changes" ("tenantId", "storeId", "changedAt");
