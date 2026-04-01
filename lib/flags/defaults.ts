// Known platform feature flag keys — stable identifiers referenced in code.
export const KNOWN_FLAGS = {
  CATALOG_SYNC_V2: "catalog_sync_v2",
  NEW_ORDER_FORWARDING_UI: "new_order_forwarding_ui",
  ADVANCED_ANALYTICS: "advanced_analytics",
  BILLING_PORTAL_ENABLED: "billing_portal_enabled",
  INTEGRATIONS_PROVIDER_ROLLOUT: "integrations_provider_rollout",
  SUBSCRIPTION_PORTAL_ENABLED: "subscription_portal_enabled",
  ADMIN_EXPERIMENTAL_PAGE: "admin_experimental_page",
} as const;

export type KnownFlagKey = (typeof KNOWN_FLAGS)[keyof typeof KNOWN_FLAGS];

// Hard-coded fallback defaults used when the flag is not found in the database.
export const FLAG_DEFAULTS: Record<string, boolean> = {
  [KNOWN_FLAGS.CATALOG_SYNC_V2]: false,
  [KNOWN_FLAGS.NEW_ORDER_FORWARDING_UI]: false,
  [KNOWN_FLAGS.ADVANCED_ANALYTICS]: false,
  [KNOWN_FLAGS.BILLING_PORTAL_ENABLED]: true,
  [KNOWN_FLAGS.INTEGRATIONS_PROVIDER_ROLLOUT]: false,
  [KNOWN_FLAGS.SUBSCRIPTION_PORTAL_ENABLED]: false,
  [KNOWN_FLAGS.ADMIN_EXPERIMENTAL_PAGE]: false,
};
