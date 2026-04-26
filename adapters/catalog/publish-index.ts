/**
 * Catalog publish adapter factory — Phase 4.
 *
 * Returns the correct ProviderCatalogPublishAdapter for a given provider string.
 */

import type { ProviderCatalogPublishAdapter } from "@/types/catalog-publish";
import { LoyverseCatalogPublishAdapter } from "./loyverse-publish.adapter";
import { UberEatsCatalogPublishAdapter } from "./uber-eats-publish.adapter";
import { DoorDashCatalogPublishAdapter } from "./doordash-publish.adapter";
import { LightspeedCatalogPublishAdapter } from "./lightspeed-publish.adapter";

export type { ProviderCatalogPublishAdapter };
export { LoyverseCatalogPublishAdapter } from "./loyverse-publish.adapter";
export { UberEatsCatalogPublishAdapter } from "./uber-eats-publish.adapter";
export { DoorDashCatalogPublishAdapter } from "./doordash-publish.adapter";
export { LightspeedCatalogPublishAdapter } from "./lightspeed-publish.adapter";

export function createCatalogPublishAdapter(provider: string): ProviderCatalogPublishAdapter {
  switch (provider.toUpperCase()) {
    case "LOYVERSE":
      return new LoyverseCatalogPublishAdapter();
    case "UBER_EATS":
      return new UberEatsCatalogPublishAdapter();
    case "DOORDASH":
      return new DoorDashCatalogPublishAdapter();
    case "LIGHTSPEED":
      return new LightspeedCatalogPublishAdapter();
    default:
      throw new Error(
        `No catalog publish adapter registered for provider "${provider}". ` +
          `Supported: LOYVERSE, LIGHTSPEED, UBER_EATS, DOORDASH.`
      );
  }
}
