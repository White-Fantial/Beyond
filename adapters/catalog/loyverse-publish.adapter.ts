/**
 * Loyverse catalog publish adapter — Phase 4.
 *
 * Implements outbound publish for CATEGORY, PRODUCT, MODIFIER_GROUP, MODIFIER_OPTION.
 *
 * Status:
 *   - CATEGORY: create/update implemented (Loyverse v1.0 API)
 *   - PRODUCT: create/update implemented (Loyverse items API)
 *   - MODIFIER_GROUP: create/update — Loyverse API does not have a standalone modifier-set endpoint;
 *     modifier groups are managed as part of items. These methods emit warnings.
 *   - MODIFIER_OPTION: create/update — same constraint as modifier groups.
 *   - ARCHIVE: Loyverse does not support soft-delete on categories/products natively;
 *     adapter marks these as unsupported with a clear error.
 *
 * The adapter is responsible for HTTP calls ONLY.
 * Payload shaping is delegated to the payload builders in payload-builders/loyverse/.
 * DB writes (job status, mapping updates) are the responsibility of the service layer.
 */

import type {
  ProviderCatalogPublishAdapter,
  ProviderPublishInput,
  ProviderPublishResult,
} from "@/types/catalog-publish";
import {
  buildLoyverseCategoryCreate,
  buildLoyverseCategoryUpdate,
} from "@/services/catalog-publish/payload-builders/loyverse/category.builder";
import {
  buildLoyverseProductCreate,
  buildLoyverseProductUpdate,
} from "@/services/catalog-publish/payload-builders/loyverse/product.builder";

const LOYVERSE_API_BASE = "https://api.loyverse.com/v1.0";

async function loyverseRequest(
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH",
  path: string,
  accessToken: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const res = await fetch(`${LOYVERSE_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: body != null ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

function getToken(credentials: Record<string, string>): string {
  const token = credentials["accessToken"] ?? credentials["configEncrypted"];
  if (!token) throw new Error("Loyverse publish adapter: accessToken credential is required.");
  return token;
}

export class LoyverseCatalogPublishAdapter implements ProviderCatalogPublishAdapter {
  readonly provider = "LOYVERSE";

  // ─── Category ───────────────────────────────────────────────────────────────

  async createCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const payload = buildLoyverseCategoryCreate(input.payload as never);
    const res = await loyverseRequest("POST", "/categories", token, payload);
    if (!res.ok) {
      const errData = res.data as Record<string, unknown> | null;
      return {
        success: false,
        responsePayload: errData ?? undefined,
        rawPayload: payload as unknown as Record<string, unknown>,
      };
    }
    const data = res.data as Record<string, unknown>;
    return {
      success: true,
      externalId: (data["id"] as string) ?? undefined,
      responsePayload: data,
      rawPayload: payload as unknown as Record<string, unknown>,
    };
  }

  async updateCategory(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    if (!input.externalEntityId) {
      return { success: false, responsePayload: { error: "externalEntityId required for update" } };
    }
    const payload = buildLoyverseCategoryUpdate(input.payload as never, input.externalEntityId);
    const res = await loyverseRequest("PUT", `/categories/${input.externalEntityId}`, token, payload);
    if (!res.ok) {
      return { success: false, responsePayload: res.data as Record<string, unknown> };
    }
    return {
      success: true,
      externalId: input.externalEntityId,
      responsePayload: res.data as Record<string, unknown>,
    };
  }

  async archiveCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    // Loyverse v1 API does not support archiving categories natively.
    return {
      success: false,
      responsePayload: {
        error: "Loyverse does not support ARCHIVE for categories. Remove the category manually in the Loyverse dashboard.",
      },
    };
  }

  async unarchiveCategory(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return {
      success: false,
      responsePayload: { error: "Loyverse does not support UNARCHIVE for categories." },
    };
  }

  // ─── Product ────────────────────────────────────────────────────────────────

  async createProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    const rawPayload = input.payload as {
      entity: Record<string, unknown>;
      externalCategoryId?: string;
      externalModifierGroupIds?: string[];
    };
    const payload = buildLoyverseProductCreate(rawPayload.entity as never, {
      externalCategoryId: rawPayload.externalCategoryId,
      externalModifierGroupIds: rawPayload.externalModifierGroupIds,
    });
    const res = await loyverseRequest("POST", "/items", token, payload);
    if (!res.ok) {
      return { success: false, responsePayload: res.data as Record<string, unknown> };
    }
    const data = res.data as Record<string, unknown>;
    return {
      success: true,
      externalId: (data["id"] as string) ?? undefined,
      responsePayload: data,
    };
  }

  async updateProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    const token = getToken(input.credentials);
    if (!input.externalEntityId) {
      return { success: false, responsePayload: { error: "externalEntityId required for update" } };
    }
    const rawPayload = input.payload as {
      entity: Record<string, unknown>;
      externalCategoryId?: string;
      externalModifierGroupIds?: string[];
    };
    const payload = buildLoyverseProductUpdate(rawPayload.entity as never, input.externalEntityId, {
      externalCategoryId: rawPayload.externalCategoryId,
      externalModifierGroupIds: rawPayload.externalModifierGroupIds,
    });
    const res = await loyverseRequest("PUT", `/items/${input.externalEntityId}`, token, payload);
    if (!res.ok) {
      return { success: false, responsePayload: res.data as Record<string, unknown> };
    }
    return { success: true, externalId: input.externalEntityId, responsePayload: res.data as Record<string, unknown> };
  }

  async archiveProduct(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    // Loyverse supports deleting items via DELETE /items/:id.
    const token = getToken(input.credentials);
    if (!input.externalEntityId) {
      return { success: false, responsePayload: { error: "externalEntityId required for archive" } };
    }
    const res = await loyverseRequest("DELETE", `/items/${input.externalEntityId}`, token);
    return { success: res.ok, externalId: input.externalEntityId, responsePayload: res.data as Record<string, unknown> };
  }

  async unarchiveProduct(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return {
      success: false,
      responsePayload: { error: "Loyverse does not support UNARCHIVE for products. Re-create the item." },
    };
  }

  // ─── Modifier Group ─────────────────────────────────────────────────────────

  async createModifierGroup(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    // Loyverse modifier groups are embedded within items; standalone creation is not supported.
    return {
      success: false,
      responsePayload: {
        error:
          "Loyverse modifier groups cannot be created standalone. Attach them when creating/updating items.",
        internalEntityId: input.internalEntityId,
      },
      warningMessage: "MODIFIER_GROUP create not supported standalone in Loyverse.",
    };
  }

  async updateModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return {
      success: false,
      responsePayload: { error: "Loyverse modifier group standalone update not supported." },
    };
  }

  async archiveModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return { success: false, responsePayload: { error: "Loyverse modifier group archive not supported." } };
  }

  async unarchiveModifierGroup(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return { success: false, responsePayload: { error: "Loyverse modifier group unarchive not supported." } };
  }

  // ─── Modifier Option ────────────────────────────────────────────────────────

  async createModifierOption(input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return {
      success: false,
      responsePayload: {
        error: "Loyverse modifier options cannot be created standalone. Manage them through item modifier sets.",
        internalEntityId: input.internalEntityId,
      },
    };
  }

  async updateModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return { success: false, responsePayload: { error: "Loyverse modifier option standalone update not supported." } };
  }

  async archiveModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return { success: false, responsePayload: { error: "Loyverse modifier option archive not supported." } };
  }

  async unarchiveModifierOption(_input: ProviderPublishInput): Promise<ProviderPublishResult> {
    return { success: false, responsePayload: { error: "Loyverse modifier option unarchive not supported." } };
  }
}
