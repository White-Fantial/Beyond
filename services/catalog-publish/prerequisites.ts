/**
 * Publish prerequisite validation — Phase 4.
 *
 * All validations run BEFORE a CatalogPublishJob is created.
 * Returns a descriptive error string on failure, null on success.
 *
 * Validation layers:
 *   1. Connection must be CONNECTED.
 *   2. Provider adapter must support the requested action for the entity type.
 *   3. Internal entity must exist within the correct store/tenant scope.
 *   4. Mapping rules:
 *      - CREATE  → no ACTIVE mapping must exist
 *      - UPDATE / ARCHIVE / UNARCHIVE → ACTIVE mapping required; BROKEN blocks publish
 *   5. Dependency checks (parent mappings for modifier options, etc.)
 *
 * TODO Phase 5: add external state validation (e.g. archived externally before ARCHIVE call)
 */

import { prisma } from "@/lib/prisma";
import type { CatalogEntityType } from "@/types/catalog-mapping";
import type { CatalogPublishAction, ProviderCatalogPublishAdapter } from "@/types/catalog-publish";

// ─── Adapter capability check ─────────────────────────────────────────────────

type CapabilityMethod = keyof ProviderCatalogPublishAdapter;

function adapterMethodFor(entityType: CatalogEntityType, action: CatalogPublishAction): CapabilityMethod {
  const prefix = action.toLowerCase() as "create" | "update" | "archive" | "unarchive";
  const suffix = {
    CATEGORY: "Category",
    PRODUCT: "Product",
    MODIFIER_GROUP: "ModifierGroup",
    MODIFIER_OPTION: "ModifierOption",
  }[entityType] as "Category" | "Product" | "ModifierGroup" | "ModifierOption";
  return `${prefix}${suffix}` as CapabilityMethod;
}

function adapterSupports(adapter: ProviderCatalogPublishAdapter, entityType: CatalogEntityType, action: CatalogPublishAction): boolean {
  const method = adapterMethodFor(entityType, action);
  return typeof (adapter as unknown as Record<string, unknown>)[method] === "function";
}

// ─── Internal entity lookup ───────────────────────────────────────────────────

async function getInternalEntity(storeId: string, entityType: CatalogEntityType, entityId: string) {
  switch (entityType) {
    case "CATEGORY":
      return prisma.catalogCategory.findFirst({ where: { id: entityId, storeId } });
    case "PRODUCT":
      return prisma.catalogProduct.findFirst({ where: { id: entityId, storeId } });
    case "MODIFIER_GROUP":
      return prisma.catalogModifierGroup.findFirst({ where: { id: entityId, storeId } });
    case "MODIFIER_OPTION":
      return prisma.catalogModifierOption.findFirst({ where: { id: entityId, storeId } });
  }
}

// ─── Public validator ─────────────────────────────────────────────────────────

export interface ValidatePublishInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  action: CatalogPublishAction;
  adapter: ProviderCatalogPublishAdapter;
}

export interface ValidatePublishResult {
  ok: boolean;
  errorCode?: string;
  errorMessage?: string;
  /** The ACTIVE mapping row, if found. */
  activeMapping?: {
    id: string;
    externalEntityId: string;
    externalEntityType: CatalogEntityType;
    status: string;
  } | null;
  /** The internal entity row (for payload building). */
  internalEntity?: Record<string, unknown> | null;
}

