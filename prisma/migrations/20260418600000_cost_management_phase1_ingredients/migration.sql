-- Cost Management Phase 1: Ingredient Master
-- Migration: 20260418600000_cost_management_phase1_ingredients

-- ─── Enums ────────────────────────────────────────────────────────────────────

CREATE TYPE "IngredientUnit" AS ENUM (
  'GRAM',
  'KG',
  'ML',
  'LITER',
  'EACH',
  'TSP',
  'TBSP',
  'OZ',
  'LB',
  'CUP',
  'PIECE'
);

-- ─── ingredients ─────────────────────────────────────────────────────────────

CREATE TABLE "ingredients" (
  "id"          TEXT        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "tenantId"    TEXT        NOT NULL,
  "storeId"     TEXT        NOT NULL,
  "name"        TEXT        NOT NULL,
  "description" TEXT,
  "unit"        "IngredientUnit" NOT NULL DEFAULT 'GRAM',
  "unitCost"    INTEGER     NOT NULL DEFAULT 0,
  "currency"    TEXT        NOT NULL DEFAULT 'NZD',
  "notes"       TEXT,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  "deletedAt"   TIMESTAMP(3),

  CONSTRAINT "ingredients_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingredients_tenantId_storeId_idx" ON "ingredients"("tenantId", "storeId");
CREATE INDEX "ingredients_storeId_name_idx" ON "ingredients"("storeId", "name");
