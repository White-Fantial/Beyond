/**
 * Lightspeed Restaurant (L-Series) catalog import adapter.
 *
 * Uses the Restaurant API v2.0 resources for business units, menu items,
 * and modifier groups.
 */

import type {
  CatalogImportAdapter,
  FullCatalogPayload,
  RawCatalogCategory,
  RawCatalogModifierGroup,
  RawCatalogModifierOption,
  RawCatalogProduct,
  RawCatalogProductCategoryLink,
  RawCatalogProductModifierGroupLink,
} from "./types";

const LIGHTSPEED_API_BASE = "https://restaurant.lightspeedapp.com/api/2.0";

interface LightspeedMenuItem {
  id: string;
  name?: string;
  category?: string;
  modifier_group_ids?: string[];
  [key: string]: unknown;
}

interface LightspeedModifierGroup {
  id: string;
  name?: string;
  options?: Array<{ id: string; name?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) {
    throw new Error("Lightspeed import adapter: accessToken credential is required");
  }
  return token;
}

function getBusinessUnitId(credentials: Record<string, string>): string {
  const businessUnitId = credentials["businessUnitId"] ?? credentials["externalStoreId"];
  if (!businessUnitId) {
    throw new Error("Lightspeed import adapter: businessUnitId (or externalStoreId) is required");
  }
  return businessUnitId;
}

async function request<T>(path: string, token: string): Promise<T[]> {
  const res = await fetch(`${LIGHTSPEED_API_BASE}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(`Lightspeed import request failed (${res.status}) for ${path}`);
  }

  const payload = (await res.json()) as { data?: T[] };
  return payload.data ?? [];
}

export class LightspeedCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "LIGHTSPEED";

  async fetchFullCatalog(input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    const accessToken = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);

    const [menuItems, modifierGroups] = await Promise.all([
      request<LightspeedMenuItem>(`/business_units/${businessUnitId}/menu_items`, accessToken),
      request<LightspeedModifierGroup>(`/business_units/${businessUnitId}/modifier_groups`, accessToken),
    ]);

    const categoryMap = new Map<string, RawCatalogCategory>();

    const products: RawCatalogProduct[] = menuItems.map((item) => {
      const categoryId = typeof item.category === "string" ? item.category : null;

      if (categoryId && !categoryMap.has(categoryId)) {
        categoryMap.set(categoryId, {
          externalId: categoryId,
          raw: { id: categoryId, name: categoryId },
        });
      }

      const mgIds = Array.isArray(item.modifier_group_ids)
        ? item.modifier_group_ids.filter((x): x is string => typeof x === "string")
        : [];

      return {
        externalId: item.id,
        categoryExternalIds: categoryId ? [categoryId] : [],
        modifierGroupExternalIds: mgIds,
        raw: item as Record<string, unknown>,
      };
    });

    const categories = Array.from(categoryMap.values());

    const mappedModifierGroups: RawCatalogModifierGroup[] = modifierGroups.map((mg) => ({
      externalId: mg.id,
      raw: mg as Record<string, unknown>,
    }));

    const modifierOptions: RawCatalogModifierOption[] = modifierGroups.flatMap((mg) =>
      (mg.options ?? []).map((opt) => ({
        externalId: opt.id,
        groupExternalId: mg.id,
        raw: opt as Record<string, unknown>,
      }))
    );

    const productCategoryLinks: RawCatalogProductCategoryLink[] = products.flatMap((p) =>
      p.categoryExternalIds.map((categoryExternalId) => ({
        productExternalId: p.externalId,
        categoryExternalId,
      }))
    );

    const productModifierGroupLinks: RawCatalogProductModifierGroupLink[] = products.flatMap(
      (p) =>
        p.modifierGroupExternalIds.map((groupExternalId) => ({
          productExternalId: p.externalId,
          groupExternalId,
        }))
    );

    return {
      categories,
      products,
      modifierGroups: mappedModifierGroups,
      modifierOptions,
      productCategoryLinks,
      productModifierGroupLinks,
    };
  }
}
