/**
 * Catalog Publish Service — Phase 4: One-way Publish from Beyond.
 *
 * Orchestrates outbound publish operations from the internal Beyond catalog
 * to external provider channels (Loyverse, Uber Eats, DoorDash, etc.).
 *
 * Architecture:
 *   internal entity → mapping lookup → provider payload → provider API → result persistence
 *
 * Key principles:
 *   - All publish operations originate from the internal canonical catalog.
 *   - External channels are destinations, not sources (external → internal is Phase 5+).
 *   - Mapping layer MUST be consulted: mapping present → UPDATE/ARCHIVE; absent → CREATE.
 *   - Internal catalog is NEVER rolled back on publish failure.
 *     Publish failure = external application failure only.
 *   - External normalized catalog (external_catalog_* tables) is still primarily
 *     refreshed via import, not assumed authoritative from publish success alone.
 *
 * TODO Phase 5: external change detection after import
 * TODO Phase 6: conflict detection between internal changes and external changes
 * TODO Phase 7: policy-based two-way sync
 *
 * PRODUCT_CATEGORY_LINK / PRODUCT_MODIFIER_GROUP_LINK publish:
 *   These link scopes are currently handled implicitly as part of PRODUCT publish
 *   (the product payload includes category_id and modifier_ids from active mappings).
 *   Standalone link publish endpoints are reserved for a future iteration.
 *   See TODO comments in publishEntity for details.
 */

import { prisma } from "@/lib/prisma";
import { decryptJson } from "@/lib/integrations/crypto";
import { createCatalogPublishAdapter } from "@/adapters/catalog/publish-index";
import { validatePublishPrerequisites } from "./catalog-publish/prerequisites";
import { computePublishHash } from "./catalog-publish/publish-hash";
import type {
  CatalogEntityType,
  CatalogPublishAction,
  CatalogPublishStatus,
  CatalogPublishScope,
  PublishEntityInput,
  PublishBulkInput,
  PublishConnectionInput,
  PublishEntityResult,
  PublishBulkResult,
  GetPublishJobsOptions,
  ProviderPublishInput,
} from "@/types/catalog-publish";
import type { DecryptedCredentialPayload } from "@/domains/integration/types";

// ─── Scope helper ─────────────────────────────────────────────────────────────

function entityTypeToScope(entityType: CatalogEntityType): CatalogPublishScope {
  return entityType as unknown as CatalogPublishScope;
}

// ─── Credential lookup ────────────────────────────────────────────────────────

