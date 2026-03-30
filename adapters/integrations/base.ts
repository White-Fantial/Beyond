/**
 * Base provider adapter interface for store-level external channel integrations.
 *
 * Each provider (Loyverse, Uber Eats, DoorDash, …) implements this interface.
 * The adapter is responsible for:
 *  - Building the OAuth authorization URL
 *  - Handling the OAuth callback and exchanging tokens
 *  - Listing available external stores/locations after auth
 *  - Refreshing credentials when possible
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

export interface ProviderAdapter {
  /** Prisma enum value identifying this adapter */
  readonly provider: ConnectionProvider;

  /**
   * Build the OAuth authorization URL and return it together with the CSRF state
   * value that must be persisted in ConnectionOAuthState.
   */
  buildAuthorizationUrl(input: {
    appCredential: ProviderAppCredentialResolved;
    redirectUri: string;
    state: string;
    codeVerifier?: string;
  }): AuthorizationStartResult;

  /**
   * Exchange the authorization code for tokens and return the credentials
   * that should be encrypted and stored as ConnectionCredential rows.
   */
  handleOAuthCallback(input: {
    appCredential: ProviderAppCredentialResolved;
    code: string;
    redirectUri: string;
    codeVerifier?: string;
  }): Promise<OAuthCallbackResult>;

  /**
   * Optionally list external stores/locations available after authentication.
   * Not all providers expose a multi-location API; return undefined if unsupported.
   */
  listAvailableStores?(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<ProviderStoreCandidate[]>;

  /**
   * Attempt to refresh the primary access credential using a refresh token.
   * Return undefined if this provider does not support token refresh.
   */
  refreshCredentials?(input: {
    appCredential: ProviderAppCredentialResolved;
    activeCredentials: DecryptedCredentialPayload[];
  }): Promise<CredentialRefreshResult | undefined>;

  /**
   * Whether this provider supports PKCE (Proof Key for Code Exchange).
   */
  readonly supportsPkce: boolean;

  /**
   * Whether this adapter can programmatically refresh credentials without
   * user interaction (i.e. has a refresh_token flow).
   */
  readonly canRefreshCredentials: boolean;
}

/**
 * Registry of all available provider adapters.
 */
export const providerAdapterRegistry = new Map<ConnectionProvider, ProviderAdapter>();

/**
 * Register a provider adapter. Called by each adapter module at import time.
 */
export function registerProviderAdapter(adapter: ProviderAdapter): void {
  providerAdapterRegistry.set(adapter.provider, adapter);
}

/**
 * Retrieve a registered adapter or throw if not found.
 */
export function getProviderAdapter(provider: ConnectionProvider): ProviderAdapter {
  const adapter = providerAdapterRegistry.get(provider);
  if (!adapter) {
    throw new Error(`[integrations] No adapter registered for provider "${provider}".`);
  }
  return adapter;
}
