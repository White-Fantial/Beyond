import type { ConnectionProvider } from "@prisma/client";

export interface ProviderCapabilities {
  catalogSync: boolean;
  catalogPublish: boolean;
  orderWebhookIngestion: boolean;
  availabilitySync: boolean;
  supportsStoreDiscovery: boolean;
}

const DEFAULT_CAPABILITIES: ProviderCapabilities = {
  catalogSync: false,
  catalogPublish: false,
  orderWebhookIngestion: false,
  availabilitySync: false,
  supportsStoreDiscovery: false,
};

const PROVIDER_CAPABILITIES: Record<ConnectionProvider, ProviderCapabilities> = {
  LOYVERSE: {
    catalogSync: true,
    catalogPublish: true,
    orderWebhookIngestion: true,
    availabilitySync: false,
    supportsStoreDiscovery: false,
  },
  LIGHTSPEED: {
    catalogSync: true,
    catalogPublish: true,
    orderWebhookIngestion: false,
    availabilitySync: false,
    supportsStoreDiscovery: true,
  },
  UBER_EATS: {
    catalogSync: true,
    catalogPublish: true,
    orderWebhookIngestion: true,
    availabilitySync: true,
    supportsStoreDiscovery: true,
  },
  DOORDASH: {
    catalogSync: true,
    catalogPublish: true,
    orderWebhookIngestion: true,
    availabilitySync: true,
    supportsStoreDiscovery: true,
  },
  STRIPE: {
    catalogSync: false,
    catalogPublish: false,
    orderWebhookIngestion: false,
    availabilitySync: false,
    supportsStoreDiscovery: false,
  },
  OTHER: DEFAULT_CAPABILITIES,
};

export function getProviderCapabilities(provider: ConnectionProvider): ProviderCapabilities {
  return PROVIDER_CAPABILITIES[provider] ?? DEFAULT_CAPABILITIES;
}