async function getConnectionCredentials(connectionId: string): Promise<Record<string, string>> {
  const conn = await prisma.connection.findUnique({
    where: { id: connectionId },
    include: {
      credentials: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!conn) throw new Error(`Connection "${connectionId}" not found.`);
  const activeCredential = conn.credentials[0];
  if (!activeCredential) {
    throw new Error(`Connection "${connectionId}" has no active credential.`);
  }
  const decrypted = decryptJson<DecryptedCredentialPayload>(activeCredential.configEncrypted);
  return {
    accessToken: decrypted.accessToken ?? "",
    refreshToken: decrypted.refreshToken ?? "",
    externalStoreId: conn.externalStoreId ?? "",
    businessUnitId: conn.externalStoreId ?? "",
  };
}

// ─── Provider method dispatch ─────────────────────────────────────────────────

type AdapterMethodName =
  | "createCategory" | "updateCategory" | "archiveCategory" | "unarchiveCategory"
  | "createProduct" | "updateProduct" | "archiveProduct" | "unarchiveProduct"
  | "createModifierGroup" | "updateModifierGroup" | "archiveModifierGroup" | "unarchiveModifierGroup"
  | "createModifierOption" | "updateModifierOption" | "archiveModifierOption" | "unarchiveModifierOption";

const ADAPTER_METHOD_MAP: Record<string, Record<string, AdapterMethodName>> = {
  CATEGORY: { CREATE: "createCategory", UPDATE: "updateCategory", ARCHIVE: "archiveCategory", UNARCHIVE: "unarchiveCategory" },
  PRODUCT: { CREATE: "createProduct", UPDATE: "updateProduct", ARCHIVE: "archiveProduct", UNARCHIVE: "unarchiveProduct" },
  MODIFIER_GROUP: { CREATE: "createModifierGroup", UPDATE: "updateModifierGroup", ARCHIVE: "archiveModifierGroup", UNARCHIVE: "unarchiveModifierGroup" },
  MODIFIER_OPTION: { CREATE: "createModifierOption", UPDATE: "updateModifierOption", ARCHIVE: "archiveModifierOption", UNARCHIVE: "unarchiveModifierOption" },
};

async function dispatchToAdapter(
  adapter: ReturnType<typeof createCatalogPublishAdapter>,
  entityType: CatalogEntityType,
  action: CatalogPublishAction,
  input: ProviderPublishInput
): Promise<import("@/types/catalog-publish").ProviderPublishResult> {
  const methodName = ADAPTER_METHOD_MAP[entityType]?.[action];
  if (!methodName) {
    throw new Error(`No adapter method mapping for ${action} on ${entityType}.`);
  }
  type AdapterFnMap = Record<AdapterMethodName, ((i: ProviderPublishInput) => Promise<import("@/types/catalog-publish").ProviderPublishResult>) | undefined>;
  const fn = (adapter as unknown as AdapterFnMap)[methodName];
  if (typeof fn !== "function") {
    throw new Error(`Adapter "${adapter.provider}" does not implement ${methodName}.`);
  }
  return fn.call(adapter, input);
}

// ─── Mapping publish summary update ──────────────────────────────────────────

async function updateMappingPublishSummary(
  mappingId: string,
  status: CatalogPublishStatus,
  action: CatalogPublishAction,
  hash?: string | null,
  error?: string | null
) {
  await prisma.channelEntityMapping.update({
    where: { id: mappingId },
    data: {
      lastPublishedAt: new Date(),
      lastPublishStatus: status,
      lastPublishAction: action,
      ...(hash != null ? { lastPublishHash: hash } : {}),
      lastPublishError: error ?? null,
    },
  });
}

// ─── Core: publish single entity ──────────────────────────────────────────────

export async function publishEntityToConnection(
  input: PublishEntityInput
): Promise<PublishEntityResult> {
  const {
    tenantId,
    storeId,
    connectionId,
    internalEntityType,
    internalEntityId,
    action,
    requestedByUserId,
    triggerSource,
    onlyChanged = false,
  } = input;

  // 1. Load connection and get provider.
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { provider: true, tenantId: true, storeId: true, status: true },
  });
  if (!connection) {
    return {
      jobId: "",
      status: "FAILED",
      action,
      errorMessage: `Connection "${connectionId}" not found.`,
    };
  }

  // 2. Create adapter.
  let adapter: ReturnType<typeof createCatalogPublishAdapter>;
  try {
    adapter = createCatalogPublishAdapter(connection.provider);
  } catch (e) {
    return {
      jobId: "",
      status: "FAILED",
      action,
      errorMessage: (e as Error).message,
    };
  }

  // 3. Validate prerequisites (connection state, entity existence, mapping rules, dependencies).
  const validation = await validatePublishPrerequisites({
    tenantId,
    storeId,
    connectionId,
    internalEntityType,
    internalEntityId,
    action,
    adapter,
  });

  if (!validation.ok) {
    // Create a FAILED job to record the attempt.
    const job = await prisma.catalogPublishJob.create({
      data: {
        tenantId,
        storeId,
        connectionId,
        internalEntityType,
        internalEntityId,
        scope: entityTypeToScope(internalEntityType),
        action,
        status: "FAILED",
        requestedByUserId: requestedByUserId ?? null,
        triggerSource: triggerSource ?? null,
        errorCode: validation.errorCode ?? null,
        errorMessage: validation.errorMessage ?? null,
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });
    return {
      jobId: job.id,
      status: "FAILED",
      action,
      errorMessage: validation.errorMessage,
    };
  }

  const { activeMapping, internalEntity } = validation;

  // 4. onlyChanged: compute hash and compare (skip for ARCHIVE/UNARCHIVE).
  let currentHash: string | undefined;
  if (onlyChanged && action !== "ARCHIVE" && action !== "UNARCHIVE") {
    // Resolve linked ids for PRODUCT hashing.
    let linkedCategoryIds: string[] = [];
    let linkedModifierGroupIds: string[] = [];
    if (internalEntityType === "PRODUCT") {
      const [catLinks, mgLinks] = await Promise.all([
        prisma.catalogProductCategory.findMany({ where: { productId: internalEntityId }, select: { categoryId: true } }),
        prisma.catalogProductModifierGroup.findMany({ where: { productId: internalEntityId }, select: { modifierGroupId: true } }),
      ]);
      linkedCategoryIds = catLinks.map((l) => l.categoryId);
      linkedModifierGroupIds = mgLinks.map((l) => l.modifierGroupId);
    }
    currentHash = computePublishHash(internalEntityType, internalEntity ?? {}, {
      categoryIds: linkedCategoryIds,
      modifierGroupIds: linkedModifierGroupIds,
    });

    if (activeMapping?.id) {
      const existingMapping = await prisma.channelEntityMapping.findUnique({
        where: { id: activeMapping.id },
        select: { lastPublishHash: true },
      });
      if (existingMapping?.lastPublishHash === currentHash) {
        const job = await prisma.catalogPublishJob.create({
          data: {
            tenantId,
            storeId,
            connectionId,
            internalEntityType,
            internalEntityId,
            scope: entityTypeToScope(internalEntityType),
            action,
            status: "SKIPPED",
            requestedByUserId: requestedByUserId ?? null,
            triggerSource: triggerSource ?? null,
            startedAt: new Date(),
            completedAt: new Date(),
          },
        });
        return {
          jobId: job.id,
          status: "SKIPPED",
          action,
          skippedReason: "Hash matches lastPublishHash; entity unchanged since last publish.",
        };
      }
    }
  }

  // 5. Create job in PENDING state.
  const job = await prisma.catalogPublishJob.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      internalEntityType,
      internalEntityId,
      scope: entityTypeToScope(internalEntityType),
      action,
      status: "PENDING",
      requestedByUserId: requestedByUserId ?? null,
      triggerSource: triggerSource ?? null,
    },
  });

  // 6. Transition to RUNNING.
  await prisma.catalogPublishJob.update({
    where: { id: job.id },
    data: { status: "RUNNING", startedAt: new Date() },
  });

  try {
    // 7. Build provider input payload.
    // For PRODUCT: resolve external category/modifier-group ids from active mappings.
    let providerPayload: Record<string, unknown> = internalEntity ?? {};
    if (internalEntityType === "PRODUCT") {
      const [catLinks, mgLinks] = await Promise.all([
        prisma.catalogProductCategory.findMany({ where: { productId: internalEntityId }, select: { categoryId: true } }),
        prisma.catalogProductModifierGroup.findMany({ where: { productId: internalEntityId }, select: { modifierGroupId: true } }),
      ]);
      // Resolve external ids via active mappings.
      const externalCategoryId = await resolveExternalId(connectionId, "CATEGORY", catLinks.map((l) => l.categoryId));
      const externalModifierGroupIds = await resolveExternalIds(connectionId, "MODIFIER_GROUP", mgLinks.map((l) => l.modifierGroupId));
      providerPayload = {
        entity: internalEntity,
        externalCategoryId,
        externalModifierGroupIds,
      };
    }

    // 8. Call provider adapter.
    const credentials = await getConnectionCredentials(connectionId);
    const adapterInput: ProviderPublishInput = {
      connectionId,
      credentials,
      externalEntityId: activeMapping?.externalEntityId,
      payload: providerPayload,
      internalEntityId,
    };

    const result = await dispatchToAdapter(adapter, internalEntityType, action, adapterInput);

    // 9. Handle CREATE success: create or update mapping.
    if (result.success && action === "CREATE" && result.externalId) {
      // Check if a NEEDS_REVIEW or UNMATCHED mapping already exists for this external id.
      const existingReviewMapping = await prisma.channelEntityMapping.findFirst({
        where: {
          connectionId,
          externalEntityType: internalEntityType,
          externalEntityId: result.externalId,
          status: { in: ["NEEDS_REVIEW", "UNMATCHED"] },
        },
      });
      if (existingReviewMapping) {
        // Promote existing review mapping to ACTIVE.
        await prisma.channelEntityMapping.update({
          where: { id: existingReviewMapping.id },
          data: {
            status: "ACTIVE",
            source: "MANUAL",
            internalEntityId,
            internalEntityType,
            lastPublishedAt: new Date(),
            lastPublishStatus: "SUCCEEDED",
            lastPublishAction: "CREATE",
            lastPublishHash: currentHash ?? null,
            lastPublishError: null,
          },
        });
      } else {
        // Create new ACTIVE mapping.
        await prisma.channelEntityMapping.create({
          data: {
            tenantId,
            storeId,
            connectionId,
            internalEntityType,
            internalEntityId,
            externalEntityType: internalEntityType,
            externalEntityId: result.externalId,
            status: "ACTIVE",
            source: "MANUAL",
            linkedAt: new Date(),
            lastPublishedAt: new Date(),
            lastPublishStatus: "SUCCEEDED",
            lastPublishAction: "CREATE",
            lastPublishHash: currentHash ?? null,
            lastPublishError: null,
          },
        });
      }
    }

    // 10. Update mapping publish summary for UPDATE/ARCHIVE/UNARCHIVE.
    if (result.success && activeMapping?.id && action !== "CREATE") {
      await updateMappingPublishSummary(
        activeMapping.id,
        "SUCCEEDED",
        action,
        currentHash,
        null
      );
    }

    // 11. Finalize job.
    const finalStatus: CatalogPublishStatus = result.success ? "SUCCEEDED" : "FAILED";
    await prisma.catalogPublishJob.update({
      where: { id: job.id },
      data: {
        status: finalStatus,
        completedAt: new Date(),
        responsePayload: result.responsePayload ? (result.responsePayload as import("@prisma/client").Prisma.InputJsonValue) : undefined,
        errorMessage: result.success
          ? (result.warningMessage ?? null)
          : ((result.responsePayload?.["error"] as string) ?? "Provider call failed."),
      },
    });

    return {
      jobId: job.id,
      status: finalStatus,
      action,
      externalId: result.externalId,
      errorMessage: result.success ? undefined : ((result.responsePayload?.["error"] as string) ?? "Provider call failed."),
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    await prisma.catalogPublishJob.update({
      where: { id: job.id },
      data: {
        status: "FAILED",
        completedAt: new Date(),
        errorMessage,
      },
    });
    if (activeMapping?.id) {
      await updateMappingPublishSummary(activeMapping.id, "FAILED", action, null, errorMessage);
    }
    return {
      jobId: job.id,
      status: "FAILED",
      action,
      errorMessage,
    };
  }
}

