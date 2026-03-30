/**
 * Uber Eats provider adapter.
 *
 * Auth scheme: OAuth 2.0 Authorization Code (merchant authorization flow).
 * The operating credential is a long-lived access token obtained after merchant auth.
 * Docs: https://developer.uber.com/docs/eats/guides/authentication
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

const UBER_AUTH_URL = "https://login.uber.com/oauth/v2/authorize";
const UBER_TOKEN_URL = "https://login.uber.com/oauth/v2/token";
const UBER_EATS_API_BASE = "https://api.uber.com/v1";

interface UberTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface UberEatsMerchantStore {
  store_id: string;
  name: string;
  merchant_uuid?: string;
  external_reference_id?: string;
}

interface UberEatsStoresResponse {
  data?: UberEatsMerchantStore[];
}

class UberEatsAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "UBER_EATS";
  readonly supportsPkce = false;
  readonly canRefreshCredentials = true;

  buildAuthorizationUrl(input: {
    appCredential: ProviderAppCredentialResolved;
    redirectUri: string;
    state: string;
  }): AuthorizationStartResult {
    const { appCredential, redirectUri, state } = input;

    const defaultScopes = ["eats.store", "eats.order"];
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
      redirectUrl: `${UBER_AUTH_URL}?${params.toString()}`,
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

    const tokenRes = await fetch(UBER_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `[uber-eats] Token exchange failed (${tokenRes.status}): ${errText}`
      );
    }

    const tokens = (await tokenRes.json()) as UberTokenResponse;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + tokens.expires_in * 1000);
    const refreshAfter = new Date(expiresAt.getTime() - 5 * 60 * 1000);

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
          label: "Uber Eats OAuth Token",
          payload,
          issuedAt,
          expiresAt,
          refreshAfter,
          canRefresh: !!tokens.refresh_token,
        },
      ],
    };
  }

  async listAvailableStores(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<ProviderStoreCandidate[]> {
    const cred = input.activeCredentials.find((c) => c.accessToken);
    if (!cred?.accessToken) return [];

    const res = await fetch(`${UBER_EATS_API_BASE}/eats/stores`, {
      headers: { Authorization: `Bearer ${cred.accessToken}` },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as UberEatsStoresResponse;
    return (data.data ?? []).map((s) => ({
      externalStoreId: s.store_id,
      externalStoreName: s.name,
      externalMerchantId: s.merchant_uuid ?? null,
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

    const tokenRes = await fetch(UBER_TOKEN_URL, {
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

    const tokens = (await tokenRes.json()) as UberTokenResponse;

    const issuedAt = new Date();
    const expiresAt = new Date(issuedAt.getTime() + tokens.expires_in * 1000);
    const refreshAfter = new Date(expiresAt.getTime() - 5 * 60 * 1000);

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
          label: "Uber Eats OAuth Token",
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

const uberEatsAdapter = new UberEatsAdapter();
registerProviderAdapter(uberEatsAdapter);
export { uberEatsAdapter };
