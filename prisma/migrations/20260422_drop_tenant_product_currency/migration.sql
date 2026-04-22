-- Drop currency column from tenant_catalog_products
ALTER TABLE "tenant_catalog_products" DROP COLUMN IF EXISTS "currency";
