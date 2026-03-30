-- Migration: Add integrations schema
-- Adds new enums, extends Connection/ConnectionCredential, and adds
-- ProviderAppCredential, ConnectionOAuthState, and ConnectionActionLog models.

-- @prisma-disable-transaction
-- ALTER TYPE ... ADD VALUE cannot be used in the same transaction as the new
-- enum value. Disabling the transaction wrapper lets each statement auto-commit
-- so 'CONNECTING' is visible before the UPDATE on line 48 runs.

-- ─── New Enums ────────────────────────────────────────────────────────────────

CREATE TYPE "ProviderEnvironment" AS ENUM ('SANDBOX', 'PRODUCTION');

CREATE TYPE "AuthScheme" AS ENUM (
  'OAUTH2',
  'JWT_BEARER',
  'API_KEY',
  'BASIC',
  'CUSTOM'
);

CREATE TYPE "CredentialType" AS ENUM (
  'OAUTH_TOKEN',
  'CLIENT_CREDENTIAL',
  'JWT_SIGNING_KEY',
  'JWT_ASSERTION',
  'API_KEY',
  'WEBHOOK_SECRET',
  'CUSTOM_SECRET'
);

CREATE TYPE "ConnectionActionType" AS ENUM (
  'CONNECT_START',
  'CONNECT_CALLBACK',
  'CONNECT_SUCCESS',
  'CONNECT_FAILURE',
  'REFRESH_SUCCESS',
  'REFRESH_FAILURE',
  'DISCONNECT',
  'REAUTHORIZE',
  'STORE_MAPPING_UPDATE',
  'SYNC_TEST'
);

-- ─── Extend ConnectionStatus enum ─────────────────────────────────────────────
-- Rename old enum, create new one, migrate data, drop old.

ALTER TYPE "ConnectionStatus" ADD VALUE IF NOT EXISTS 'NOT_CONNECTED';
ALTER TYPE "ConnectionStatus" ADD VALUE IF NOT EXISTS 'CONNECTING';
ALTER TYPE "ConnectionStatus" ADD VALUE IF NOT EXISTS 'REAUTH_REQUIRED';

-- Map legacy PENDING → CONNECTING
UPDATE "connections" SET "status" = 'CONNECTING' WHERE "status" = 'PENDING';

-- ─── ProviderAppCredential ────────────────────────────────────────────────────

