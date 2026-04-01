import { isFlagEnabled } from "./evaluate";
import type { FlagEvaluationContext } from "@/types/feature-flags";
import { KNOWN_FLAGS } from "./defaults";

export async function isCatalogSyncV2Enabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.CATALOG_SYNC_V2, ctx);
}

export async function isNewOrderForwardingUiEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.NEW_ORDER_FORWARDING_UI, ctx);
}

export async function isAdvancedAnalyticsEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.ADVANCED_ANALYTICS, ctx);
}

export async function isBillingPortalEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.BILLING_PORTAL_ENABLED, ctx);
}

export async function isIntegrationsProviderRolloutEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.INTEGRATIONS_PROVIDER_ROLLOUT, ctx);
}

export async function isSubscriptionPortalEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.SUBSCRIPTION_PORTAL_ENABLED, ctx);
}

export async function isAdminExperimentalPageEnabled(ctx: FlagEvaluationContext = {}): Promise<boolean> {
  return isFlagEnabled(KNOWN_FLAGS.ADMIN_EXPERIMENTAL_PAGE, ctx);
}
