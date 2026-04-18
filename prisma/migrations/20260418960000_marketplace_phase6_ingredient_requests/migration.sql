-- Marketplace Phase 6: IngredientRequest — user-submitted requests for new platform ingredients.
--
-- Hybrid approach: users submit requests (Option A) while still being able to write
-- free-text custom ingredients in their recipes (Option B).  Moderators review each
-- request and can APPROVE (creating/linking a PlatformIngredient), mark it DUPLICATE
-- (pointing at an existing one), or REJECT it.

CREATE TYPE "IngredientRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DUPLICATE');

CREATE TABLE "ingredient_requests" (
  "id"                          TEXT          NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "requestedByUserId"           TEXT          NOT NULL,
  "name"                        TEXT          NOT NULL,
  "description"                 TEXT,
  "category"                    TEXT,
  "unit"                        TEXT          NOT NULL DEFAULT 'GRAM',
  "notes"                       TEXT,
  "status"                      "IngredientRequestStatus" NOT NULL DEFAULT 'PENDING',
  "resolvedPlatformIngredientId" TEXT,
  "reviewedByUserId"            TEXT,
  "reviewNotes"                 TEXT,
  "createdAt"                   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                   TIMESTAMP(3)  NOT NULL,

  CONSTRAINT "ingredient_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ingredient_requests_status_idx"            ON "ingredient_requests"("status");
CREATE INDEX "ingredient_requests_requestedByUserId_idx" ON "ingredient_requests"("requestedByUserId");

ALTER TABLE "ingredient_requests"
  ADD CONSTRAINT "ingredient_requests_requestedByUserId_fkey"
  FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ingredient_requests"
  ADD CONSTRAINT "ingredient_requests_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "ingredient_requests"
  ADD CONSTRAINT "ingredient_requests_resolvedPlatformIngredientId_fkey"
  FOREIGN KEY ("resolvedPlatformIngredientId") REFERENCES "platform_ingredients"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
