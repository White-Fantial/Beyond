import { disconnectPrisma, prisma } from "./client";

const defaultFlags = [
  {
    key: "catalog_sync_v2",
    name: "Catalog Sync V2",
    description:
      "Next-gen Catalog Sync engine. Uses new processing pipeline instead of legacy sync path.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "new_order_forwarding_ui",
    name: "New Order Forwarding UI",
    description: "New order forwarding UI. Replaces the legacy order forwarding screen.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "advanced_analytics",
    name: "Advanced Analytics",
    description: "Advanced analytics dashboard. Advanced stats view that can be enabled per store or tenant.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "billing_portal_enabled",
    name: "Billing Portal",
    description: "Enable self-serve billing portal access per tenant.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: true,
  },
  {
    key: "integrations_provider_rollout",
    name: "Integrations Provider Rollout",
    description: "Gradual rollout flag for new provider integration. Enabled by provider scope.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "subscription_portal_enabled",
    name: "Subscription Portal",
    description: "Enable the Subscription Management portal UI.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
  {
    key: "admin_experimental_page",
    name: "Admin Experimental Page",
    description: "Flag to expose experimental admin pages.",
    flagType: "BOOLEAN" as const,
    defaultBoolValue: false,
  },
];

export async function seedFeatureFlags() {
  for (const flag of defaultFlags) {
    await prisma.featureFlag.upsert({
      where: { key: flag.key },
      update: {},
      create: flag,
    });
  }
  console.log(`[seed] Feature flags seeded (${defaultFlags.length} flags).`);
}

// Allow running standalone: ts-node prisma/seeds/feature-flags.ts
if (require.main === module) {
  seedFeatureFlags()
    .catch(console.error)
    .finally(() => disconnectPrisma());
}
