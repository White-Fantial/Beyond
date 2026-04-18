/**
 * Uber Eats catalog import adapter (Phase 2).
 *
 * Stub implementation — returns empty catalog until Uber Eats menu API credentials
 * and OAuth flow are implemented.
 *
 * TODO Phase 3: implement Uber Eats Menu API calls using the store's OAuth token.
 */

import type { CatalogImportAdapter, FullCatalogPayload } from "./types";

export class UberEatsCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "UBER_EATS";

  async fetchFullCatalog(_input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    // TODO Phase 3: call Uber Eats Menu API (GET /v1/eats/stores/{storeId}/menus)
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
