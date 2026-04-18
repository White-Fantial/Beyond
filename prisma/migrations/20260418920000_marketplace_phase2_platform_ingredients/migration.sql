-- Marketplace Phase 2: PlatformIngredient — platform-global ingredient catalogue.

CREATE TABLE "platform_ingredients" (
  "id"                TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "name"              TEXT          NOT NULL,
  "description"       TEXT,
  "category"          TEXT,
  "unit"              TEXT          NOT NULL DEFAULT 'GRAM',
  "referenceUnitCost" INTEGER       NOT NULL DEFAULT 0,
  "currency"          TEXT          NOT NULL DEFAULT 'KRW',
  "isActive"          BOOLEAN       NOT NULL DEFAULT TRUE,
  "createdByUserId"   TEXT          NOT NULL,
  "createdAt"         TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"         TIMESTAMP(3)  NOT NULL,
  "deletedAt"         TIMESTAMP(3),

  CONSTRAINT "platform_ingredients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "platform_ingredients_isActive_idx"  ON "platform_ingredients"("isActive");
CREATE INDEX "platform_ingredients_category_idx"  ON "platform_ingredients"("category");

ALTER TABLE "platform_ingredients"
  ADD CONSTRAINT "platform_ingredients_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
