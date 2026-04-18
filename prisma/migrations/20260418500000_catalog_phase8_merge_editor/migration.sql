-- Phase 8: Advanced Manual Merge Editor & Manual Reconciliation Execution
-- Migration: 20260418500000_catalog_phase8_merge_editor

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "CatalogMergeDraftStatus" AS ENUM (
  'DRAFT',
  'VALIDATED',
  'INVALID',
  'PLAN_GENERATED',
  'APPLIED',
  'CANCELLED'
);

CREATE TYPE "CatalogMergeFieldChoice" AS ENUM (
  'TAKE_INTERNAL',
  'TAKE_EXTERNAL',
  'CUSTOM_VALUE'
);

CREATE TYPE "CatalogMergeStructureChoice" AS ENUM (
  'KEEP_INTERNAL_SET',
  'TAKE_EXTERNAL_SET',
  'MERGE_SELECTED',
  'CUSTOM_STRUCTURE'
);

CREATE TYPE "CatalogMergeParentChoice" AS ENUM (
  'KEEP_INTERNAL_PARENT',
  'TAKE_EXTERNAL_PARENT',
  'SET_CUSTOM_PARENT'
);

CREATE TYPE "CatalogMergeApplyTarget" AS ENUM (
  'INTERNAL_ONLY',
  'EXTERNAL_ONLY',
  'INTERNAL_THEN_EXTERNAL'
);

-- ─── catalog_merge_drafts ────────────────────────────────────────────────────

CREATE TABLE "catalog_merge_drafts" (
  "id"                  TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"            TEXT NOT NULL,
  "storeId"             TEXT NOT NULL,
  "connectionId"        TEXT NOT NULL,

  "conflictId"          TEXT,
  "internalEntityType"  "CatalogEntityType" NOT NULL,
  "internalEntityId"    TEXT NOT NULL,

  "externalEntityType"  "CatalogEntityType",
  "externalEntityId"    TEXT,

  "status"              "CatalogMergeDraftStatus" NOT NULL DEFAULT 'DRAFT',
  "applyTarget"         "CatalogMergeApplyTarget" NOT NULL DEFAULT 'INTERNAL_THEN_EXTERNAL',

  "title"               TEXT,
  "summary"             TEXT,
  "validationErrors"    JSONB,
  "generatedPlanId"     TEXT,

  "createdByUserId"     TEXT,
  "updatedByUserId"     TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_merge_drafts_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_merge_drafts_tenantId_storeId_connectionId_status_idx"
  ON "catalog_merge_drafts" ("tenantId", "storeId", "connectionId", "status");

CREATE INDEX "catalog_merge_drafts_conflictId_idx"
  ON "catalog_merge_drafts" ("conflictId");

CREATE INDEX "catalog_merge_drafts_generatedPlanId_idx"
  ON "catalog_merge_drafts" ("generatedPlanId");

-- ─── catalog_merge_draft_fields ──────────────────────────────────────────────

CREATE TABLE "catalog_merge_draft_fields" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "draftId"        TEXT NOT NULL,

  "fieldPath"      TEXT NOT NULL,
  "choice"         "CatalogMergeFieldChoice" NOT NULL,

  "baselineValue"  JSONB,
  "internalValue"  JSONB,
  "externalValue"  JSONB,
  "customValue"    JSONB,

  "resolvedValue"  JSONB,
  "note"           TEXT,

  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_merge_draft_fields_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_merge_draft_fields_draftId_fieldPath_key"
    UNIQUE ("draftId", "fieldPath"),
  CONSTRAINT "catalog_merge_draft_fields_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "catalog_merge_draft_fields_draftId_idx"
  ON "catalog_merge_draft_fields" ("draftId");

-- ─── catalog_merge_draft_structures ──────────────────────────────────────────

CREATE TABLE "catalog_merge_draft_structures" (
  "id"             TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "draftId"        TEXT NOT NULL,

  "fieldPath"      TEXT NOT NULL,
  "choice"         TEXT NOT NULL,

  "baselineValue"  JSONB,
  "internalValue"  JSONB,
  "externalValue"  JSONB,
  "customValue"    JSONB,

  "resolvedValue"  JSONB,
  "note"           TEXT,

  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_merge_draft_structures_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_merge_draft_structures_draftId_fieldPath_key"
    UNIQUE ("draftId", "fieldPath"),
  CONSTRAINT "catalog_merge_draft_structures_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "catalog_merge_draft_structures_draftId_idx"
  ON "catalog_merge_draft_structures" ("draftId");

-- ─── catalog_merge_execution_logs ────────────────────────────────────────────

CREATE TABLE "catalog_merge_execution_logs" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "draftId"          TEXT NOT NULL,
  "generatedPlanId"  TEXT,

  "status"           TEXT NOT NULL,
  "requestPayload"   JSONB,
  "responsePayload"  JSONB,
  "errorMessage"     TEXT,
  "changedByUserId"  TEXT,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalog_merge_execution_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "catalog_merge_execution_logs_draftId_fkey"
    FOREIGN KEY ("draftId") REFERENCES "catalog_merge_drafts" ("id")
    ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "catalog_merge_execution_logs_draftId_idx"
  ON "catalog_merge_execution_logs" ("draftId");

CREATE INDEX "catalog_merge_execution_logs_generatedPlanId_idx"
  ON "catalog_merge_execution_logs" ("generatedPlanId");
