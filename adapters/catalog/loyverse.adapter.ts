/**
 * Loyverse catalog import adapter (Phase 2).
 *
 * Fetches the full catalog from Loyverse and returns raw data only.
 * Uses the existing LoyverseClient. No DB writes happen here.
 */

import { LoyverseClient } from "@/lib/integrations/loyverse/client";
import type {
  CatalogImportAdapter,
  FullCatalogPayload,
  RawCatalogCategory,
  RawCatalogProduct,
  RawCatalogModifierGroup,
  RawCatalogModifierOption,
  RawCatalogProductCategoryLink,
  RawCatalogProductModifierGroupLink,
} from "./types";

export class LoyverseCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "LOYVERSE";

  async fetchFullCatalog(input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    const accessToken = input.credentials["accessToken"] ?? input.credentials["configEncrypted"];
    if (!accessToken) {
      throw new Error("Loyverse adapter: accessToken credential is required");
    }

    const client = new LoyverseClient(accessToken);

    const [rawCategories, rawModifierGroups, rawItems] = await Promise.all([
      client.fetchAllCategories(),
      client.fetchAllModifierGroups(),
      client.fetchAllItems(),
    ]);

    const categories: RawCatalogCategory[] = rawCategories.map((cat) => ({
      externalId: cat.id,
      raw: cat as unknown as Record<string, unknown>,
    }));

    const modifierGroups: RawCatalogModifierGroup[] = rawModifierGroups.map((mg) => ({
      externalId: mg.id,
      raw: mg as unknown as Record<string, unknown>,
    }));

    const modifierOptions: RawCatalogModifierOption[] = rawModifierGroups.flatMap((mg) =>
      (mg.modifiers ?? []).map((mod) => ({
        externalId: mod.id,
        groupExternalId: mg.id,
        raw: mod as unknown as Record<string, unknown>,
      }))
    );

    const products: RawCatalogProduct[] = rawItems.map((item) => ({
      externalId: item.id,
      categoryExternalIds: item.category_id ? [item.category_id] : [],
      modifierGroupExternalIds: item.modifier_ids ?? [],
      raw: item as unknown as Record<string, unknown>,
    }));

    const productCategoryLinks: RawCatalogProductCategoryLink[] = rawItems.flatMap((item) =>
      item.category_id
        ? [{ productExternalId: item.id, categoryExternalId: item.category_id }]
        : []
    );

    const productModifierGroupLinks: RawCatalogProductModifierGroupLink[] = rawItems.flatMap(
      (item) =>
        (item.modifier_ids ?? []).map((mgId) => ({
          productExternalId: item.id,
          groupExternalId: mgId,
        }))
    );

    return {
      categories,
      products,
      modifierGroups,
      modifierOptions,
      productCategoryLinks,
      productModifierGroupLinks,
    };
  }
}
