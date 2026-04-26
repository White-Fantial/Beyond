/**
 * DoorDash catalog import adapter.
 *
 * Fetches menu payloads from DoorDash and maps them into FullCatalogPayload.
 *
 * The DoorDash ecosystem may expose slightly different menu document shapes
 * depending on the product tier/environment, so this adapter reads multiple
 * known key variants defensively.
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

const DOORDASH_API_BASE = "https://openapi.doordash.com";

type DDRecord = Record<string, unknown>;

function asArray<T = DDRecord>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("DoorDash import adapter: accessToken credential is required.");
  return token;
}

function getExternalStoreId(credentials: Record<string, string>): string {
  const storeId = credentials["externalStoreId"] ?? credentials["businessUnitId"];
  if (!storeId) {
    throw new Error("DoorDash import adapter: externalStoreId (or businessUnitId) is required.");
  }
  return storeId;
}

function resolveExternalId(entity: DDRecord, fallbackPrefix: string, index: number): string {
  const id =
    readString(entity["id"]) ??
    readString(entity["uuid"]) ??
    readString(entity["merchant_supplied_id"]) ??
    readString(entity["merchantSuppliedId"]);
  return id ?? `${fallbackPrefix}-${index + 1}`;
}

export class DoorDashCatalogAdapter implements CatalogImportAdapter {
  readonly provider = "DOORDASH";

  async fetchFullCatalog(input: {
    connectionId: string;
    credentials: Record<string, string>;
  }): Promise<FullCatalogPayload> {
    const accessToken = getToken(input.credentials);
    const storeId = getExternalStoreId(input.credentials);

    const endpoint =
      input.credentials["menusEndpoint"] ??
      `${DOORDASH_API_BASE}/marketplace/api/v1/stores/${storeId}/menus`;

    const res = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`DoorDash import request failed (${res.status}): ${err}`);
    }

    const payload = (await res.json()) as DDRecord;
    const menus = asArray<DDRecord>(payload["menus"]).length
      ? asArray<DDRecord>(payload["menus"])
      : [payload];

    const categoryMap = new Map<string, RawCatalogCategory>();
    const productMap = new Map<string, RawCatalogProduct>();
    const modifierGroupMap = new Map<string, RawCatalogModifierGroup>();
    const modifierOptionMap = new Map<string, RawCatalogModifierOption>();
    const productCategoryLinksMap = new Map<string, RawCatalogProductCategoryLink>();
    const productModifierLinksMap = new Map<string, RawCatalogProductModifierGroupLink>();

    menus.forEach((menu, menuIndex) => {
      const categories = asArray<DDRecord>(menu["categories"]);
      categories.forEach((category, categoryIndex) => {
        const categoryId = resolveExternalId(category, `menu-${menuIndex + 1}-category`, categoryIndex);
        categoryMap.set(categoryId, { externalId: categoryId, raw: category });

        const itemIds = asArray<string>(category["item_ids"])
          .concat(asArray<string>(category["itemIds"]))
          .concat(asArray<string>(category["entities"]))
          .filter((v): v is string => typeof v === "string");

        itemIds.forEach((itemId) => {
          productCategoryLinksMap.set(`${itemId}:${categoryId}`, {
            productExternalId: itemId,
            categoryExternalId: categoryId,
          });
        });
      });

      const items = asArray<DDRecord>(menu["items"]);
      items.forEach((item, itemIndex) => {
        const itemId = resolveExternalId(item, `menu-${menuIndex + 1}-item`, itemIndex);
        const categoryExternalIds = asArray<string>(item["category_ids"])
          .concat(asArray<string>(item["categoryIds"]))
          .filter((v): v is string => typeof v === "string");
        const modifierGroupExternalIds = asArray<string>(item["modifier_group_ids"])
          .concat(asArray<string>(item["modifierGroupIds"]))
          .filter((v): v is string => typeof v === "string");

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

      const modifierGroups = asArray<DDRecord>(menu["modifier_groups"]).length
        ? asArray<DDRecord>(menu["modifier_groups"])
        : asArray<DDRecord>(menu["extras"]);

      modifierGroups.forEach((group, groupIndex) => {
        const groupId = resolveExternalId(group, `menu-${menuIndex + 1}-modifier-group`, groupIndex);
        modifierGroupMap.set(groupId, { externalId: groupId, raw: group });

        const optionIds = asArray<string>(group["option_ids"])
          .concat(asArray<string>(group["modifier_options_ids"]))
          .concat(asArray<string>(group["extra_option_ids"]))
          .filter((v): v is string => typeof v === "string");

        optionIds.forEach((optionId) => {
          modifierOptionMap.set(`${groupId}:${optionId}`, {
            externalId: optionId,
            groupExternalId: groupId,
            raw: { id: optionId },
          });
        });
      });

      const modifierOptions = asArray<DDRecord>(menu["modifier_options"]).length
        ? asArray<DDRecord>(menu["modifier_options"])
        : asArray<DDRecord>(menu["extra_options"]);

      modifierOptions.forEach((option, optionIndex) => {
        const optionId = resolveExternalId(option, `menu-${menuIndex + 1}-modifier-option`, optionIndex);
        const groupId =
          readString(option["modifier_group_id"]) ??
          readString(option["modifierGroupId"]) ??
          readString(option["extra_id"]) ??
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
