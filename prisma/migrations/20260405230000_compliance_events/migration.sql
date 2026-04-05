-- CreateEnum
CREATE TYPE "ComplianceEventType" AS ENUM ('DATA_EXPORT', 'ERASURE_REQUEST', 'ERASURE_COMPLETE');

-- CreateTable
CREATE TABLE "compliance_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "ComplianceEventType" NOT NULL,
    "performedBy" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "compliance_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "compliance_events_userId_idx" ON "compliance_events"("userId");

-- CreateIndex
CREATE INDEX "compliance_events_createdAt_idx" ON "compliance_events"("createdAt");
