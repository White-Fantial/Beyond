-- CreateTable
CREATE TABLE "tenant_product_categories" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_product_categories_tenantId_name_key" ON "tenant_product_categories"("tenantId", "name");

-- CreateIndex
CREATE INDEX "tenant_product_categories_tenantId_displayOrder_idx" ON "tenant_product_categories"("tenantId", "displayOrder");

-- AlterTable
ALTER TABLE "tenant_catalog_products" ADD COLUMN "categoryId" TEXT;

-- CreateIndex
CREATE INDEX "tenant_catalog_products_categoryId_idx" ON "tenant_catalog_products"("categoryId");

-- AddForeignKey
ALTER TABLE "tenant_catalog_products" ADD CONSTRAINT "tenant_catalog_products_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "tenant_product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
