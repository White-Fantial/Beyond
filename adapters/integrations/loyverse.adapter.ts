/**
 * Loyverse provider adapter.
 *
 * Auth scheme: Standard OAuth 2.0 Authorization Code with token/refresh flow.
 * Docs: https://developer.loyverse.com/docs/#section/Authentication
 */

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

const LOYVERSE_AUTH_URL = "https://api.loyverse.com/oauth/authorize";
const LOYVERSE_TOKEN_URL = "https://api.loyverse.com/oauth/token";
const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0";

interface LoyverseTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface LoyverseMerchantResponse {
  id: string;
  business_name: string;
  stores?: Array<{ id: string; name: string }>;
}

class LoyverseAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "LOYVERSE";
  readonly supportsPkce = false;
  readonly canRefreshCredentials = true;

  buildAuthorizationUrl(input: {
    appCredential: ProviderAppCredentialResolved;
    redirectUri: string;
    state: string;
  }): AuthorizationStartResult {
    const { appCredential, redirectUri, state } = input;

    const params = new URLSearchParams({
      client_id: appCredential.clientId ?? "",
      redirect_uri: redirectUri,
      response_type: "code",
      state,
    });

    if (appCredential.scopes.length > 0) {
      params.set("scope", appCredential.scopes.join(" "));
    }

    return {
      redirectUrl: `${LOYVERSE_AUTH_URL}?${params.toString()}`,
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

    const tokenRes = await fetch(LOYVERSE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `[loyverse] Token exchange failed (${tokenRes.status}): ${errText}`
      );
    }

    const tokens = (await tokenRes.json()) as LoyverseTokenResponse;

    const issuedAt = new Date();
    const expiresAt =
      tokens.expires_in != null
        ? new Date(issuedAt.getTime() + tokens.expires_in * 1000)
        : undefined;
    // Refresh slightly before expiry
    const refreshAfter =
      expiresAt != null
        ? new Date(expiresAt.getTime() - 5 * 60 * 1000)
        : undefined;

    // Fetch merchant info to populate external IDs
    let providerAccount: OAuthCallbackResult["providerAccount"] | undefined;
    try {
      const meRes = await fetch(`${LOYVERSE_API_BASE}/merchant`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const merchant = (await meRes.json()) as LoyverseMerchantResponse;
        providerAccount = {
          externalMerchantId: merchant.id,
          externalStoreName: merchant.business_name,
        };
      }
    } catch {
      // Non-fatal — store external IDs when available
    }

    const payload: DecryptedCredentialPayload = {
      credentialType: "OAUTH_TOKEN",
      authScheme: "OAUTH2",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      scopes: tokens.scope?.split(" "),
    };

    return {
      authScheme: "OAUTH2",
      credentialsToStore: [
        {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          label: "Loyverse OAuth Token",
          payload,
          issuedAt,
          expiresAt,
          refreshAfter,
          canRefresh: !!tokens.refresh_token,
        },
      ],
      providerAccount,
    };
  }

  async listAvailableStores(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<ProviderStoreCandidate[]> {
    const cred = input.activeCredentials.find((c) => c.accessToken);
    if (!cred?.accessToken) return [];

    const res = await fetch(`${LOYVERSE_API_BASE}/stores`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { stores?: Array<{ id: string; name: string }> };
    return (data.stores ?? []).map((s) => ({
      externalStoreId: s.id,
      externalStoreName: s.name,
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

    const tokenRes = await fetch(LOYVERSE_TOKEN_URL, {
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

    const tokens = (await tokenRes.json()) as LoyverseTokenResponse;

    const issuedAt = new Date();
    const expiresAt =
      tokens.expires_in != null
        ? new Date(issuedAt.getTime() + tokens.expires_in * 1000)
        : undefined;
    const refreshAfter =
      expiresAt != null ? new Date(expiresAt.getTime() - 5 * 60 * 1000) : undefined;

    const payload: DecryptedCredentialPayload = {
      credentialType: "OAUTH_TOKEN",
      authScheme: "OAUTH2",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? cred.refreshToken,
      scopes: tokens.scope?.split(" "),
    };

    return {
      credentialsToStore: [
        {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          label: "Loyverse OAuth Token",
          payload,
          issuedAt,
          expiresAt,
          refreshAfter,
          canRefresh: true,
        },
      ],
    };
  }
}

const loyverseAdapter = new LoyverseAdapter();
registerProviderAdapter(loyverseAdapter);
export { loyverseAdapter };
