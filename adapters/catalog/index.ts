/**
 * Catalog import adapter factory (Phase 2).
 *
 * Returns the correct CatalogImportAdapter for a given provider string.
 */

export type { CatalogImportAdapter, FullCatalogPayload } from "./types";
export { LoyverseCatalogAdapter } from "./loyverse.adapter";
export { UberEatsCatalogAdapter } from "./uber-eats.adapter";
export { DoorDashCatalogAdapter } from "./doordash.adapter";

import type { CatalogImportAdapter } from "./types";
import { LoyverseCatalogAdapter } from "./loyverse.adapter";
import { UberEatsCatalogAdapter } from "./uber-eats.adapter";
import { DoorDashCatalogAdapter } from "./doordash.adapter";

export function createCatalogAdapter(provider: string): CatalogImportAdapter {
  switch (provider.toUpperCase()) {
    case "LOYVERSE":
      return new LoyverseCatalogAdapter();
    case "UBER_EATS":
      return new UberEatsCatalogAdapter();
    case "DOORDASH":
      return new DoorDashCatalogAdapter();
    default:
      throw new Error(
        `No catalog import adapter registered for provider "${provider}". ` +
          `Supported: LOYVERSE, UBER_EATS, DOORDASH.`
      );
  }
}
