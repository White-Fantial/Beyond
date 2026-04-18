-- Marketplace Phase 5: Purchases — MarketplaceRecipePurchase table.

CREATE TABLE "marketplace_recipe_purchases" (
  "id"          TEXT         NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "recipeId"    TEXT         NOT NULL,
  "buyerUserId" TEXT         NOT NULL,
  "tenantId"    TEXT,
  "pricePaid"   INTEGER      NOT NULL DEFAULT 0,
  "currency"    TEXT         NOT NULL DEFAULT 'KRW',
  "paymentRef"  TEXT,
  "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "refundedAt"  TIMESTAMP(3),

  CONSTRAINT "marketplace_recipe_purchases_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "marketplace_recipe_purchases_recipeId_buyerUserId_key" UNIQUE ("recipeId", "buyerUserId")
);

CREATE INDEX "marketplace_recipe_purchases_buyerUserId_idx" ON "marketplace_recipe_purchases"("buyerUserId");
CREATE INDEX "marketplace_recipe_purchases_recipeId_idx"    ON "marketplace_recipe_purchases"("recipeId");
CREATE INDEX "marketplace_recipe_purchases_tenantId_idx"    ON "marketplace_recipe_purchases"("tenantId");

ALTER TABLE "marketplace_recipe_purchases"
  ADD CONSTRAINT "marketplace_recipe_purchases_recipeId_fkey"
  FOREIGN KEY ("recipeId") REFERENCES "marketplace_recipes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "marketplace_recipe_purchases"
  ADD CONSTRAINT "marketplace_recipe_purchases_buyerUserId_fkey"
  FOREIGN KEY ("buyerUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
