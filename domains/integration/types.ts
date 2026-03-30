/**
 * Shared domain types for the store-level external channel integration system.
 * These types bridge the adapter layer and the service/UI layers.
 */

import type {
  AuthScheme,
  ConnectionActionType,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionType,
  CredentialType,
  ProviderEnvironment,
} from "@prisma/client";

// Re-export Prisma enums for convenience
export type {
  AuthScheme,
  ConnectionActionType,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionType,
  CredentialType,
  ProviderEnvironment,
};

// ─── Resolved provider app credential (after decryption) ─────────────────────

export interface ProviderAppCredentialResolved {
  id: string;
  provider: ConnectionProvider;
  environment: ProviderEnvironment;
  displayName: string;
  authScheme: AuthScheme;
  clientId?: string | null;
  clientSecret?: string | null;
  keyId?: string | null;
  developerId?: string | null;
  scopes: string[];
  webhookSecret?: string | null;
  /** Any additional provider-specific config fields from the encrypted blob */
  extra?: Record<string, unknown>;
}

// ─── Decrypted credential payload (stored in ConnectionCredential) ────────────

export interface DecryptedCredentialPayload {
  credentialType: CredentialType;
  authScheme: AuthScheme;
  /** OAuth access token */
  accessToken?: string;
  /** OAuth refresh token */
  refreshToken?: string;
  /** JWT signing key (PEM or JWK string) */
  signingKey?: string;
  /** Pre-signed JWT assertion */
  assertion?: string;
  /** API key */
  apiKey?: string;
  /** Webhook secret */
  webhookSecret?: string;
  /** Token scopes */
  scopes?: string[];
  /** Any additional provider-specific fields */
  extra?: Record<string, unknown>;
}

// ─── Connection summary (for UI) ──────────────────────────────────────────────

export interface ConnectionSummary {
  id: string;
  storeId: string;
  provider: ConnectionProvider;
  type: ConnectionType;
  status: ConnectionStatus;
  authScheme?: AuthScheme | null;
  displayName?: string | null;
  externalMerchantId?: string | null;
  externalStoreId?: string | null;
  externalStoreName?: string | null;
  externalLocationId?: string | null;
  lastConnectedAt?: Date | string | null;
  lastAuthValidatedAt?: Date | string | null;
  lastSyncAt?: Date | string | null;
  lastSyncStatus?: string | null;
  reauthRequired: boolean;
  lastErrorCode?: string | null;
  lastErrorMessage?: string | null;
  disconnectedAt?: Date | string | null;
}

// ─── OAuth authorization flow ─────────────────────────────────────────────────

export interface AuthorizationStartInput {
  tenantId: string;
  storeId: string;
  provider: ConnectionProvider;
  connectionType: ConnectionType;
  requestedByUserId: string;
  /** Override the redirect URI (optional) */
  redirectUri?: string;
}

export interface AuthorizationStartResult {
  /** URL to redirect the browser to */
  redirectUrl: string;
  /** Opaque CSRF state token */
  state: string;
}

export interface OAuthCallbackInput {
  code?: string;
  state: string;
  error?: string;
  errorDescription?: string;
}

// ─── Provider store candidate (for store mapping after OAuth) ─────────────────

export interface ProviderStoreCandidate {
  externalStoreId: string;
  externalStoreName: string;
  externalMerchantId?: string | null;
  metadata?: Record<string, unknown>;
}

// ─── Credentials to persist after callback ───────────────────────────────────

export interface CredentialToStore {
  credentialType: CredentialType;
  authScheme: AuthScheme;
  label?: string;
  payload: DecryptedCredentialPayload;
  issuedAt?: Date;
  expiresAt?: Date;
  refreshAfter?: Date;
  canRefresh?: boolean;
}

// ─── Adapter callback result ─────────────────────────────────────────────────

export interface OAuthCallbackResult {
  authScheme: AuthScheme;
  credentialsToStore: CredentialToStore[];
  providerAccount?: {
    externalMerchantId?: string | null;
    externalStoreId?: string | null;
    externalStoreName?: string | null;
    externalLocationId?: string | null;
  };
}

// ─── Credential refresh result ────────────────────────────────────────────────

export interface CredentialRefreshResult {
  credentialsToStore: CredentialToStore[];
  /** If true the provider rejected the refresh; user must re-auth */
  requiresReauth?: boolean;
}

// ─── Integration action log entry ────────────────────────────────────────────

export interface ConnectionActionLogEntry {
  tenantId: string;
  storeId: string;
  connectionId?: string | null;
  provider: ConnectionProvider;
  actionType: ConnectionActionType;
  status: "SUCCESS" | "FAILURE" | "PENDING";
  actorUserId?: string | null;
  message?: string | null;
  errorCode?: string | null;
  payloadJson?: Record<string, unknown> | null;
}
