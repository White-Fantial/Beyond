-- Marketplace Phase 7: Provider Onboarding & Stripe Connect
--
-- 1. New enums: ProviderApplicationStatus, RecipePayoutStatus
-- 2. User model: Stripe Connect fields + provider application timestamps
-- 3. New model: ProviderOnboardingApplication
-- 4. MarketplaceRecipePurchase: Stripe payment + payout tracking fields

-- ─── New enums ────────────────────────────────────────────────────────────────

CREATE TYPE "ProviderApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RecipePayoutStatus"        AS ENUM ('PENDING', 'TRANSFERRED', 'FAILED');

-- ─── User: Stripe Connect + provider timestamps ───────────────────────────────

ALTER TABLE "users"
  ADD COLUMN "stripeConnectAccountId"      TEXT,
  ADD COLUMN "stripeConnectOnboarded"      BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "stripeConnectPayoutsEnabled" BOOLEAN      NOT NULL DEFAULT false,
  ADD COLUMN "providerAppliedAt"           TIMESTAMP(3),
  ADD COLUMN "providerApprovedAt"          TIMESTAMP(3);

-- ─── ProviderOnboardingApplication ───────────────────────────────────────────

CREATE TABLE "provider_onboarding_applications" (
  "id"               TEXT                        NOT NULL DEFAULT gen_random_uuid()::TEXT,
  "userId"           TEXT                        NOT NULL,
  "businessName"     TEXT                        NOT NULL,
  "businessType"     TEXT                        NOT NULL DEFAULT 'INDIVIDUAL',
  "taxId"            TEXT,
  "portfolioUrl"     TEXT,
  "introduction"     TEXT,
  "status"           "ProviderApplicationStatus" NOT NULL DEFAULT 'PENDING',
  "adminNotes"       TEXT,
  "createdAt"        TIMESTAMP(3)                NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"        TIMESTAMP(3)                NOT NULL,
  "reviewedAt"       TIMESTAMP(3),
  "reviewedByUserId" TEXT,

  CONSTRAINT "provider_onboarding_applications_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_onboarding_applications_userId_idx"  ON "provider_onboarding_applications"("userId");
CREATE INDEX "provider_onboarding_applications_status_idx"  ON "provider_onboarding_applications"("status");

ALTER TABLE "provider_onboarding_applications"
  ADD CONSTRAINT "provider_onboarding_applications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "provider_onboarding_applications"
  ADD CONSTRAINT "provider_onboarding_applications_reviewedByUserId_fkey"
  FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── MarketplaceRecipePurchase: Stripe payment + payout fields ────────────────

ALTER TABLE "marketplace_recipe_purchases"
  ADD COLUMN "stripePaymentIntentId" TEXT,
  ADD COLUMN "stripeTransferId"      TEXT,
  ADD COLUMN "platformFeeAmount"     INTEGER              NOT NULL DEFAULT 0,
  ADD COLUMN "providerPayoutAmount"  INTEGER              NOT NULL DEFAULT 0,
  ADD COLUMN "payoutStatus"          "RecipePayoutStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "transferredAt"         TIMESTAMP(3);

CREATE UNIQUE INDEX "marketplace_recipe_purchases_stripePaymentIntentId_key"
  ON "marketplace_recipe_purchases"("stripePaymentIntentId")
  WHERE "stripePaymentIntentId" IS NOT NULL;
