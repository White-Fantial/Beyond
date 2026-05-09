-- CreateEnum
CREATE TYPE "OwnerInvoiceImportBatchStatus" AS ENUM ('DRAFT', 'PREVIEWED', 'APPLIED', 'PARTIALLY_APPLIED', 'FAILED');

-- CreateEnum
CREATE TYPE "OwnerInvoiceImportRowStatus" AS ENUM ('MATCHED', 'PRODUCT_ONLY', 'PLATFORM_CANDIDATE', 'UNMATCHED', 'INCOMPLETE');

-- CreateEnum
CREATE TYPE "OwnerInvoiceImportRowApplyStatus" AS ENUM ('PENDING', 'APPLIED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "owner_invoice_import_batches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sourceFileName" TEXT NOT NULL,
    "sourceFileMime" TEXT,
    "sourceFileSize" INTEGER NOT NULL,
    "status" "OwnerInvoiceImportBatchStatus" NOT NULL DEFAULT 'DRAFT',
    "extractionNote" TEXT,
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_invoice_import_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "owner_invoice_import_rows" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "rowNumber" INTEGER NOT NULL,
    "rawLine" TEXT,
    "detectedName" TEXT,
    "detectedSku" TEXT,
    "detectedQuantity" DECIMAL(12,4),
    "detectedUnit" "IngredientUnit",
    "detectedPrice" INTEGER,
    "rowStatus" "OwnerInvoiceImportRowStatus" NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 0,
    "matchReason" TEXT,
    "supplierProductId" TEXT,
    "ingredientId" TEXT,
    "platformIngredientId" TEXT,
    "needsOwnerIngredientImport" BOOLEAN NOT NULL DEFAULT false,
    "createProvisionalIngredient" BOOLEAN NOT NULL DEFAULT false,
    "provisionalIngredientName" TEXT,
    "applyStatus" "OwnerInvoiceImportRowApplyStatus" NOT NULL DEFAULT 'PENDING',
    "applyError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "owner_invoice_import_rows_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "owner_invoice_import_batches_tenantId_status_idx" ON "owner_invoice_import_batches"("tenantId", "status");

-- CreateIndex
CREATE INDEX "owner_invoice_import_batches_tenantId_createdAt_idx" ON "owner_invoice_import_batches"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "owner_invoice_import_batches_supplierId_idx" ON "owner_invoice_import_batches"("supplierId");

-- CreateIndex
CREATE INDEX "owner_invoice_import_rows_batchId_rowNumber_idx" ON "owner_invoice_import_rows"("batchId", "rowNumber");

-- CreateIndex
CREATE INDEX "owner_invoice_import_rows_batchId_rowStatus_idx" ON "owner_invoice_import_rows"("batchId", "rowStatus");

-- CreateIndex
CREATE INDEX "owner_invoice_import_rows_batchId_applyStatus_idx" ON "owner_invoice_import_rows"("batchId", "applyStatus");

-- AddForeignKey
ALTER TABLE "owner_invoice_import_rows" ADD CONSTRAINT "owner_invoice_import_rows_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "owner_invoice_import_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
