-- CreateEnum
CREATE TYPE "JobType" AS ENUM ('CATALOG_SYNC', 'CONNECTION_VALIDATE', 'CONNECTION_REFRESH_CHECK', 'ORDER_RECOVERY_RETRY', 'ORDER_RECONCILIATION_RETRY', 'ANALYTICS_REBUILD');

-- CreateEnum
CREATE TYPE "JobRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobTriggerSource" AS ENUM ('SYSTEM', 'ADMIN_MANUAL', 'ADMIN_RETRY');

-- CreateTable
CREATE TABLE "job_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "storeId" TEXT,
    "provider" TEXT,
    "jobType" "JobType" NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'QUEUED',
    "triggerSource" "JobTriggerSource" NOT NULL,
    "triggeredByUserId" TEXT,
    "parentRunId" TEXT,
    "relatedEntityType" TEXT,
    "relatedEntityId" TEXT,
    "inputJson" JSONB,
    "resultJson" JSONB,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "queuedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_runs_tenantId_storeId_idx" ON "job_runs"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "job_runs_status_createdAt_idx" ON "job_runs"("status", "createdAt");

-- CreateIndex
CREATE INDEX "job_runs_jobType_status_idx" ON "job_runs"("jobType", "status");

-- CreateIndex
CREATE INDEX "job_runs_triggeredByUserId_idx" ON "job_runs"("triggeredByUserId");

-- CreateIndex
CREATE INDEX "job_runs_parentRunId_idx" ON "job_runs"("parentRunId");

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_runs" ADD CONSTRAINT "job_runs_parentRunId_fkey" FOREIGN KEY ("parentRunId") REFERENCES "job_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;
