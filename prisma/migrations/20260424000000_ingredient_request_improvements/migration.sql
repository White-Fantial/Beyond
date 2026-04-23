-- Migration: ingredient_request_improvements
-- 1. Add ownerSeenAt to IngredientRequest (Gap 5 — notification badge)
-- 2. Drop TenantIngredient table (Gap 1 — unnecessary import model)

-- Gap 5: ownerSeenAt column
ALTER TABLE "ingredient_requests" ADD COLUMN "ownerSeenAt" TIMESTAMP(3);

-- Gap 1: drop TenantIngredient
DROP TABLE IF EXISTS "tenant_ingredients";
