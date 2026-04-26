/**
 * Uber Eats catalog import adapter.
 *
 * Fetches full menu payload(s) from Uber Eats and maps them into the generic
 * FullCatalogPayload shape used by the import service.
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

const UBER_EATS_API_BASE = "https://api.uber.com";

type UberDictionary = Record<string, unknown>;

function asArray<T = UberDictionary>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function resolveExternalId(entity: UberDictionary, fallbackPrefix: string, index: number): string {
  const id =
    readString(entity["id"]) ??
    readString(entity["uuid"]) ??
    readString(entity["external_id"]) ??
    readString(entity["externalId"]);
  return id ?? `${fallbackPrefix}-${index + 1}`;
}

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("Uber Eats import adapter: accessToken credential is required.");
  return token;
}

function getExternalStoreId(credentials: Record<string, string>): string {
  const externalStoreId = credentials["externalStoreId"] ?? credentials["businessUnitId"];
  if (!externalStoreId) {
    throw new Error("Uber Eats import adapter: externalStoreId (or businessUnitId) is required.");
  }
  return externalStoreId;
}

export class UberEatsCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "UBER_EATS";

  async fetchFullCatalog(_input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    const accessToken = getToken(_input.credentials);
    const storeId = getExternalStoreId(_input.credentials);

    const res = await fetch(`${UBER_EATS_API_BASE}/v2/eats/stores/${storeId}/menus`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Uber Eats import request failed (${res.status}): ${err}`);
    }

    const payload = (await res.json()) as UberDictionary;
    const menus = asArray<UberDictionary>(payload["menus"]);

    const categoryMap = new Map<string, RawCatalogCategory>();
    const productMap = new Map<string, RawCatalogProduct>();
    const modifierGroupMap = new Map<string, RawCatalogModifierGroup>();
    const modifierOptionMap = new Map<string, RawCatalogModifierOption>();
    const productCategoryLinksMap = new Map<string, RawCatalogProductCategoryLink>();
    const productModifierLinksMap = new Map<string, RawCatalogProductModifierGroupLink>();

    menus.forEach((menu, menuIndex) => {
      const categories = asArray<UberDictionary>(menu["categories"]);
      categories.forEach((category, categoryIndex) => {
        const categoryId = resolveExternalId(category, `menu-${menuIndex + 1}-category`, categoryIndex);
        categoryMap.set(categoryId, { externalId: categoryId, raw: category });

        const itemIds = asArray<string>(category["entities"])
          .concat(asArray<string>(category["item_ids"]))
          .filter((v): v is string => typeof v === "string");
        itemIds.forEach((itemId) => {
          productCategoryLinksMap.set(`${itemId}:${categoryId}`, {
            productExternalId: itemId,
            categoryExternalId: categoryId,
          });
        });
      });

      const items = asArray<UberDictionary>(menu["items"]);
      items.forEach((item, itemIndex) => {
        const itemId = resolveExternalId(item, `menu-${menuIndex + 1}-item`, itemIndex);
        const categoryExternalIds = asArray<string>(item["category_ids"]).filter(
          (v): v is string => typeof v === "string"
        );
        const modifierGroupExternalIds = asArray<string>(item["modifier_group_ids"]).filter(
          (v): v is string => typeof v === "string"
        );

        productMap.set(itemId, {
          externalId: itemId,
          categoryExternalIds,
          modifierGroupExternalIds,
          raw: item,
        });

        categoryExternalIds.forEach((categoryId) => {
          productCategoryLinksMap.set(`${itemId}:${categoryId}`, {
            productExternalId: itemId,
            categoryExternalId: categoryId,
          });
        });

        modifierGroupExternalIds.forEach((groupId) => {
          productModifierLinksMap.set(`${itemId}:${groupId}`, {
            productExternalId: itemId,
            groupExternalId: groupId,
          });
        });
      });

      const modifierGroups = asArray<UberDictionary>(menu["modifier_groups"]);
      modifierGroups.forEach((group, groupIndex) => {
        const groupId = resolveExternalId(group, `menu-${menuIndex + 1}-modifier-group`, groupIndex);
        modifierGroupMap.set(groupId, { externalId: groupId, raw: group });

        const optionIds = asArray<string>(group["modifier_options_ids"]).concat(
          asArray<string>(group["option_ids"])
        );
        optionIds
          .filter((v): v is string => typeof v === "string")
          .forEach((optionId) => {
            modifierOptionMap.set(`${groupId}:${optionId}`, {
              externalId: optionId,
              groupExternalId: groupId,
              raw: { id: optionId },
            });
          });
      });

      const modifierOptions = asArray<UberDictionary>(menu["modifier_options"]);
      modifierOptions.forEach((option, optionIndex) => {
        const optionId = resolveExternalId(option, `menu-${menuIndex + 1}-modifier-option`, optionIndex);
        const groupId =
          readString(option["modifier_group_id"]) ??
          readString(option["parent_modifier_group_id"]) ??
          `menu-${menuIndex + 1}-unknown-group`;

        modifierOptionMap.set(`${groupId}:${optionId}`, {
          externalId: optionId,
          groupExternalId: groupId,
          raw: option,
        });
      });
    });

    return {
      categories: Array.from(categoryMap.values()),
      products: Array.from(productMap.values()),
      modifierGroups: Array.from(modifierGroupMap.values()),
      modifierOptions: Array.from(modifierOptionMap.values()),
      productCategoryLinks: Array.from(productCategoryLinksMap.values()),
      productModifierGroupLinks: Array.from(productModifierLinksMap.values()),
    };
  }
}
