/**
 * DoorDash catalog publish adapter — Phase 4 (stub).
 *
 * All methods return a "not implemented" error until DoorDash Merchant API
 * integration is completed.
 *
 * TODO Phase 4+: Implement using DoorDash Drive / Merchant API.
 * Reference: https://developer.doordash.com/en-US/api/marketplace/
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";

const NOT_IMPLEMENTED: ProviderPublishResult = {
  success: false,
  responsePayload: { error: "DoorDash publish adapter is not yet implemented." },
};

export class DoorDashCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "DOORDASH";

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