// ─── Mapping id resolution helpers ───────────────────────────────────────────

async function resolveExternalId(
  connectionId: string,
  entityType: CatalogEntityType,
  internalIds: string[]
): Promise<string | null> {
  if (!internalIds.length) return null;
  const mapping = await prisma.channelEntityMapping.findFirst({
    where: { connectionId, internalEntityType: entityType, internalEntityId: { in: internalIds }, status: "ACTIVE" },
    select: { externalEntityId: true },
  });
  return mapping?.externalEntityId ?? null;
}

async function resolveExternalIds(
  connectionId: string,
  entityType: CatalogEntityType,
  internalIds: string[]
): Promise<string[]> {
  if (!internalIds.length) return [];
  const mappings = await prisma.channelEntityMapping.findMany({
    where: { connectionId, internalEntityType: entityType, internalEntityId: { in: internalIds }, status: "ACTIVE" },
    select: { externalEntityId: true },
  });
  return mappings.map((m) => m.externalEntityId);
}

// ─── Bulk publish ─────────────────────────────────────────────────────────────

export async function publishEntitiesBulk(input: PublishBulkInput): Promise<PublishBulkResult> {
  const { tenantId, storeId, connectionId, items, requestedByUserId, triggerSource, onlyChanged } = input;
  const results: PublishEntityResult[] = [];

  for (const item of items) {
    const result = await publishEntityToConnection({
      tenantId,
      storeId,
      connectionId,
      internalEntityType: item.internalEntityType,
      internalEntityId: item.internalEntityId,
      action: item.action,
      requestedByUserId,
      triggerSource: triggerSource ?? "BULK_UI",
      onlyChanged,
    });
    results.push(result);
  }

  return {
    total: results.length,
    succeeded: results.filter((r) => r.status === "SUCCEEDED").length,
    failed: results.filter((r) => r.status === "FAILED").length,
    skipped: results.filter((r) => r.status === "SKIPPED").length,
    jobs: results,
  };
}

