/**
 * DoorDash provider adapter.
 *
 * DoorDash supports two auth patterns:
 *  1. OAuth 2.0 merchant authorization (connect a DoorDash merchant account)
 *  2. JWT Bearer authentication for Drive/Storefront API operations
 *
 * This adapter models both:
 *  - OAuth callback stores OAUTH_TOKEN credential(s).
 *  - JWT signing key (developer_id + key_id + signing_secret) is stored as
 *    JWT_SIGNING_KEY credential and used to mint short-lived JWT assertions
 *    at request time.
 *
 * Docs: https://developer.doordash.com/en-US/docs/drive/reference/authentication/
 */

import { createHmac } from "crypto";
import type {
  AuthorizationStartResult,
  CredentialRefreshResult,
  DecryptedCredentialPayload,
  OAuthCallbackResult,
  ProviderAppCredentialResolved,
  ProviderStoreCandidate,
} from "@/domains/integration/types";
import type { ConnectionProvider } from "@prisma/client";
import { registerProviderAdapter, type ProviderAdapter } from "./base";

const DOORDASH_AUTH_URL = "https://identity.doordash.com/connect/authorize";
const DOORDASH_TOKEN_URL = "https://identity.doordash.com/connect/token";
const DOORDASH_API_BASE = "https://openapi.doordash.com";

interface DoorDashTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface DoorDashStoreResponse {
  external_store_id: string;
  name: string;
  merchant_supplied_id?: string;
}

/**
 * Build a signed JWT assertion for DoorDash Drive API calls.
 * Uses HS256 (HMAC-SHA256).
 */
function buildDoorDashJwtAssertion(signingKey: string, developerId: string, keyId: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT", "dd-ver": "DD-JWT-V1", kid: keyId })
  ).toString("base64url");
  const nowSec = Math.floor(Date.now() / 1000);
  const payload = Buffer.from(
    JSON.stringify({
      aud: "doordash",
      iss: developerId,
      kid: keyId,
      exp: nowSec + 300, // 5-minute window
      iat: nowSec,
    })
  ).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const sig = createHmac("sha256", signingKey)
    .update(signingInput)
    .digest("base64url");
  return `${signingInput}.${sig}`;
}

class DoorDashAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "DOORDASH";
  readonly supportsPkce = false;
  readonly canRefreshCredentials = true;

  buildAuthorizationUrl(input: {
    appCredential: ProviderAppCredentialResolved;
    redirectUri: string;
    state: string;
  }): AuthorizationStartResult {
    const { appCredential, redirectUri, state } = input;

    const defaultScopes = ["manage.deliveries", "read.merchant"];
    const scopes =
      appCredential.scopes.length > 0 ? appCredential.scopes : defaultScopes;

    const params = new URLSearchParams({
      client_id: appCredential.clientId ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      scope: scopes.join(" "),
      state,
    });

    return {
      redirectUrl: `${DOORDASH_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  async handleOAuthCallback(input: {
    appCredential: ProviderAppCredentialResolved;
    code: string;
    redirectUri: string;
  }): Promise<OAuthCallbackResult> {
    const { appCredential, code, redirectUri } = input;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: appCredential.clientId ?? "",
      client_secret: appCredential.clientSecret ?? "",
    });

    const tokenRes = await fetch(DOORDASH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `[doordash] Token exchange failed (${tokenRes.status}): ${errText}`
      );
    }

    const tokens = (await tokenRes.json()) as DoorDashTokenResponse;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + tokens.expires_in * 1000);
    const refreshAfter = new Date(expiresAt.getTime() - 5 * 60 * 1000);

    const credentialsToStore: OAuthCallbackResult["credentialsToStore"] = [
      {
        credentialType: "OAUTH_TOKEN",
        authScheme: "OAUTH2",
        label: "DoorDash OAuth Token",
        payload: {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          accessToken: tokens.access_token,
          refreshToken: tokens.refresh_token,
          scopes: tokens.scope?.split(" "),
        },
        issuedAt,
        expiresAt,
        refreshAfter,
        canRefresh: !!tokens.refresh_token,
      },
    ];

    // If a JWT signing key was configured in the app credential, also store
    // it as a JWT_SIGNING_KEY credential so it can be used for Drive API calls.
    if (appCredential.clientSecret && appCredential.developerId && appCredential.keyId) {
      credentialsToStore.push({
        credentialType: "JWT_SIGNING_KEY",
        authScheme: "JWT_BEARER",
        label: "DoorDash Drive JWT Signing Key",
        payload: {
          credentialType: "JWT_SIGNING_KEY",
          authScheme: "JWT_BEARER",
          signingKey: appCredential.clientSecret,
          extra: {
            developerId: appCredential.developerId,
            keyId: appCredential.keyId,
          },
        },
        canRefresh: false,
      });
    }

    return {
      authScheme: "OAUTH2",
      credentialsToStore,
    };
  }

  async listAvailableStores(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<ProviderStoreCandidate[]> {
    const oauthCred = input.activeCredentials.find((c) => c.accessToken);
    if (!oauthCred?.accessToken) return [];

    const res = await fetch(`${DOORDASH_API_BASE}/merchant/v1/stores`, {
      headers: { Authorization: `Bearer ${oauthCred.accessToken}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { stores?: DoorDashStoreResponse[] };
    return (data.stores ?? []).map((s) => ({
      externalStoreId: s.external_store_id,
      externalStoreName: s.name,
      externalMerchantId: s.merchant_supplied_id ?? null,
    }));
  }

  async refreshCredentials(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<CredentialRefreshResult | undefined> {
    const cred = input.activeCredentials.find(
      (c) => c.credentialType === "OAUTH_TOKEN" && c.refreshToken
    );
    if (!cred?.refreshToken) return undefined;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cred.refreshToken,
      client_id: input.appCredential.clientId ?? "",
      client_secret: input.appCredential.clientSecret ?? "",
    });

    const tokenRes = await fetch(DOORDASH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const status = tokenRes.status;
      return {
        credentialsToStore: [],
        requiresReauth: status === 400 || status === 401,
      };
    }

    const tokens = (await tokenRes.json()) as DoorDashTokenResponse;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + tokens.expires_in * 1000);
    const refreshAfter = new Date(expiresAt.getTime() - 5 * 60 * 1000);

    return {
      credentialsToStore: [
        {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          label: "DoorDash OAuth Token",
          payload: {
            credentialType: "OAUTH_TOKEN",
            authScheme: "OAUTH2",
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token ?? cred.refreshToken,
            scopes: tokens.scope?.split(" "),
          },
          issuedAt,
          expiresAt,
          refreshAfter,
          canRefresh: true,
        },
      ],
    };
  }

  /**
   * Build a short-lived JWT assertion using the stored JWT_SIGNING_KEY credential.
   * Use this for DoorDash Drive API calls that require JWT Bearer auth.
   */
  buildJwtAssertion(signingCredential: DecryptedCredentialPayload): string {
    if (!signingCredential.signingKey) {
      throw new Error("[doordash] JWT_SIGNING_KEY credential is missing signingKey.");
    }
    const extra = signingCredential.extra ?? {};
    const developerId = extra["developerId"] as string | undefined;
    const keyId = extra["keyId"] as string | undefined;
    if (!developerId || !keyId) {
      throw new Error(
        "[doordash] JWT_SIGNING_KEY credential is missing developerId or keyId in extra."
      );
    }
    return buildDoorDashJwtAssertion(signingCredential.signingKey, developerId, keyId);
  }
}

const doorDashAdapter = new DoorDashAdapter();
registerProviderAdapter(doorDashAdapter);
export { doorDashAdapter };