CREATE TABLE "provider_app_credentials" (
  "id"              TEXT NOT NULL,
  "tenantId"        TEXT,
  "provider"        "ConnectionProvider" NOT NULL,
  "environment"     "ProviderEnvironment" NOT NULL DEFAULT 'PRODUCTION',
  "displayName"     TEXT NOT NULL,
  "authScheme"      "AuthScheme" NOT NULL,
  "clientId"        TEXT,
  "keyId"           TEXT,
  "developerId"     TEXT,
  "scopes"          TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "configEncrypted" TEXT NOT NULL,
  "isActive"        BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"       TIMESTAMP(3) NOT NULL,

  CONSTRAINT "provider_app_credentials_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "provider_app_credentials_tenantId_provider_environment_isActive_idx"
  ON "provider_app_credentials"("tenantId", "provider", "environment", "isActive");

-- ─── Extend Connection ────────────────────────────────────────────────────────

-- Add new columns to connections
ALTER TABLE "connections"
  ADD COLUMN IF NOT EXISTS "externalMerchantId"   TEXT,
  ADD COLUMN IF NOT EXISTS "externalStoreId"       TEXT,
  ADD COLUMN IF NOT EXISTS "externalStoreName"     TEXT,
  ADD COLUMN IF NOT EXISTS "authScheme"            "AuthScheme",
  ADD COLUMN IF NOT EXISTS "appCredentialId"       TEXT,
  ADD COLUMN IF NOT EXISTS "capabilitiesJson"      JSONB,
  ADD COLUMN IF NOT EXISTS "metadataJson"          JSONB,
  ADD COLUMN IF NOT EXISTS "lastConnectedAt"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastAuthValidatedAt"   TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastSyncStatus"        TEXT,
  ADD COLUMN IF NOT EXISTS "reauthRequiredAt"      TIMESTAMP(3);

-- Migrate connectedAt → lastConnectedAt
UPDATE "connections" SET "lastConnectedAt" = "connectedAt" WHERE "connectedAt" IS NOT NULL;

-- Migrate externalAccountId → externalMerchantId
UPDATE "connections" SET "externalMerchantId" = "externalAccountId" WHERE "externalAccountId" IS NOT NULL;

-- Migrate lastSyncStatus SyncStatus → TEXT
ALTER TABLE "connections"
  ALTER COLUMN "lastSyncStatus" TYPE TEXT USING CASE
    WHEN "lastSyncStatus"::TEXT IS NOT NULL THEN "lastSyncStatus"::TEXT
    ELSE NULL
  END;

-- Drop old columns that are superseded
ALTER TABLE "connections"
  DROP COLUMN IF EXISTS "connectedAt",
  DROP COLUMN IF EXISTS "externalAccountId";

-- Drop old SyncStatus-typed column (already converted above)
-- The old column was named lastSyncStatus as SyncStatus enum; now it's TEXT.
-- Note: we kept the name the same, just changed the type above.

-- Update existing indexes
DROP INDEX IF EXISTS "connections_tenantId_idx";
DROP INDEX IF EXISTS "connections_storeId_idx";
DROP INDEX IF EXISTS "connections_type_idx";
DROP INDEX IF EXISTS "connections_provider_idx";
DROP INDEX IF EXISTS "connections_status_idx";

CREATE INDEX "connections_tenantId_storeId_provider_idx"
  ON "connections"("tenantId", "storeId", "provider");
CREATE INDEX "connections_status_reauthRequiredAt_idx"
  ON "connections"("status", "reauthRequiredAt");

-- Foreign key for appCredentialId
ALTER TABLE "connections"
  ADD CONSTRAINT "connections_appCredentialId_fkey"
  FOREIGN KEY ("appCredentialId")
  REFERENCES "provider_app_credentials"("id")
  ON DELETE SET NULL;

-- ─── Rebuild ConnectionCredential ────────────────────────────────────────────
-- Add new columns to existing table

ALTER TABLE "connection_credentials"
  ADD COLUMN IF NOT EXISTS "tenantId"           TEXT,
  ADD COLUMN IF NOT EXISTS "storeId"            TEXT,
  ADD COLUMN IF NOT EXISTS "credentialType"     "CredentialType",
  ADD COLUMN IF NOT EXISTS "authScheme"         "AuthScheme",
  ADD COLUMN IF NOT EXISTS "label"              TEXT,
  ADD COLUMN IF NOT EXISTS "tokenReferenceHash" TEXT,
  ADD COLUMN IF NOT EXISTS "issuedAt"           TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "expiresAt"          TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "refreshAfter"       TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastUsedAt"         TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastRefreshAt"      TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastRefreshStatus"  TEXT,
  ADD COLUMN IF NOT EXISTS "lastRefreshError"   TEXT,
  ADD COLUMN IF NOT EXISTS "canRefresh"         BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "requiresReauth"     BOOLEAN NOT NULL DEFAULT FALSE;

-- Backfill tenantId / storeId from parent connection
UPDATE "connection_credentials" cc
SET
  "tenantId" = c."tenantId",
  "storeId"  = c."storeId"
FROM "connections" c
WHERE cc."connectionId" = c."id"
  AND cc."tenantId" IS NULL;

-- Backfill credentialType and authScheme with sensible defaults for existing rows
UPDATE "connection_credentials"
SET "credentialType" = 'OAUTH_TOKEN',
    "authScheme"     = 'OAUTH2'
WHERE "credentialType" IS NULL;

-- Make columns NOT NULL after backfill
ALTER TABLE "connection_credentials"
  ALTER COLUMN "tenantId"       SET NOT NULL,
  ALTER COLUMN "storeId"        SET NOT NULL,
  ALTER COLUMN "credentialType" SET NOT NULL,
  ALTER COLUMN "authScheme"     SET NOT NULL;

-- Rebuild indexes
DROP INDEX IF EXISTS "connection_credentials_connectionId_idx";
DROP INDEX IF EXISTS "connection_credentials_isActive_idx";

CREATE INDEX "connection_credentials_connectionId_isActive_idx"
  ON "connection_credentials"("connectionId", "isActive");
CREATE INDEX "connection_credentials_credentialType_authScheme_idx"
  ON "connection_credentials"("credentialType", "authScheme");
CREATE INDEX "connection_credentials_expiresAt_refreshAfter_idx"
  ON "connection_credentials"("expiresAt", "refreshAfter");
CREATE INDEX "connection_credentials_tenantId_storeId_idx"
  ON "connection_credentials"("tenantId", "storeId");

-- ─── ConnectionOAuthState ─────────────────────────────────────────────────────

CREATE TABLE "connection_oauth_states" (
  "id"                TEXT NOT NULL,
  "tenantId"          TEXT NOT NULL,
  "storeId"           TEXT NOT NULL,
  "provider"          "ConnectionProvider" NOT NULL,
  "connectionType"    "ConnectionType" NOT NULL,
  "state"             TEXT NOT NULL,
  "codeVerifier"      TEXT,
  "redirectUri"       TEXT NOT NULL,
  "requestedByUserId" TEXT NOT NULL,
  "expiresAt"         TIMESTAMP(3) NOT NULL,
  "consumedAt"        TIMESTAMP(3),
  "metadataJson"      JSONB,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "connection_oauth_states_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "connection_oauth_states_state_key" UNIQUE ("state")
);

CREATE INDEX "connection_oauth_states_provider_expiresAt_idx"
  ON "connection_oauth_states"("provider", "expiresAt");
CREATE INDEX "connection_oauth_states_tenantId_storeId_idx"
  ON "connection_oauth_states"("tenantId", "storeId");

-- ─── ConnectionActionLog ──────────────────────────────────────────────────────

CREATE TABLE "connection_action_logs" (
  "id"           TEXT NOT NULL,
  "tenantId"     TEXT NOT NULL,
  "storeId"      TEXT NOT NULL,
  "connectionId" TEXT,
  "provider"     "ConnectionProvider" NOT NULL,
  "actionType"   "ConnectionActionType" NOT NULL,
  "status"       TEXT NOT NULL,
  "actorUserId"  TEXT,
  "message"      TEXT,
  "errorCode"    TEXT,
  "payloadJson"  JSONB,
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "connection_action_logs_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "connection_action_logs"
  ADD CONSTRAINT "connection_action_logs_connectionId_fkey"
  FOREIGN KEY ("connectionId")
  REFERENCES "connections"("id")
  ON DELETE SET NULL;

CREATE INDEX "connection_action_logs_tenantId_storeId_provider_createdAt_idx"
  ON "connection_action_logs"("tenantId", "storeId", "provider", "createdAt");
CREATE INDEX "connection_action_logs_connectionId_createdAt_idx"
  ON "connection_action_logs"("connectionId", "createdAt");