// ─── Full connection publish ──────────────────────────────────────────────────

export async function publishCatalogForConnection(
  input: PublishConnectionInput
): Promise<PublishBulkResult> {
  const {
    tenantId,
    storeId,
    connectionId,
    entityTypes,
    requestedByUserId,
    triggerSource,
    onlyChanged,
  } = input;

  const targetTypes: CatalogEntityType[] = entityTypes ?? ["CATEGORY", "PRODUCT", "MODIFIER_GROUP", "MODIFIER_OPTION"];

  const items: Array<{ internalEntityType: CatalogEntityType; internalEntityId: string; action: CatalogPublishAction }> = [];

  for (const entityType of targetTypes) {
    // Entities with ACTIVE mappings → UPDATE
    const activeMappings = await prisma.channelEntityMapping.findMany({
      where: { connectionId, internalEntityType: entityType, status: "ACTIVE" },
      select: { internalEntityId: true },
    });
    for (const m of activeMappings) {
      items.push({ internalEntityType: entityType, internalEntityId: m.internalEntityId, action: "UPDATE" });
    }

    // Entities without any mapping → CREATE (find unmapped internal entities)
    const mappedInternalIds = await prisma.channelEntityMapping.findMany({
      where: { connectionId, internalEntityType: entityType, status: { not: "ARCHIVED" } },
      select: { internalEntityId: true },
    });
    const mappedIds = new Set(mappedInternalIds.map((m) => m.internalEntityId));

    const allEntities = await getAllEntitiesOfType(storeId, entityType);
    for (const entity of allEntities) {
      if (!mappedIds.has(entity.id)) {
        items.push({ internalEntityType: entityType, internalEntityId: entity.id, action: "CREATE" });
      }
    }
  }

  return publishEntitiesBulk({
    tenantId,
    storeId,
    connectionId,
    items,
    requestedByUserId,
    triggerSource: triggerSource ?? "SYSTEM",
    onlyChanged,
  });
}

