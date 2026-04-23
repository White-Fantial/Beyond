-- Migration: Replace SupplierCredential full unique constraint with a partial
-- unique index that only covers active (non-deleted) rows.
--
-- Problem: @@unique([tenantId, userId, supplierId]) prevents re-creating a
-- credential after soft-deleting it, because the deleted row still occupies the
-- unique slot.
--
-- Solution (Option B): Drop the full unique index and replace it with a partial
-- unique index filtered on deleted_at IS NULL.  Soft-deleted rows are excluded
-- from the constraint, so a new credential for the same (tenant, user, supplier)
-- tuple can be created after deletion.

-- Drop the existing full unique index created by Prisma @@unique
DROP INDEX IF EXISTS "supplier_credentials_tenantId_userId_supplierId_key";

-- Create a partial unique index: only active (not soft-deleted) rows must be unique
CREATE UNIQUE INDEX "supplier_credentials_active_unique"
  ON "supplier_credentials" ("tenantId", "userId", "supplierId")
  WHERE "deletedAt" IS NULL;
