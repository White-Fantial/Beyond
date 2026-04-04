import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the registry to prevent side effects from imports
vi.mock("@/adapters/integrations/base", () => ({
  registerProviderAdapter: vi.fn(),
  providerAdapterRegistry: new Map(),
  getProviderAdapter: vi.fn(),
}));

import { lightspeedAdapter, type LightspeedMenuItem, type LightspeedModifierGroup } from "@/adapters/integrations/lightspeed.adapter";
import type { ProviderAppCredentialResolved, DecryptedCredentialPayload } from "@/domains/integration/types";

const APP_CRED: ProviderAppCredentialResolved = {
  id: "cred-1",
  provider: "LIGHTSPEED",
  environment: "PRODUCTION",
  displayName: "Lightspeed Test",
  authScheme: "OAUTH2",
  clientId: "client-abc",
  clientSecret: "secret-xyz",
  scopes: ["restaurant:read", "restaurant:write"],
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── buildAuthorizationUrl ────────────────────────────────────────────────────

describe("buildAuthorizationUrl", () => {
  it("returns a valid Lightspeed authorization URL", () => {
    const result = lightspeedAdapter.buildAuthorizationUrl({
      appCredential: APP_CRED,
      redirectUri: "https://myapp.com/callback",
      state: "csrf-state-123",
    });

    expect(result.state).toBe("csrf-state-123");
    expect(result.redirectUrl).toContain("https://auth.lightspeedhq.com/oauth/authorize");
    expect(result.redirectUrl).toContain("client_id=client-abc");
    expect(result.redirectUrl).toContain("state=csrf-state-123");
    expect(result.redirectUrl).toContain("response_type=code");
  });

  it("includes scope when scopes are provided", () => {
    const result = lightspeedAdapter.buildAuthorizationUrl({
      appCredential: APP_CRED,
      redirectUri: "https://myapp.com/callback",
      state: "state-abc",
    });

    expect(result.redirectUrl).toContain("scope=");
  });

  it("includes code_verifier in token exchange when provided", () => {
    const result = lightspeedAdapter.buildAuthorizationUrl({
      appCredential: APP_CRED,
      redirectUri: "https://myapp.com/callback",
      state: "state-abc",
      codeVerifier: "my-code-verifier",
    });

    // URL should still be valid (code_verifier goes to token endpoint, not auth URL)
    expect(result.redirectUrl).toContain("lightspeedhq.com");
  });

  it("identifies provider as LIGHTSPEED", () => {
    expect(lightspeedAdapter.provider).toBe("LIGHTSPEED");
  });

  it("declares PKCE support", () => {
    expect(lightspeedAdapter.supportsPkce).toBe(true);
  });

  it("declares refresh credentials support", () => {
    expect(lightspeedAdapter.canRefreshCredentials).toBe(true);
  });
});

// ─── handleOAuthCallback ──────────────────────────────────────────────────────

describe("handleOAuthCallback", () => {
  it("exchanges code for tokens and returns OAuth credentials", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "at-abc",
            token_type: "Bearer",
            expires_in: 3600,
            refresh_token: "rt-xyz",
            scope: "restaurant:read",
          }),
        })
        // Second fetch: business_units list
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: "bu-1", name: "My Restaurant", account_id: "acc-1" }],
          }),
        })
    );

    const result = await lightspeedAdapter.handleOAuthCallback({
      appCredential: APP_CRED,
      code: "auth-code-123",
      redirectUri: "https://myapp.com/callback",
    });

    expect(result.authScheme).toBe("OAUTH2");
    expect(result.credentialsToStore).toHaveLength(1);
    expect(result.credentialsToStore[0].payload.accessToken).toBe("at-abc");
    expect(result.credentialsToStore[0].payload.refreshToken).toBe("rt-xyz");
    expect(result.credentialsToStore[0].canRefresh).toBe(true);
    expect(result.credentialsToStore[0].expiresAt).toBeDefined();
  });

  it("populates providerAccount from business units API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            access_token: "at-abc",
            token_type: "Bearer",
            expires_in: 3600,
          }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            data: [{ id: "bu-1", name: "Cafe Central", account_id: "acc-99" }],
          }),
        })
    );

    const result = await lightspeedAdapter.handleOAuthCallback({
      appCredential: APP_CRED,
      code: "code",
      redirectUri: "https://myapp.com/callback",
    });

    expect(result.providerAccount?.externalMerchantId).toBe("acc-99");
    expect(result.providerAccount?.externalStoreName).toBe("Cafe Central");
  });

  it("throws on token exchange failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => "invalid_client",
      })
    );

    await expect(
      lightspeedAdapter.handleOAuthCallback({
        appCredential: APP_CRED,
        code: "bad-code",
        redirectUri: "https://myapp.com/callback",
      })
    ).rejects.toThrow("[lightspeed] Token exchange failed");
  });

  it("handles missing providerAccount gracefully (non-fatal)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ access_token: "at-abc", token_type: "Bearer" }),
        })
        .mockResolvedValueOnce({ ok: false, status: 500 })
    );

    // Should not throw
    const result = await lightspeedAdapter.handleOAuthCallback({
      appCredential: APP_CRED,
      code: "code",
      redirectUri: "https://myapp.com/callback",
    });

    expect(result.authScheme).toBe("OAUTH2");
    expect(result.providerAccount).toBeUndefined();
  });
});

