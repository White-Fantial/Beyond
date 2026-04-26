/**
 * Uber Eats catalog publish adapter.
 *
 * Uber menu updates are menu-level writes (PUT /v2/eats/stores/{storeId}/menus).
 * This adapter reads the current menu document, applies a targeted entity mutation,
 * and writes the full menu payload back.
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";

const UBER_EATS_API_BASE = "https://api.uber.com";

type UberDictionary = Record<string, unknown>;

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("Uber Eats publish adapter: accessToken credential is required.");
  return token;
}

function getExternalStoreId(credentials: Record<string, string>): string {
  const externalStoreId = credentials["externalStoreId"] ?? credentials["businessUnitId"];
  if (!externalStoreId) {
    throw new Error("Uber Eats publish adapter: externalStoreId (or businessUnitId) is required.");
  }
  return externalStoreId;
}

async function uberRequest(
  method: "GET" | "PUT",
  storeId: string,
  token: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: UberDictionary | null }> {
  const res = await fetch(`${UBER_EATS_API_BASE}/v2/eats/stores/${storeId}/menus`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => null)) as UberDictionary | null;
  return { ok: res.ok, status: res.status, data };
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function upsertEntity(
  arr: unknown,
  payload: UberDictionary,
  externalEntityId: string | undefined
): UberDictionary[] {
  const list = Array.isArray(arr) ? ([...arr] as UberDictionary[]) : [];
  const targetId = externalEntityId ?? readString(payload["id"]);
  if (!targetId) {
    list.push(payload);
    return list;
  }
  const idx = list.findIndex((entry) => readString(entry["id"]) === targetId);
  if (idx >= 0) list[idx] = { ...list[idx], ...payload, id: targetId };
  else list.push({ ...payload, id: targetId });
  return list;
}

function mutateEntityStatus(
  arr: unknown,
  externalEntityId: string | undefined,
  fields: UberDictionary
): UberDictionary[] {
  if (!externalEntityId) return Array.isArray(arr) ? (arr as UberDictionary[]) : [];
  const list = Array.isArray(arr) ? ([...arr] as UberDictionary[]) : [];
  const idx = list.findIndex((entry) => readString(entry["id"]) === externalEntityId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...fields, id: externalEntityId };
  }
  return list;
}

function ensureMenusDocument(doc: UberDictionary | null): UberDictionary {
  if (doc && Array.isArray(doc["menus"]) && doc["menus"].length > 0) return doc;
  return {
    menus: [{ id: "default-menu", title: { translations: { en_us: "Menu" } } }],
  };
}

async function executeMenuMutation(
  input: ProviderPublishInput,
  mutate: (menu: UberDictionary) => UberDictionary
): Promise<ProviderPublishResult> {
  const token = getToken(input.credentials);
  const storeId = getExternalStoreId(input.credentials);

  const readRes = await uberRequest("GET", storeId, token);
  if (!readRes.ok) {
    return { success: false, responsePayload: readRes.data ?? { error: `GET menus failed (${readRes.status})` } };
  }

  const currentDoc = ensureMenusDocument(readRes.data);
  const menus = Array.isArray(currentDoc["menus"]) ? ([...currentDoc["menus"]] as UberDictionary[]) : [];
  const baseMenu = (menus[0] ?? {}) as UberDictionary;
  const updatedMenu = mutate(baseMenu);
  const nextDoc: UberDictionary = { ...currentDoc, menus: [updatedMenu, ...menus.slice(1)] };

  const writeRes = await uberRequest("PUT", storeId, token, nextDoc);
  if (!writeRes.ok) {
    return {
      success: false,
      responsePayload: writeRes.data ?? { error: `PUT menus failed (${writeRes.status})` },
      rawPayload: nextDoc,
    };
  }

  return {
    success: true,
    externalId: input.externalEntityId ?? readString((input.payload as UberDictionary)["id"]) ?? undefined,
    responsePayload: writeRes.data ?? undefined,
    rawPayload: nextDoc,
  };
}

export class UberEatsCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "UBER_EATS";

  async createCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: upsertEntity(menu["categories"], input.payload, undefined),
    }));
  }
  async updateCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: upsertEntity(menu["categories"], input.payload, input.externalEntityId),
    }));
  }
  async archiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: mutateEntityStatus(menu["categories"], input.externalEntityId, { active: false }),
    }));
  }
  async unarchiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: mutateEntityStatus(menu["categories"], input.externalEntityId, { active: true }),
    }));
  }
  async createProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const entityPayload = (input.payload as { entity?: UberDictionary }).entity ?? (input.payload as UberDictionary);
    return executeMenuMutation({ ...input, payload: entityPayload }, (menu) => ({
      ...menu,
      items: upsertEntity(menu["items"], entityPayload, undefined),
    }));
  }
  async updateProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const entityPayload = (input.payload as { entity?: UberDictionary }).entity ?? (input.payload as UberDictionary);
    return executeMenuMutation({ ...input, payload: entityPayload }, (menu) => ({
      ...menu,
      items: upsertEntity(menu["items"], entityPayload, input.externalEntityId),
    }));
  }
  async archiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      items: mutateEntityStatus(menu["items"], input.externalEntityId, { suspended: true }),
    }));
  }
  async unarchiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      items: mutateEntityStatus(menu["items"], input.externalEntityId, { suspended: false }),
    }));
  }
  async createModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: upsertEntity(menu["modifier_groups"], input.payload, undefined),
    }));
  }
  async updateModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: upsertEntity(menu["modifier_groups"], input.payload, input.externalEntityId),
    }));
  }
  async archiveModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: mutateEntityStatus(menu["modifier_groups"], input.externalEntityId, { suspended: true }),
    }));
  }
  async unarchiveModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: mutateEntityStatus(menu["modifier_groups"], input.externalEntityId, { suspended: false }),
    }));
  }
  async createModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: upsertEntity(menu["modifier_options"], input.payload, undefined),
    }));
  }
  async updateModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: upsertEntity(menu["modifier_options"], input.payload, input.externalEntityId),
    }));
  }
  async archiveModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: mutateEntityStatus(menu["modifier_options"], input.externalEntityId, { suspended: true }),
    }));
  }
  async unarchiveModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: mutateEntityStatus(menu["modifier_options"], input.externalEntityId, { suspended: false }),
    }));
  }
}
