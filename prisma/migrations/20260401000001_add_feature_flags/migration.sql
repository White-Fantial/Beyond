-- CreateEnum
CREATE TYPE "FlagType" AS ENUM ('BOOLEAN', 'STRING', 'INTEGER', 'JSON', 'VARIANT');

-- CreateEnum
CREATE TYPE "FlagStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "FlagScopeType" AS ENUM ('GLOBAL', 'TENANT', 'STORE', 'USER', 'ROLE', 'PORTAL', 'PROVIDER', 'ENVIRONMENT', 'PERCENTAGE');

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "flagType" "FlagType" NOT NULL DEFAULT 'BOOLEAN',
    "status" "FlagStatus" NOT NULL DEFAULT 'INACTIVE',
    "defaultBoolValue" BOOLEAN,
    "defaultStringValue" TEXT,
    "defaultIntValue" INTEGER,
    "defaultJsonValue" JSONB,
    "isExperiment" BOOLEAN NOT NULL DEFAULT false,
    "ownerNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flag_assignments" (
    "id" TEXT NOT NULL,
    "featureFlagId" TEXT NOT NULL,
    "scopeType" "FlagScopeType" NOT NULL DEFAULT 'GLOBAL',
    "scopeKey" TEXT,
    "boolValue" BOOLEAN,
    "stringValue" TEXT,
    "intValue" INTEGER,
    "jsonValue" JSONB,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flag_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flags_status_idx" ON "feature_flags"("status");

-- CreateIndex
CREATE INDEX "feature_flags_key_idx" ON "feature_flags"("key");

-- CreateIndex
CREATE INDEX "feature_flag_assignments_featureFlagId_idx" ON "feature_flag_assignments"("featureFlagId");

-- CreateIndex
CREATE INDEX "feature_flag_assignments_scopeType_scopeKey_idx" ON "feature_flag_assignments"("scopeType", "scopeKey");

-- AddForeignKey
ALTER TABLE "feature_flag_assignments" ADD CONSTRAINT "feature_flag_assignments_featureFlagId_fkey" FOREIGN KEY ("featureFlagId") REFERENCES "feature_flags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
