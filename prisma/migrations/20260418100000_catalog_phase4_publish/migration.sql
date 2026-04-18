-- Phase 4: Catalog Outbound Publish Layer
--
-- Adds:
--   1. CatalogPublishAction enum
--   2. CatalogPublishStatus enum
--   3. CatalogPublishScope enum
--   4. CatalogPublishJob model
--   5. Publish summary fields on channel_entity_mappings

-- CreateEnum
CREATE TYPE "CatalogPublishAction" AS ENUM ('CREATE', 'UPDATE', 'ARCHIVE', 'UNARCHIVE');

-- CreateEnum
CREATE TYPE "CatalogPublishStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED', 'SKIPPED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "CatalogPublishScope" AS ENUM ('CATEGORY', 'PRODUCT', 'MODIFIER_GROUP', 'MODIFIER_OPTION', 'PRODUCT_CATEGORY_LINK', 'PRODUCT_MODIFIER_GROUP_LINK');

-- CreateTable
CREATE TABLE "catalog_publish_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "internalEntityType" "CatalogEntityType",
    "internalEntityId" TEXT,
    "scope" "CatalogPublishScope" NOT NULL,
    "action" "CatalogPublishAction" NOT NULL,
    "status" "CatalogPublishStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" TEXT,
    "triggerSource" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "errorMessage" TEXT,
    "errorCode" TEXT,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_publish_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "catalog_publish_jobs_tenantId_storeId_connectionId_status_idx" ON "catalog_publish_jobs"("tenantId", "storeId", "connectionId", "status");

-- CreateIndex
CREATE INDEX "catalog_publish_jobs_tenantId_storeId_connectionId_internalEntityType_internalEntityId_idx" ON "catalog_publish_jobs"("tenantId", "storeId", "connectionId", "internalEntityType", "internalEntityId");

-- AlterTable: add publish summary columns to channel_entity_mappings
ALTER TABLE "channel_entity_mappings"
    ADD COLUMN "lastPublishedAt" TIMESTAMP(3),
    ADD COLUMN "lastPublishStatus" "CatalogPublishStatus",
    ADD COLUMN "lastPublishAction" "CatalogPublishAction",
    ADD COLUMN "lastPublishHash" TEXT,
    ADD COLUMN "lastPublishError" TEXT;
