/**
 * DoorDash catalog publish adapter.
 *
 * Uses menu-document read/modify/write semantics similar to other delivery
 * channel adapters in this codebase.
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";
import {
  buildDoorDashCategoryCreate,
  buildDoorDashCategoryUpdate,
  buildDoorDashProductCreate,
  buildDoorDashProductUpdate,
} from "@/services/catalog-publish/payload-builders/doordash";

const DOORDASH_API_BASE = "https://openapi.doordash.com";

type DDRecord = Record<string, unknown>;

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("DoorDash publish adapter: accessToken credential is required.");
  return token;
}

function getExternalStoreId(credentials: Record<string, string>): string {
  const externalStoreId = credentials["externalStoreId"] ?? credentials["businessUnitId"];
  if (!externalStoreId) {
    throw new Error("DoorDash publish adapter: externalStoreId (or businessUnitId) is required.");
  }
  return externalStoreId;
}

function menuEndpoint(storeId: string, credentials: Record<string, string>): string {
  return credentials["menusEndpoint"] ?? `${DOORDASH_API_BASE}/marketplace/api/v1/stores/${storeId}/menus`;
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

async function doordashRequest(
  method: "GET" | "PUT",
  token: string,
  endpoint: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: DDRecord | null }> {
  const res = await fetch(endpoint, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
      ...(method === "PUT" ? { "Content-Type": "application/json" } : {}),
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => null)) as DDRecord | null;
  return { ok: res.ok, status: res.status, data };
}

function ensureMenuDocument(doc: DDRecord | null): DDRecord {
  if (doc && Array.isArray(doc["menus"]) && doc["menus"].length > 0) return doc;
  return {
    menus: [{ id: "default-menu", name: "Menu" }],
  };
}

function upsertEntity(arr: unknown, payload: DDRecord, externalEntityId?: string): DDRecord[] {
  const list = Array.isArray(arr) ? ([...arr] as DDRecord[]) : [];
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

function mutateEntityStatus(arr: unknown, externalEntityId: string | undefined, active: boolean): DDRecord[] {
  if (!externalEntityId) return Array.isArray(arr) ? (arr as DDRecord[]) : [];
  const list = Array.isArray(arr) ? ([...arr] as DDRecord[]) : [];
  const idx = list.findIndex((entry) => readString(entry["id"]) === externalEntityId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], id: externalEntityId, active };
  }
  return list;
}

async function executeMenuMutation(
  input: ProviderPublishInput,
  mutate: (menu: DDRecord) => DDRecord
): Promise<ProviderPublishResult> {
  const token = getToken(input.credentials);
  const storeId = getExternalStoreId(input.credentials);
  const endpoint = menuEndpoint(storeId, input.credentials);

  const readRes = await doordashRequest("GET", token, endpoint);
  if (!readRes.ok) {
    return { success: false, responsePayload: readRes.data ?? { error: `GET menus failed (${readRes.status})` } };
  }

  const currentDoc = ensureMenuDocument(readRes.data);
  const menus = Array.isArray(currentDoc["menus"]) ? ([...currentDoc["menus"]] as DDRecord[]) : [];
  const baseMenu = (menus[0] ?? {}) as DDRecord;
  const updatedMenu = mutate(baseMenu);
  const nextDoc: DDRecord = { ...currentDoc, menus: [updatedMenu, ...menus.slice(1)] };

  const writeRes = await doordashRequest("PUT", token, endpoint, nextDoc);
  if (!writeRes.ok) {
    return {
      success: false,
      responsePayload: writeRes.data ?? { error: `PUT menus failed (${writeRes.status})` },
      rawPayload: nextDoc,
    };
  }

  return {
    success: true,
    externalId: input.externalEntityId ?? readString((input.payload as DDRecord)["id"]) ?? undefined,
    responsePayload: writeRes.data ?? undefined,
    rawPayload: nextDoc,
  };
}

export class DoorDashCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "DOORDASH";

  async createCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const payload = buildDoorDashCategoryCreate(input.payload as DDRecord);
    return executeMenuMutation({ ...input, payload }, (menu) => ({
      ...menu,
      categories: upsertEntity(menu["categories"], payload),
    }));
  }

  async updateCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) {
      return { success: false, responsePayload: { error: "externalEntityId required for update" } };
    }
    const payload = buildDoorDashCategoryUpdate(input.payload as DDRecord, input.externalEntityId);
    return executeMenuMutation({ ...input, payload }, (menu) => ({
      ...menu,
      categories: upsertEntity(menu["categories"], payload, input.externalEntityId),
    }));
  }

  async archiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: mutateEntityStatus(menu["categories"], input.externalEntityId, false),
    }));
  }

  async unarchiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      categories: mutateEntityStatus(menu["categories"], input.externalEntityId, true),
    }));
  }

  async createProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const source = (input.payload as { entity?: DDRecord }).entity ?? (input.payload as DDRecord);
    const payload = buildDoorDashProductCreate(source);
    return executeMenuMutation({ ...input, payload }, (menu) => ({
      ...menu,
      items: upsertEntity(menu["items"], payload),
    }));
  }

  async updateProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) {
      return { success: false, responsePayload: { error: "externalEntityId required for update" } };
    }
    const source = (input.payload as { entity?: DDRecord }).entity ?? (input.payload as DDRecord);
    const payload = buildDoorDashProductUpdate(source, input.externalEntityId);
    return executeMenuMutation({ ...input, payload }, (menu) => ({
      ...menu,
      items: upsertEntity(menu["items"], payload, input.externalEntityId),
    }));
  }

  async archiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      items: mutateEntityStatus(menu["items"], input.externalEntityId, false),
    }));
  }

  async unarchiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      items: mutateEntityStatus(menu["items"], input.externalEntityId, true),
    }));
  }

  async createModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: upsertEntity(menu["modifier_groups"], input.payload),
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
      modifier_groups: mutateEntityStatus(menu["modifier_groups"], input.externalEntityId, false),
    }));
  }

  async unarchiveModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_groups: mutateEntityStatus(menu["modifier_groups"], input.externalEntityId, true),
    }));
  }

  async createModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: upsertEntity(menu["modifier_options"], input.payload),
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
      modifier_options: mutateEntityStatus(menu["modifier_options"], input.externalEntityId, false),
    }));
  }

  async unarchiveModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return executeMenuMutation(input, (menu) => ({
      ...menu,
      modifier_options: mutateEntityStatus(menu["modifier_options"], input.externalEntityId, true),
    }));
  }
}
