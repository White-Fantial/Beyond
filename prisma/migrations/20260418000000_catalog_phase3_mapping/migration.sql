-- Phase 3: Catalog Mapping & Linking Stabilization
--
-- Replaces the placeholder channel_entity_mappings table with the full
-- Phase 3 mapping layer that supports:
--   • AUTO / MANUAL / IMPORT_SEEDED mapping sources
--   • ACTIVE / NEEDS_REVIEW / UNMATCHED / BROKEN / ARCHIVED statuses
--   • confidence scoring and match reason tracking
--   • Partial unique indexes enforcing:
--       - one active external entity → at most one active internal entity (per connection + entityType)
--       - one active internal entity → at most one active external entity (per connection + entityType)
--     UNMATCHED and ARCHIVED rows are exempt from these uniqueness rules.

-- ─── New enums ────────────────────────────────────────────────────────────────

CREATE TYPE "CatalogMappingStatus" AS ENUM (
  'ACTIVE',
  'NEEDS_REVIEW',
  'UNMATCHED',
  'BROKEN',
  'ARCHIVED'
);

CREATE TYPE "CatalogMappingSource" AS ENUM (
  'AUTO',
  'MANUAL',
  'IMPORT_SEEDED'
);

-- ─── Drop old placeholder table ───────────────────────────────────────────────

DROP TABLE IF EXISTS "channel_entity_mappings";

-- ─── Create new channel_entity_mappings table ─────────────────────────────────

CREATE TABLE "channel_entity_mappings" (
  "id"                 TEXT NOT NULL,
  "tenantId"           TEXT NOT NULL,
  "storeId"            TEXT NOT NULL,
  "connectionId"       TEXT NOT NULL,

  "internalEntityType" "CatalogEntityType" NOT NULL,
  "internalEntityId"   TEXT NOT NULL,

  "externalEntityType" "CatalogEntityType" NOT NULL,
  "externalEntityId"   TEXT NOT NULL,

  "status"             "CatalogMappingStatus" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "source"             "CatalogMappingSource" NOT NULL DEFAULT 'AUTO',

  "confidenceScore"    DOUBLE PRECISION,
  "matchReason"        TEXT,
  "notes"              TEXT,

  "lastValidatedAt"    TIMESTAMP(3),
  "linkedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "unlinkedAt"         TIMESTAMP(3),
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL,

  CONSTRAINT "channel_entity_mappings_pkey" PRIMARY KEY ("id")
);

-- ─── Regular indexes ──────────────────────────────────────────────────────────

CREATE INDEX "cem_tenantId_storeId_connectionId_internalType_internalId_idx"
  ON "channel_entity_mappings" (
    "tenantId", "storeId", "connectionId",
    "internalEntityType", "internalEntityId"
  );

CREATE INDEX "cem_tenantId_storeId_connectionId_externalType_externalId_idx"
  ON "channel_entity_mappings" (
    "tenantId", "storeId", "connectionId",
    "externalEntityType", "externalEntityId"
  );

CREATE INDEX "cem_tenantId_storeId_connectionId_status_idx"
  ON "channel_entity_mappings" (
    "tenantId", "storeId", "connectionId", "status"
  );

-- ─── Partial unique indexes (active mappings only) ────────────────────────────
--
-- Ensures that within a single connection, a given external entity can only be
-- actively linked to one internal entity, and vice versa.
-- UNMATCHED rows have no internalEntityId target, and ARCHIVED rows represent
-- historical records, so both are excluded.

CREATE UNIQUE INDEX "cem_unique_active_external_per_connection"
  ON "channel_entity_mappings" (
    "connectionId", "externalEntityType", "externalEntityId"
  )
  WHERE "status" NOT IN ('ARCHIVED', 'UNMATCHED');

CREATE UNIQUE INDEX "cem_unique_active_internal_per_connection"
  ON "channel_entity_mappings" (
    "connectionId", "internalEntityType", "internalEntityId"
  )
  WHERE "status" NOT IN ('ARCHIVED', 'UNMATCHED');