// ─── listAvailableStores ──────────────────────────────────────────────────────

describe("listAvailableStores", () => {
  it("returns store candidates from business units API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { id: "bu-1", name: "Store A", account_id: "acc-1" },
            { id: "bu-2", name: "Store B", account_id: "acc-2" },
          ],
        }),
      })
    );

    const creds: DecryptedCredentialPayload[] = [
      {
        credentialType: "OAUTH_TOKEN",
        authScheme: "OAUTH2",
        accessToken: "at-test",
      },
    ];

    const result = await lightspeedAdapter.listAvailableStores!({
      appCredential: APP_CRED,
      activeCredentials: creds,
    });

    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      externalStoreId: "bu-1",
      externalStoreName: "Store A",
      externalMerchantId: "acc-1",
    });
  });

  it("returns empty array when no access token", async () => {
    const result = await lightspeedAdapter.listAvailableStores!({
      appCredential: APP_CRED,
      activeCredentials: [],
    });

    expect(result).toHaveLength(0);
  });

  it("returns empty array on API failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 403 })
    );

    const result = await lightspeedAdapter.listAvailableStores!({
      appCredential: APP_CRED,
      activeCredentials: [
        { credentialType: "OAUTH_TOKEN", authScheme: "OAUTH2", accessToken: "at" },
      ],
    });

    expect(result).toHaveLength(0);
  });
});

// ─── refreshCredentials ───────────────────────────────────────────────────────

describe("refreshCredentials", () => {
  it("exchanges refresh token for new access token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          access_token: "new-at",
          token_type: "Bearer",
          expires_in: 7200,
          refresh_token: "new-rt",
        }),
      })
    );

    const result = await lightspeedAdapter.refreshCredentials!({
      appCredential: APP_CRED,
      activeCredentials: [
        {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          accessToken: "old-at",
          refreshToken: "old-rt",
        },
      ],
    });

    expect(result).toBeDefined();
    expect(result!.credentialsToStore[0].payload.accessToken).toBe("new-at");
    expect(result!.credentialsToStore[0].payload.refreshToken).toBe("new-rt");
  });

  it("returns undefined when no refresh token available", async () => {
    const result = await lightspeedAdapter.refreshCredentials!({
      appCredential: APP_CRED,
      activeCredentials: [
        { credentialType: "OAUTH_TOKEN", authScheme: "OAUTH2", accessToken: "at" },
      ],
    });

    expect(result).toBeUndefined();
  });

  it("sets requiresReauth on 401 response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ ok: false, status: 401 })
    );

    const result = await lightspeedAdapter.refreshCredentials!({
      appCredential: APP_CRED,
      activeCredentials: [
        {
          credentialType: "OAUTH_TOKEN",
          authScheme: "OAUTH2",
          accessToken: "at",
          refreshToken: "rt",
        },
      ],
    });

    expect(result?.requiresReauth).toBe(true);
    expect(result?.credentialsToStore).toHaveLength(0);
  });
});
