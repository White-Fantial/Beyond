/**
 * Lightspeed Restaurant (L-Series) catalog publish adapter.
 *
 * Endpoint family used: /api/2.0/business_units/{id}/...
 * OAuth bearer token required.
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";

const LIGHTSPEED_API_BASE = "https://restaurant.lightspeedapp.com/api/2.0";

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("Lightspeed publish adapter: accessToken credential is required.");
  return token;
}

function getBusinessUnitId(credentials: Record<string, string>): string {
  const businessUnitId = credentials["businessUnitId"] ?? credentials["externalStoreId"];
  if (!businessUnitId) {
    throw new Error("Lightspeed publish adapter: businessUnitId (or externalStoreId) is required.");
  }
  return businessUnitId;
}

async function lsRequest(
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  accessToken: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: Record<string, unknown> | null }> {
  const res = await fetch(`${LIGHTSPEED_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, data };
}

function unsupported(message: string): ProviderPublishResult {
  return { success: false, responsePayload: { error: message } };
}

export class LightspeedCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "LIGHTSPEED";

  async createCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const payload = input.payload;

    const res = await lsRequest("POST", `/business_units/${businessUnitId}/categories`, token, payload);
    if (!res.ok) return { success: false, responsePayload: res.data ?? { error: "create category failed" } };

    const data = res.data ?? {};
    return {
      success: true,
      externalId: (data["id"] as string) ?? undefined,
      responsePayload: data,
      rawPayload: payload,
    };
  }

  async updateCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for category update.");

    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const payload = input.payload;

    const res = await lsRequest("PUT", `/business_units/${businessUnitId}/categories/${input.externalEntityId}`, token, payload);
    return {
      success: res.ok,
      externalId: input.externalEntityId,
      responsePayload: res.data ?? undefined,
      rawPayload: payload,
    };
  }

  async archiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for category archive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/categories/${input.externalEntityId}`, token, { is_active: false });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async unarchiveCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for category unarchive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/categories/${input.externalEntityId}`, token, { is_active: true });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async createProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const payload = input.payload;

    const res = await lsRequest("POST", `/business_units/${businessUnitId}/menu_items`, token, payload);
    if (!res.ok) return { success: false, responsePayload: res.data ?? { error: "create product failed" } };

    const data = res.data ?? {};
    return {
      success: true,
      externalId: (data["id"] as string) ?? undefined,
      responsePayload: data,
      rawPayload: payload,
    };
  }

  async updateProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for product update.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const payload = input.payload;

    const res = await lsRequest("PUT", `/business_units/${businessUnitId}/menu_items/${input.externalEntityId}`, token, payload);
    return {
      success: res.ok,
      externalId: input.externalEntityId,
      responsePayload: res.data ?? undefined,
      rawPayload: payload,
    };
  }

  async archiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for product archive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/menu_items/${input.externalEntityId}`, token, { is_active: false });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async unarchiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for product unarchive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/menu_items/${input.externalEntityId}`, token, { is_active: true });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async createModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("POST", `/business_units/${businessUnitId}/modifier_groups`, token, input.payload);
    if (!res.ok) return { success: false, responsePayload: res.data ?? { error: "create modifier group failed" } };
    const data = res.data ?? {};
    return { success: true, externalId: (data["id"] as string) ?? undefined, responsePayload: data, rawPayload: input.payload };
  }

  async updateModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier group update.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PUT", `/business_units/${businessUnitId}/modifier_groups/${input.externalEntityId}`, token, input.payload);
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined, rawPayload: input.payload };
  }

  async archiveModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier group archive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/modifier_groups/${input.externalEntityId}`, token, { is_active: false });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async unarchiveModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier group unarchive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/modifier_groups/${input.externalEntityId}`, token, { is_active: true });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async createModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("POST", `/business_units/${businessUnitId}/modifier_options`, token, input.payload);
    if (!res.ok) return { success: false, responsePayload: res.data ?? { error: "create modifier option failed" } };
    const data = res.data ?? {};
    return { success: true, externalId: (data["id"] as string) ?? undefined, responsePayload: data, rawPayload: input.payload };
  }

  async updateModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier option update.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PUT", `/business_units/${businessUnitId}/modifier_options/${input.externalEntityId}`, token, input.payload);
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined, rawPayload: input.payload };
  }

  async archiveModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier option archive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/modifier_options/${input.externalEntityId}`, token, { is_active: false });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }

  async unarchiveModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    if (!input.externalEntityId) return unsupported("externalEntityId required for modifier option unarchive.");
    const token = getToken(input.credentials);
    const businessUnitId = getBusinessUnitId(input.credentials);
    const res = await lsRequest("PATCH", `/business_units/${businessUnitId}/modifier_options/${input.externalEntityId}`, token, { is_active: true });
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data ?? undefined };
  }
}
