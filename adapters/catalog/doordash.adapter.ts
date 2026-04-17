/**
 * DoorDash catalog import adapter (Phase 2).
 *
 * Stub implementation — returns empty catalog until DoorDash Drive/Merchant API credentials
 * and OAuth flow are implemented.
 *
 * TODO Phase 3: implement DoorDash Menu API calls using the store's JWT bearer token.
 */

import type { CatalogImportAdapter, FullCatalogPayload } from "./types";

export class DoorDashCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "DOORDASH";

  async fetchFullCatalog(_input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    // TODO Phase 3: call DoorDash Merchant API (GET /v1/businesses/{businessId}/menus)
    // and map response to FullCatalogPayload.
    return {
      categories: [],
      products: [],
      modifierGroups: [],
      modifierOptions: [],
      productCategoryLinks: [],
      productModifierGroupLinks: [],
    };
  }
}
