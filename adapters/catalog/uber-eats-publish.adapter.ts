/**
 * Uber Eats catalog publish adapter — Phase 4 (stub).
 *
 * All methods throw "not implemented" errors until the Uber Eats menu write API
 * integration is completed.
 *
 * TODO Phase 4+: Implement using Uber Eats Menu API v2.
 * Reference: https://developer.uber.com/docs/eats/api/v2/post-eats-stores-storeid-menus
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";

const NOT_IMPLEMENTED: ProviderPublishResult = {
  success: false,
  responsePayload: {
    error: "Uber Eats publish adapter is not yet implemented.",
    hint: "Uber Eats uses a full-menu PUT model; item-level publish requires menu ID context.",
  },
};

export class UberEatsCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "UBER_EATS";

  async createCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async updateCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async archiveCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async unarchiveCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async createProduct(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async updateProduct(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async archiveProduct(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async unarchiveProduct(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async createModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async updateModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async archiveModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async unarchiveModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async createModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async updateModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async archiveModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
  async unarchiveModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return NOT_IMPLEMENTED;
  }
}
