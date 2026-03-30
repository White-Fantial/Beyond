/**
 * Integration service — manages the full lifecycle of store-level external
 * channel connections: connect, OAuth callback, credential storage, refresh,
 * disconnect, and status queries.
 *
 * All sensitive credential data is encrypted via lib/integrations/crypto.ts
 * before being written to the database.
 */

import { randomBytes, createHash } from "crypto";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import { encryptJson, decryptJson } from "@/lib/integrations/crypto";
import { getProviderAdapter } from "@/adapters/integrations/base";
// Ensure all adapters are registered by importing them
import "@/adapters/integrations/loyverse.adapter";
import "@/adapters/integrations/uber-eats.adapter";
import "@/adapters/integrations/doordash.adapter";

import type {
  ConnectionSummary,
  CredentialToStore,
  DecryptedCredentialPayload,
  OAuthCallbackInput,
  ProviderAppCredentialResolved,
  ConnectionActionLogEntry,
} from "@/domains/integration/types";
import type {
  AuthScheme,
  ConnectionActionType,
  ConnectionProvider,
  ConnectionStatus,
  ConnectionType,
  CredentialType,
  Prisma,
} from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

function generateOpaqueToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}

function fingerprintToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url").slice(0, 32);
}

function buildRedirectUri(provider: ConnectionProvider, baseUrl: string): string {
  return `${baseUrl}/api/integrations/callback/${provider.toLowerCase().replace("_", "-")}`;
}

// ─── Action logging ───────────────────────────────────────────────────────────

async function recordActionLog(entry: ConnectionActionLogEntry): Promise<void> {
  try {
    await prisma.connectionActionLog.create({
      data: {
        tenantId: entry.tenantId,
        storeId: entry.storeId,
        connectionId: entry.connectionId ?? null,
        provider: entry.provider,
        actionType: entry.actionType as ConnectionActionType,
        status: entry.status,
        actorUserId: entry.actorUserId ?? null,
        message: entry.message ?? null,
        errorCode: entry.errorCode ?? null,
        payloadJson: (entry.payloadJson as Prisma.InputJsonValue) ?? undefined,
      },
    });
  } catch (err) {
    console.error("[integration] Failed to record connection action log:", err);
  }
}

// ─── Resolve ProviderAppCredential ────────────────────────────────────────────

async function resolveAppCredential(
  provider: ConnectionProvider,
  tenantId?: string
): Promise<ProviderAppCredentialResolved> {
  // Prefer tenant-specific, fall back to platform-global (tenantId IS NULL)
  const appCred = await prisma.providerAppCredential.findFirst({
    where: {
      provider,
      isActive: true,
      OR: [{ tenantId }, { tenantId: null }],
    },
    orderBy: [
      // tenant-specific records first (tenantId NOT NULL)
      { tenantId: "asc" },
      { createdAt: "desc" },
    ],
  });

  if (!appCred) {
    throw new Error(
      `[integration] No active ProviderAppCredential found for provider "${provider}".`
    );
  }

  const config = decryptJson<Record<string, unknown>>(appCred.configEncrypted);

  return {
    id: appCred.id,
    provider: appCred.provider,
    environment: appCred.environment,
    displayName: appCred.displayName,
    authScheme: appCred.authScheme,
    clientId: appCred.clientId,
    clientSecret: (config["clientSecret"] as string) ?? undefined,
    keyId: appCred.keyId,
    developerId: appCred.developerId,
    scopes: appCred.scopes,
    webhookSecret: (config["webhookSecret"] as string) ?? undefined,
    extra: config,
  };
}

// ─── Persist credentials ──────────────────────────────────────────────────────

