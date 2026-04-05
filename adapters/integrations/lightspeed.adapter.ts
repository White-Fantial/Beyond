/**
 * Lightspeed Restaurant (L-Series) provider adapter.
 *
 * Auth scheme: OAuth 2.0 Authorization Code with PKCE support.
 * Docs: https://developer.lightspeedhq.com/restaurant/authentication/oauth/
 *
 * Supports:
 *  - Catalog sync: business units (categories), menu items, modifier groups
 *  - Order forwarding via the Order API
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

const LIGHTSPEED_AUTH_URL = "https://auth.lightspeedhq.com/oauth/authorize";
const LIGHTSPEED_TOKEN_URL = "https://auth.lightspeedhq.com/oauth/token";
const LIGHTSPEED_API_BASE = "https://restaurant.lightspeedapp.com/api/2.0";

interface LightspeedTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  scope?: string;
}

interface LightspeedBusinessUnit {
  id: string;
  name: string;
  account_id?: string;
}

export interface LightspeedMenuItem {
  id: string;
  name: string;
  price?: number;
  category?: string;
}

export interface LightspeedModifierGroup {
  id: string;
  name: string;
  options?: Array<{ id: string; name: string; price?: number }>;
}

class LightspeedAdapter implements ProviderAdapter {
  readonly provider: ConnectionProvider = "LIGHTSPEED";
  readonly supportsPkce = true;
  readonly canRefreshCredentials = true;

  buildAuthorizationUrl(input: {
    appCredential: ProviderAppCredentialResolved;
    redirectUri: string;
    state: string;
    codeVerifier?: string;
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
      redirectUrl: `${LIGHTSPEED_AUTH_URL}?${params.toString()}`,
      state,
    };
  }

  async handleOAuthCallback(input: {
    appCredential: ProviderAppCredentialResolved;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<OAuthCallbackResult> {
    const { appCredential, code, redirectUri, codeVerifier } = input;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: appCredential.clientId ?? "",
      client_secret: appCredential.clientSecret ?? "",
    });

    if (codeVerifier) {
      body.set("code_verifier", codeVerifier);
    }

    const tokenRes = await fetch(LIGHTSPEED_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      const errText = await tokenRes.text();
      throw new Error(
        `[lightspeed] Token exchange failed (${tokenRes.status}): ${errText}`
      );
    }

    const tokens = (await tokenRes.json()) as LightspeedTokenResponse;

    const issuedAt = new Date();
    const expiresAt =
      tokens.expires_in != null
        ? new Date(issuedAt.getTime() + tokens.expires_in * 1000)
        : undefined;
    const refreshAfter =
      expiresAt != null
        ? new Date(expiresAt.getTime() - 5 * 60 * 1000)
        : undefined;

    // Fetch account info for external merchant ID
    let providerAccount: OAuthCallbackResult["providerAccount"] | undefined;
    try {
      const meRes = await fetch(`${LIGHTSPEED_API_BASE}/business_units`, {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      if (meRes.ok) {
        const data = (await meRes.json()) as { data?: LightspeedBusinessUnit[] };
        const first = data.data?.[0];
        if (first) {
          providerAccount = {
            externalMerchantId: first.account_id ?? null,
            externalStoreName: first.name,
          };
        }
      }
    } catch {
      // Non-fatal
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
          label: "Lightspeed OAuth Token",
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

    const res = await fetch(`${LIGHTSPEED_API_BASE}/business_units`, {
      headers: {
        Authorization: `Bearer ${cred.accessToken}`,
        Accept: "application/json",
      },
    });
    if (!res.ok) return [];

    const data = (await res.json()) as { data?: LightspeedBusinessUnit[] };
    return (data.data ?? []).map((unit) => ({
      externalStoreId: unit.id,
      externalStoreName: unit.name,
      externalMerchantId: unit.account_id ?? null,
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

    const tokenRes = await fetch(LIGHTSPEED_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    if (!tokenRes.ok) {
      return {
        credentialsToStore: [],
        requiresReauth: tokenRes.status === 400 || tokenRes.status === 401,
      };
    }

    const tokens = (await tokenRes.json()) as LightspeedTokenResponse;

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
          label: "Lightspeed OAuth Token",
          payload,
          issuedAt,
          expiresAt,
          refreshAfter,
          canRefresh: true,
        },
      ],
    };
  }

  /**
   * Fetch menu items from Lightspeed for catalog sync.
   */
  async fetchMenuItems(
    accessToken: string,
    businessUnitId: string
  ): Promise<LightspeedMenuItem[]> {
    const res = await fetch(
      `${LIGHTSPEED_API_BASE}/business_units/${businessUnitId}/menu_items`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: LightspeedMenuItem[] };
    return data.data ?? [];
  }

  /**
   * Fetch modifier groups from Lightspeed for catalog sync.
   */
  async fetchModifierGroups(
    accessToken: string,
    businessUnitId: string
  ): Promise<LightspeedModifierGroup[]> {
    const res = await fetch(
      `${LIGHTSPEED_API_BASE}/business_units/${businessUnitId}/modifier_groups`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: "application/json",
        },
      }
    );
    if (!res.ok) return [];
    const data = (await res.json()) as { data?: LightspeedModifierGroup[] };
    return data.data ?? [];
  }
}

const lightspeedAdapter = new LightspeedAdapter();
registerProviderAdapter(lightspeedAdapter);

export { lightspeedAdapter };
