-- Ingredient Request: add tenantId and tempIngredientId
-- - tenantId: identifies the owner/tenant who submitted the request
-- - tempIngredientId: FK to the auto-created temporary STORE-scope Ingredient
--   created when an owner submits a request (so they can use it in recipes immediately)

ALTER TABLE "ingredient_requests" ADD COLUMN "tenantId" TEXT;
ALTER TABLE "ingredient_requests" ADD COLUMN "tempIngredientId" TEXT;

-- FK: tempIngredientId -> ingredients.id (SetNull on delete)
ALTER TABLE "ingredient_requests"
  ADD CONSTRAINT "ingredient_requests_tempIngredientId_fkey"
  FOREIGN KEY ("tempIngredientId")
  REFERENCES "ingredients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Index for efficient per-tenant owner queries
CREATE INDEX "ingredient_requests_tenantId_idx" ON "ingredient_requests"("tenantId");
