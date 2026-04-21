-- Make tenant_id and store_id optional on recipes to support platform-level recipes
-- created by a platform admin without being tied to any specific store or tenant.

ALTER TABLE "recipes" ALTER COLUMN "tenantId" DROP NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "storeId" DROP NOT NULL;
