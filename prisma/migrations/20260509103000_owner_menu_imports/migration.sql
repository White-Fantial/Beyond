-- CreateTable
CREATE TABLE "menu_import_runs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "overwriteExisting" BOOLEAN NOT NULL DEFAULT false,
    "externalImportRunId" TEXT,
    "summaryJson" JSONB NOT NULL,
    "applyResultJson" JSONB,
    "appliedAt" TIMESTAMP(3),
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_import_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_import_product_maps" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "tenantProductId" TEXT NOT NULL,
    "lastExternalHash" TEXT,
    "lastImportedName" TEXT,
    "lastImportedPriceMillicents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_import_product_maps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_import_runs_tenantId_storeId_createdAt_idx" ON "menu_import_runs"("tenantId", "storeId", "createdAt");

-- CreateIndex
CREATE INDEX "menu_import_runs_connectionId_status_createdAt_idx" ON "menu_import_runs"("connectionId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "menu_import_product_maps_connectionId_externalProductId_key" ON "menu_import_product_maps"("connectionId", "externalProductId");

-- CreateIndex
CREATE INDEX "menu_import_product_maps_tenantId_storeId_idx" ON "menu_import_product_maps"("tenantId", "storeId");

-- CreateIndex
CREATE INDEX "menu_import_product_maps_tenantProductId_idx" ON "menu_import_product_maps"("tenantProductId");

-- AddForeignKey
ALTER TABLE "menu_import_runs" ADD CONSTRAINT "menu_import_runs_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_import_product_maps" ADD CONSTRAINT "menu_import_product_maps_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_import_product_maps" ADD CONSTRAINT "menu_import_product_maps_tenantProductId_fkey" FOREIGN KEY ("tenantProductId") REFERENCES "tenant_catalog_products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