async function persistCredentials(
  connectionId: string,
  tenantId: string,
  storeId: string,
  credentials: CredentialToStore[]
): Promise<void> {
  for (const cred of credentials) {
    const encrypted = encryptJson(cred.payload);
    const hash = cred.payload.accessToken
      ? fingerprintToken(cred.payload.accessToken)
      : cred.payload.refreshToken
      ? fingerprintToken(cred.payload.refreshToken)
      : null;

    // Deactivate previous active credential of same type (regardless of label)
    await prisma.connectionCredential.updateMany({
      where: {
        connectionId,
        credentialType: cred.credentialType as CredentialType,
        authScheme: cred.authScheme as AuthScheme,
        isActive: true,
      },
      data: { isActive: false, rotatedAt: new Date() },
    });

    await prisma.connectionCredential.create({
      data: {
        connectionId,
        tenantId,
        storeId,
        credentialType: cred.credentialType as CredentialType,
        authScheme: cred.authScheme as AuthScheme,
        label: cred.label ?? null,
        configEncrypted: encrypted,
        tokenReferenceHash: hash,
        issuedAt: cred.issuedAt ?? null,
        expiresAt: cred.expiresAt ?? null,
        refreshAfter: cred.refreshAfter ?? null,
        canRefresh: cred.canRefresh ?? false,
        isActive: true,
      },
    });
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Retrieve all connection summaries for a store.
 */
export async function listStoreConnections(
  tenantId: string,
  storeId: string
): Promise<ConnectionSummary[]> {
  const connections = await prisma.connection.findMany({
    where: { tenantId, storeId },
    orderBy: { updatedAt: "desc" },
  });

  return connections.map((c) => ({
    id: c.id,
    storeId: c.storeId,
    provider: c.provider,
    type: c.type,
    status: c.status,
    authScheme: c.authScheme,
    displayName: c.displayName,
    externalMerchantId: c.externalMerchantId,
    externalStoreId: c.externalStoreId,
    externalStoreName: c.externalStoreName,
    externalLocationId: c.externalLocationId,
    lastConnectedAt: c.lastConnectedAt?.toISOString() ?? null,
    lastAuthValidatedAt: c.lastAuthValidatedAt?.toISOString() ?? null,
    lastSyncAt: c.lastSyncAt?.toISOString() ?? null,
    lastSyncStatus: c.lastSyncStatus,
    reauthRequired: c.status === "REAUTH_REQUIRED",
    lastErrorCode: c.lastErrorCode,
    lastErrorMessage: c.lastErrorMessage,
    disconnectedAt: c.disconnectedAt?.toISOString() ?? null,
  }));
}

/**
 * Start the OAuth authorization flow for a provider.
 * Creates a ConnectionOAuthState row and returns the redirect URL.
 */
export async function startOAuthFlow(input: {
  tenantId: string;
  storeId: string;
  provider: ConnectionProvider;
  connectionType: ConnectionType;
  requestedByUserId: string;
  appBaseUrl: string;
}): Promise<{ redirectUrl: string; state: string }> {
  const { tenantId, storeId, provider, connectionType, requestedByUserId, appBaseUrl } = input;

  const appCredential = await resolveAppCredential(provider, tenantId);
  const adapter = getProviderAdapter(provider);
  const state = generateOpaqueToken(32);
  const redirectUri = buildRedirectUri(provider, appBaseUrl);

  const result = adapter.buildAuthorizationUrl({
    appCredential,
    redirectUri,
    state,
  });

  const expiresAt = new Date(Date.now() + OAUTH_STATE_TTL_MS);

  await prisma.connectionOAuthState.create({
    data: {
      tenantId,
      storeId,
      provider,
      connectionType,
      state,
      redirectUri,
      requestedByUserId,
      expiresAt,
    },
  });

  await recordActionLog({
    tenantId,
    storeId,
    provider,
    actionType: "CONNECT_START",
    status: "PENDING",
    actorUserId: requestedByUserId,
    message: `OAuth flow started for ${provider}`,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId: requestedByUserId,
    action: "integration.connect_start",
    targetType: "Connection",
    targetId: `${storeId}:${provider}`,
    metadata: { provider, connectionType },
  });

  return { redirectUrl: result.redirectUrl, state };
}

/**
 * Handle the OAuth callback from a provider.
 * Validates the state, exchanges the code for tokens, stores credentials,
 * and updates (or creates) the Connection record.
 */
export async function handleOAuthCallback(
  provider: ConnectionProvider,
  callbackInput: OAuthCallbackInput,
  appBaseUrl: string
): Promise<{ connectionId: string; storeId: string; tenantId: string }> {
  const { state, code, error, errorDescription } = callbackInput;

  // Load and validate state
  const oauthState = await prisma.connectionOAuthState.findUnique({
    where: { state },
  });

  if (!oauthState) {
    throw new Error("[integration] OAuth state not found or already consumed.");
  }
  if (oauthState.consumedAt) {
    throw new Error("[integration] OAuth state already consumed.");
  }
  if (oauthState.expiresAt < new Date()) {
    throw new Error("[integration] OAuth state has expired.");
  }
  if (oauthState.provider !== provider) {
    throw new Error("[integration] OAuth state provider mismatch.");
  }

  // Mark state as consumed
  await prisma.connectionOAuthState.update({
    where: { id: oauthState.id },
    data: { consumedAt: new Date() },
  });

  const { tenantId, storeId, connectionType, requestedByUserId } = oauthState;

  // Handle provider errors
  if (error) {
    await recordActionLog({
      tenantId,
      storeId,
      provider,
      actionType: "CONNECT_FAILURE",
      status: "FAILURE",
      actorUserId: requestedByUserId,
      errorCode: error,
      message: errorDescription ?? error,
    });
    throw new Error(`[integration] Provider returned error: ${error} — ${errorDescription ?? ""}`);
  }

  if (!code) {
    throw new Error("[integration] Authorization code missing from callback.");
  }

  const appCredential = await resolveAppCredential(provider, tenantId);
  const adapter = getProviderAdapter(provider);
  const redirectUri = buildRedirectUri(provider, appBaseUrl);

  let callbackResult;
  try {
    callbackResult = await adapter.handleOAuthCallback({
      appCredential,
      code,
      redirectUri,
      codeVerifier: oauthState.codeVerifier ?? undefined,
    });
  } catch (err) {
    await recordActionLog({
      tenantId,
      storeId,
      provider,
      actionType: "CONNECT_CALLBACK",
      status: "FAILURE",
      actorUserId: requestedByUserId,
      errorCode: "TOKEN_EXCHANGE_FAILED",
      message: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }

  // Upsert Connection
  const connection = await prisma.connection.upsert({
    where: { storeId_provider_type: { storeId, provider, type: connectionType } },
    create: {
      tenantId,
      storeId,
      type: connectionType,
      provider,
      status: "CONNECTED" as ConnectionStatus,
      authScheme: callbackResult.authScheme as AuthScheme,
      appCredentialId: appCredential.id,
      displayName: appCredential.displayName,
      externalMerchantId: callbackResult.providerAccount?.externalMerchantId ?? null,
      externalStoreId: callbackResult.providerAccount?.externalStoreId ?? null,
      externalStoreName: callbackResult.providerAccount?.externalStoreName ?? null,
      externalLocationId: callbackResult.providerAccount?.externalLocationId ?? null,
      lastConnectedAt: new Date(),
      lastAuthValidatedAt: new Date(),
      reauthRequiredAt: null,
      disconnectedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
    update: {
      status: "CONNECTED" as ConnectionStatus,
      authScheme: callbackResult.authScheme as AuthScheme,
      appCredentialId: appCredential.id,
      externalMerchantId: callbackResult.providerAccount?.externalMerchantId ?? undefined,
      externalStoreId: callbackResult.providerAccount?.externalStoreId ?? undefined,
      externalStoreName: callbackResult.providerAccount?.externalStoreName ?? undefined,
      externalLocationId: callbackResult.providerAccount?.externalLocationId ?? undefined,
      lastConnectedAt: new Date(),
      lastAuthValidatedAt: new Date(),
      reauthRequiredAt: null,
      disconnectedAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });

  // Store credentials (encrypted)
  await persistCredentials(connection.id, tenantId, storeId, callbackResult.credentialsToStore);

  await recordActionLog({
    tenantId,
    storeId,
    connectionId: connection.id,
    provider,
    actionType: "CONNECT_SUCCESS",
    status: "SUCCESS",
    actorUserId: requestedByUserId,
    message: `${provider} connected successfully`,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId: requestedByUserId,
    action: "integration.connected",
    targetType: "Connection",
    targetId: connection.id,
    metadata: {
      provider,
      connectionType,
      externalMerchantId: callbackResult.providerAccount?.externalMerchantId,
    },
  });

  return { connectionId: connection.id, storeId, tenantId };
}

/**
 * Refresh credentials for a connection using its stored refresh token.
 */
export async function refreshConnectionCredentials(
  connectionId: string,
  actorUserId?: string
): Promise<void> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: {
      credentials: { where: { isActive: true } },
    },
  });

  if (!connection) {
    throw new Error(`[integration] Connection ${connectionId} not found.`);
  }

  const { tenantId, storeId, provider } = connection;

  const appCredential = await resolveAppCredential(provider, tenantId);
  const adapter = getProviderAdapter(provider);

  if (!adapter.refreshCredentials) {
    throw new Error(`[integration] Provider ${provider} does not support credential refresh.`);
  }

  const activeCredentials = connection.credentials.map((c) =>
    decryptJson<DecryptedCredentialPayload>(c.configEncrypted)
  );

  const refreshResult = await adapter.refreshCredentials({ appCredential, activeCredentials });

  if (!refreshResult) {
    throw new Error(`[integration] Provider ${provider} returned no refresh result.`);
  }

  if (refreshResult.requiresReauth) {
    await prisma.connection.update({
      where: { id: connectionId },
      data: {
        status: "REAUTH_REQUIRED",
        reauthRequiredAt: new Date(),
        lastErrorCode: "REFRESH_FAILED",
        lastErrorMessage: "Token refresh requires re-authorization.",
      },
    });

    await recordActionLog({
      tenantId,
      storeId,
      connectionId,
      provider,
      actionType: "REFRESH_FAILURE",
      status: "FAILURE",
      actorUserId,
      errorCode: "REAUTH_REQUIRED",
      message: "Credential refresh failed; re-authorization required.",
    });
    return;
  }

  if (refreshResult.credentialsToStore.length > 0) {
    await persistCredentials(connectionId, tenantId, storeId, refreshResult.credentialsToStore);
  }

  await prisma.connection.update({
    where: { id: connectionId },
    data: {
      status: "CONNECTED",
      lastAuthValidatedAt: new Date(),
      reauthRequiredAt: null,
      lastErrorCode: null,
      lastErrorMessage: null,
    },
  });

  await recordActionLog({
    tenantId,
    storeId,
    connectionId,
    provider,
    actionType: "REFRESH_SUCCESS",
    status: "SUCCESS",
    actorUserId,
    message: "Credentials refreshed successfully.",
  });
}

/**
 * Disconnect a provider from a store (soft delete — marks status DISCONNECTED).
 */
export async function disconnectProvider(
  tenantId: string,
  storeId: string,
  provider: ConnectionProvider,
  connectionType: ConnectionType,
  actorUserId?: string
): Promise<void> {
  const connection = await prisma.connection.findUnique({
    where: { storeId_provider_type: { storeId, provider, type: connectionType } },
  });

  if (!connection) {
    throw new Error(`[integration] No connection found for ${provider}/${connectionType} on store ${storeId}.`);
  }

  await prisma.$transaction([
    prisma.connectionCredential.updateMany({
      where: { connectionId: connection.id, isActive: true },
      data: { isActive: false, rotatedAt: new Date() },
    }),
    prisma.connection.update({
      where: { id: connection.id },
      data: {
        status: "DISCONNECTED",
        disconnectedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
        reauthRequiredAt: null,
      },
    }),
  ]);

  await recordActionLog({
    tenantId,
    storeId,
    connectionId: connection.id,
    provider,
    actionType: "DISCONNECT",
    status: "SUCCESS",
    actorUserId,
    message: `${provider} disconnected from store ${storeId}.`,
  });

  await logAuditEvent({
    tenantId,
    storeId,
    actorUserId,
    action: "integration.disconnected",
    targetType: "Connection",
    targetId: connection.id,
    metadata: { provider, connectionType },
  });
}

/**
 * Get recent action logs for a store's connections (for UI display).
 */
export async function getConnectionActionLogs(
  tenantId: string,
  storeId: string,
  limit = 20
) {
  return prisma.connectionActionLog.findMany({
    where: { tenantId, storeId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
