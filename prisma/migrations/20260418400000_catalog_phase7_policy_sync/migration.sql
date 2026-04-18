-- Migration: catalog_phase7_policy_sync
-- Phase 7 — Policy-based Controlled Two-way Sync

-- ─── New enums ────────────────────────────────────────────────────────────────

CREATE TYPE "CatalogSyncDirection" AS ENUM (
  'INTERNAL_TO_EXTERNAL',
  'EXTERNAL_TO_INTERNAL',
  'BIDIRECTIONAL',
  'DISABLED'
);

CREATE TYPE "CatalogSyncConflictStrategy" AS ENUM (
  'MANUAL_REVIEW',
  'PREFER_INTERNAL',
  'PREFER_EXTERNAL',
  'LAST_WRITE_WINS'
);

CREATE TYPE "CatalogSyncAutoApplyMode" AS ENUM (
  'NEVER',
  'SAFE_ONLY',
  'ALWAYS'
);

CREATE TYPE "CatalogSyncPolicyScope" AS ENUM (
  'CATEGORY',
  'PRODUCT',
  'MODIFIER_GROUP',
  'MODIFIER_OPTION',
  'PRODUCT_CATEGORY_LINK',
  'PRODUCT_MODIFIER_GROUP_LINK'
);

CREATE TYPE "CatalogSyncPlanStatus" AS ENUM (
  'DRAFT',
  'READY',
  'PARTIALLY_BLOCKED',
  'BLOCKED',
  'APPLIED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "CatalogSyncAction" AS ENUM (
  'APPLY_INTERNAL_PATCH',
  'APPLY_EXTERNAL_PATCH',
  'CREATE_INTERNAL_ENTITY',
  'CREATE_EXTERNAL_ENTITY',
  'ARCHIVE_INTERNAL_ENTITY',
  'ARCHIVE_EXTERNAL_ENTITY',
  'LINK_MAPPING',
  'UNLINK_MAPPING',
  'SKIP'
);

CREATE TYPE "CatalogSyncItemStatus" AS ENUM (
  'PENDING',
  'READY',
  'BLOCKED',
  'APPLIED',
  'FAILED',
  'SKIPPED'
);

-- ─── catalog_sync_policies ────────────────────────────────────────────────────

CREATE TABLE "catalog_sync_policies" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"         TEXT NOT NULL,
  "storeId"          TEXT NOT NULL,
  "connectionId"     TEXT NOT NULL,
  "scope"            "CatalogSyncPolicyScope" NOT NULL,
  "fieldPath"        TEXT,
  "direction"        "CatalogSyncDirection" NOT NULL,
  "conflictStrategy" "CatalogSyncConflictStrategy" NOT NULL,
  "autoApplyMode"    "CatalogSyncAutoApplyMode" NOT NULL,
  "isEnabled"        BOOLEAN NOT NULL DEFAULT true,
  "priority"         INTEGER NOT NULL DEFAULT 100,
  "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_sync_policies_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_sync_policies_tenantId_storeId_connectionId_scope_isEnabled_idx"
  ON "catalog_sync_policies"("tenantId", "storeId", "connectionId", "scope", "isEnabled");

CREATE INDEX "catalog_sync_policies_tenantId_storeId_connectionId_fieldPath_idx"
  ON "catalog_sync_policies"("tenantId", "storeId", "connectionId", "fieldPath");

-- ─── catalog_sync_plans ───────────────────────────────────────────────────────

CREATE TABLE "catalog_sync_plans" (
  "id"                      TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "tenantId"                TEXT NOT NULL,
  "storeId"                 TEXT NOT NULL,
  "connectionId"            TEXT NOT NULL,
  "source"                  TEXT,
  "status"                  "CatalogSyncPlanStatus" NOT NULL DEFAULT 'DRAFT',
  "basedOnImportRunId"      TEXT,
  "basedOnExternalChangeId" TEXT,
  "basedOnConflictId"       TEXT,
  "summary"                 TEXT,
  "createdByUserId"         TEXT,
  "createdAt"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"               TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_sync_plans_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_sync_plans_tenantId_storeId_connectionId_status_idx"
  ON "catalog_sync_plans"("tenantId", "storeId", "connectionId", "status");

-- ─── catalog_sync_plan_items ──────────────────────────────────────────────────

CREATE TABLE "catalog_sync_plan_items" (
  "id"                 TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "planId"             TEXT NOT NULL,
  "internalEntityType" "CatalogEntityType",
  "internalEntityId"   TEXT,
  "externalEntityType" "CatalogEntityType",
  "externalEntityId"   TEXT,
  "scope"              "CatalogSyncPolicyScope" NOT NULL,
  "fieldPath"          TEXT,
  "action"             "CatalogSyncAction" NOT NULL,
  "direction"          "CatalogSyncDirection",
  "status"             "CatalogSyncItemStatus" NOT NULL DEFAULT 'PENDING',
  "blockedReason"      TEXT,
  "previewBeforeValue" JSONB,
  "previewAfterValue"  JSONB,
  "mappingId"          TEXT,
  "externalChangeId"   TEXT,
  "conflictId"         TEXT,
  "publishJobId"       TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "catalog_sync_plan_items_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_sync_plan_items_planId_status_idx"
  ON "catalog_sync_plan_items"("planId", "status");

CREATE INDEX "catalog_sync_plan_items_conflictId_idx"
  ON "catalog_sync_plan_items"("conflictId");

CREATE INDEX "catalog_sync_plan_items_externalChangeId_idx"
  ON "catalog_sync_plan_items"("externalChangeId");

ALTER TABLE "catalog_sync_plan_items"
  ADD CONSTRAINT "catalog_sync_plan_items_planId_fkey"
  FOREIGN KEY ("planId") REFERENCES "catalog_sync_plans"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── catalog_sync_execution_logs ─────────────────────────────────────────────

CREATE TABLE "catalog_sync_execution_logs" (
  "id"              TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "planId"          TEXT NOT NULL,
  "planItemId"      TEXT,
  "status"          TEXT NOT NULL,
  "action"          "CatalogSyncAction" NOT NULL,
  "requestPayload"  JSONB,
  "responsePayload" JSONB,
  "errorMessage"    TEXT,
  "errorCode"       TEXT,
  "startedAt"       TIMESTAMP(3),
  "completedAt"     TIMESTAMP(3),
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "catalog_sync_execution_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "catalog_sync_execution_logs_planId_idx"
  ON "catalog_sync_execution_logs"("planId");

CREATE INDEX "catalog_sync_execution_logs_planItemId_idx"
  ON "catalog_sync_execution_logs"("planItemId");

-- ─── Alter internal_catalog_changes ──────────────────────────────────────────

ALTER TABLE "internal_catalog_changes"
  ADD COLUMN "changeSource" TEXT;
