-- Migration: customer_store_context
-- Adds isCustomerFacing flag to Store and preferredStoreId to Customer
-- to support multi-tenant branded customer app with per-store context routing.

-- Add isCustomerFacing flag to stores (default true = visible in customer app)
ALTER TABLE "stores" ADD COLUMN IF NOT EXISTS "isCustomerFacing" BOOLEAN NOT NULL DEFAULT true;

-- Add preferredStoreId to customers (optional, for cross-device store context)
ALTER TABLE "customers" ADD COLUMN IF NOT EXISTS "preferredStoreId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'customers_preferredStoreId_fkey'
      AND conrelid = 'customers'::regclass
  ) THEN
    ALTER TABLE "customers"
      ADD CONSTRAINT "customers_preferredStoreId_fkey"
      FOREIGN KEY ("preferredStoreId")
      REFERENCES "stores"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "customers_preferredStoreId_idx" ON "customers"("preferredStoreId");