export async function validatePublishPrerequisites(
  input: ValidatePublishInput
): Promise<ValidatePublishResult> {
  const { tenantId, storeId, connectionId, internalEntityType, internalEntityId, action, adapter } = input;

  // 1. Connection must be CONNECTED.
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { status: true, tenantId: true, storeId: true },
  });
  if (!connection) {
    return { ok: false, errorCode: "CONNECTION_NOT_FOUND", errorMessage: "Connection not found." };
  }
  if (connection.tenantId !== tenantId || connection.storeId !== storeId) {
    return { ok: false, errorCode: "CONNECTION_SCOPE_MISMATCH", errorMessage: "Connection does not belong to this tenant/store." };
  }
  if (connection.status !== "CONNECTED") {
    return {
      ok: false,
      errorCode: "CONNECTION_NOT_CONNECTED",
      errorMessage: `Connection is not in CONNECTED state (current: ${connection.status}).`,
    };
  }

  // 2. Adapter capability check.
  if (!adapterSupports(adapter, internalEntityType, action)) {
    return {
      ok: false,
      errorCode: "UNSUPPORTED_ACTION",
      errorMessage: `Provider "${adapter.provider}" does not support ${action} for ${internalEntityType}.`,
    };
  }

  // 3. Internal entity must exist.
  const internalEntity = await getInternalEntity(storeId, internalEntityType, internalEntityId);
  if (!internalEntity) {
    return {
      ok: false,
      errorCode: "INTERNAL_ENTITY_NOT_FOUND",
      errorMessage: `Internal ${internalEntityType} "${internalEntityId}" not found in store "${storeId}".`,
    };
  }

  // 4. Mapping rules.
  const activeMapping = await prisma.channelEntityMapping.findFirst({
    where: {
      connectionId,
      internalEntityType,
      internalEntityId,
      status: "ACTIVE",
    },
    select: { id: true, externalEntityId: true, externalEntityType: true, status: true },
  });

  const brokenMapping = await prisma.channelEntityMapping.findFirst({
    where: {
      connectionId,
      internalEntityType,
      internalEntityId,
      status: "BROKEN",
    },
    select: { id: true },
  });

  if (action === "CREATE") {
    if (activeMapping) {
      return {
        ok: false,
        errorCode: "MAPPING_ALREADY_EXISTS",
        errorMessage: `An ACTIVE mapping already exists for ${internalEntityType} "${internalEntityId}". Use UPDATE instead.`,
      };
    }
  } else {
    // UPDATE / ARCHIVE / UNARCHIVE require ACTIVE mapping.
    if (brokenMapping && !activeMapping) {
      return {
        ok: false,
        errorCode: "MAPPING_BROKEN",
        errorMessage: `Mapping is BROKEN for ${internalEntityType} "${internalEntityId}". Repair the mapping before publishing.`,
      };
    }
    if (!activeMapping) {
      return {
        ok: false,
        errorCode: "MAPPING_NOT_FOUND",
        errorMessage: `No ACTIVE mapping found for ${internalEntityType} "${internalEntityId}". Create the entity externally first.`,
      };
    }
    if (activeMapping.externalEntityType !== internalEntityType) {
      return {
        ok: false,
        errorCode: "MAPPING_TYPE_MISMATCH",
        errorMessage: `Mapping type mismatch: internal=${internalEntityType}, external=${activeMapping.externalEntityType}.`,
      };
    }
  }

  // 5. Dependency check: MODIFIER_OPTION requires parent group mapping.
  if (internalEntityType === "MODIFIER_OPTION") {
    const option = internalEntity as { groupId?: string | null };
    const groupId = option.groupId;
    if (groupId) {
      const parentMapping = await prisma.channelEntityMapping.findFirst({
        where: { connectionId, internalEntityType: "MODIFIER_GROUP", internalEntityId: groupId, status: "ACTIVE" },
        select: { id: true },
      });
      if (!parentMapping) {
        return {
          ok: false,
          errorCode: "PARENT_MAPPING_MISSING",
          errorMessage: `Parent MODIFIER_GROUP "${groupId}" has no ACTIVE mapping. Publish the parent group before its options.`,
        };
      }
    }
  }

  // TODO Phase 5: validate that target external entity is still accessible (not archived externally).

  return {
    ok: true,
    activeMapping: activeMapping ?? null,
    internalEntity: internalEntity as Record<string, unknown>,
  };
}
