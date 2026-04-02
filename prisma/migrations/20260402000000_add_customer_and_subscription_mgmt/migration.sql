-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "internalNote" TEXT,
    "noteUpdatedAt" TIMESTAMP(3),
    "noteUpdatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- AlterTable: add new optional columns to subscriptions
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "tenantId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "storeId" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "nextOrderAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "internalNote" TEXT;
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);
ALTER TABLE "subscriptions" ADD COLUMN IF NOT EXISTS "cancelReason" TEXT;

-- CreateIndex
CREATE INDEX "customers_tenantId_idx" ON "customers"("tenantId");
CREATE INDEX "customers_tenantId_email_idx" ON "customers"("tenantId", "email");
CREATE INDEX "subscriptions_tenantId_customerId_idx" ON "subscriptions"("tenantId", "customerId");
CREATE INDEX "subscriptions_tenantId_status_idx" ON "subscriptions"("tenantId", "status");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
