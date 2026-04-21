-- Platform Supplier Management
-- - Add SupplierScope enum (PLATFORM | STORE)
-- - Add SupplierRequestStatus enum (PENDING | APPROVED | REJECTED | DUPLICATE)
-- - Make Supplier.tenantId and Supplier.storeId nullable (PLATFORM scope has null)
-- - Add Supplier.scope field (default STORE for backward compat)
-- - Add SupplierRequest model (owner-submitted requests reviewed by moderators)

-- Enums
CREATE TYPE "SupplierScope" AS ENUM ('PLATFORM', 'STORE');
CREATE TYPE "SupplierRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

-- Make tenantId / storeId nullable on suppliers
ALTER TABLE "suppliers" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "suppliers" ALTER COLUMN "storeId" DROP NOT NULL;

-- Add scope column (default STORE so all existing rows get STORE)
ALTER TABLE "suppliers" ADD COLUMN "scope" "SupplierScope" NOT NULL DEFAULT 'STORE';

-- Index on scope for admin queries
CREATE INDEX "suppliers_scope_idx" ON "suppliers"("scope");

-- SupplierRequest table
CREATE TABLE "supplier_requests" (
  "id"                  TEXT NOT NULL,
  "requestedByUserId"   TEXT NOT NULL,
  "tenantId"            TEXT NOT NULL,
  "name"                TEXT NOT NULL,
  "websiteUrl"          TEXT,
  "contactEmail"        TEXT,
  "contactPhone"        TEXT,
  "notes"               TEXT,
  "status"              "SupplierRequestStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedSupplierId"  TEXT,
  "reviewedByUserId"    TEXT,
  "reviewNotes"         TEXT,
  "createdAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "supplier_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "supplier_requests_status_idx" ON "supplier_requests"("status");
CREATE INDEX "supplier_requests_tenantId_idx" ON "supplier_requests"("tenantId");
CREATE INDEX "supplier_requests_requestedByUserId_idx" ON "supplier_requests"("requestedByUserId");

-- FK: requestedBy → users
ALTER TABLE "supplier_requests"
  ADD CONSTRAINT "supplier_requests_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- FK: reviewedBy → users (nullable)
ALTER TABLE "supplier_requests"
  ADD CONSTRAINT "supplier_requests_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- FK: resolvedSupplier → suppliers (nullable)
ALTER TABLE "supplier_requests"
  ADD CONSTRAINT "supplier_requests_resolvedSupplierId_fkey"
  FOREIGN KEY ("resolvedSupplierId") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