async function getAllEntitiesOfType(storeId: string, entityType: CatalogEntityType): Promise<{ id: string }[]> {
  switch (entityType) {
    case "CATEGORY":
      return prisma.catalogCategory.findMany({ where: { storeId }, select: { id: true } });
    case "PRODUCT":
      return prisma.catalogProduct.findMany({ where: { storeId }, select: { id: true } });
    case "MODIFIER_GROUP":
      return prisma.catalogModifierGroup.findMany({ where: { storeId }, select: { id: true } });
    case "MODIFIER_OPTION":
      return prisma.catalogModifierOption.findMany({ where: { storeId }, select: { id: true } });
  }
}

// ─── Job queries ──────────────────────────────────────────────────────────────

export async function getPublishJobs(opts: GetPublishJobsOptions) {
  const { connectionId, status, internalEntityType, internalEntityId, limit = 50, offset = 0 } = opts;

  return prisma.catalogPublishJob.findMany({
    where: {
      connectionId,
      ...(status ? { status } : {}),
      ...(internalEntityType ? { internalEntityType } : {}),
      ...(internalEntityId ? { internalEntityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
  });
}

export async function getPublishJob(jobId: string) {
  return prisma.catalogPublishJob.findUnique({ where: { id: jobId } });
}

// ─── Retry ────────────────────────────────────────────────────────────────────

export async function retryPublishJob(jobId: string): Promise<PublishEntityResult> {
  const job = await prisma.catalogPublishJob.findUnique({ where: { id: jobId } });
  if (!job) {
    return { jobId, status: "FAILED", action: "UPDATE", errorMessage: "Job not found." };
  }
  if (job.status !== "FAILED") {
    return { jobId, status: "FAILED", action: job.action as CatalogPublishAction, errorMessage: `Job is in "${job.status}" state; only FAILED jobs can be retried.` };
  }
  if (!job.internalEntityType || !job.internalEntityId) {
    return { jobId, status: "FAILED", action: job.action as CatalogPublishAction, errorMessage: "Job is missing entity information required for retry." };
  }

  // Mark original job as CANCELLED.
  await prisma.catalogPublishJob.update({ where: { id: jobId }, data: { status: "CANCELLED" } });

  return publishEntityToConnection({
    tenantId: job.tenantId,
    storeId: job.storeId,
    connectionId: job.connectionId,
    internalEntityType: job.internalEntityType as CatalogEntityType,
    internalEntityId: job.internalEntityId,
    action: job.action as CatalogPublishAction,
    requestedByUserId: job.requestedByUserId ?? undefined,
    triggerSource: "API",
  });
}

// ─── Publish hash helper (exposed for tests / UI) ────────────────────────────

export { computePublishHash } from "./catalog-publish/publish-hash";
