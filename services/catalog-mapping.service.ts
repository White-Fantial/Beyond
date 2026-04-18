/**
 * Catalog Mapping Service — Phase 3: Mapping & Linking Stabilization.
 *
 * Manages the channel_entity_mappings table that links internal catalog
 * entities (canonical Beyond catalog) to external catalog entities
 * (imported from external channels like Loyverse, Uber Eats, DoorDash).
 *
 * Architecture principle:
 *   - Internal entities live in catalog_* tables.
 *   - External entities live in external_catalog_* tables.
 *   - This service owns the ONLY bridge between them.
 *   - No publish / sync / external-write logic here (Phase 4+).
 *
 * TODO Phase 4:
 *   - publish jobs
 *   - internal → external outbound payload builders
 *   - mapping-based create/update/archive publish
 *
 * TODO Phase 5:
 *   - external change detection
 *   - field-level external diff logs
 *
 * TODO Phase 6:
 *   - conflict detection
 *   - review center for field/structure conflicts
 *
 * TODO Phase 7:
 *   - policy-based two-way sync
 */

import { prisma } from "@/lib/prisma";
import { ACTIVE_CONFIDENCE_THRESHOLD } from "./catalog-matchers/base";
import { UNMATCHED_INTERNAL_ENTITY_ID } from "@/lib/catalog/mapping-status";
import { matchCategory } from "./catalog-matchers/category.matcher";
import { matchProduct } from "./catalog-matchers/product.matcher";
import { matchModifierGroup } from "./catalog-matchers/modifier-group.matcher";
import { matchModifierOption } from "./catalog-matchers/modifier-option.matcher";
import type {
  CatalogEntityType,
  CatalogMappingStatus,
  CatalogMappingSource,
  MappingWithNames,
  MappingReviewSummary,
  UnmatchedExternalEntity,
  LinkEntityInput,
  RelinkEntityInput,
  UnlinkMappingInput,
  ListMappingsOptions,
} from "@/types/catalog-mapping";

// ─── Internal entity lookup helpers ──────────────────────────────────────────

async function getInternalCatalogEntity(
  storeId: string,
  entityType: CatalogEntityType,
  entityId: string
) {
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

async function getExternalCatalogEntity(
  connectionId: string,
  entityType: CatalogEntityType,
  externalId: string
) {
  switch (entityType) {
    case "CATEGORY":
      return prisma.externalCatalogCategory.findFirst({ where: { connectionId, externalId } });
    case "PRODUCT":
      return prisma.externalCatalogProduct.findFirst({ where: { connectionId, externalId } });
    case "MODIFIER_GROUP":
      return prisma.externalCatalogModifierGroup.findFirst({ where: { connectionId, externalId } });
    case "MODIFIER_OPTION":
      return prisma.externalCatalogModifierOption.findFirst({ where: { connectionId, externalId } });
  }
}

// ─── Read functions ───────────────────────────────────────────────────────────

export async function listMappingsByConnection(
  connectionId: string,
  opts: ListMappingsOptions = {}
): Promise<MappingWithNames[]> {
  const { status, entityType, page = 1, perPage = 50 } = opts;

  const rows = await prisma.channelEntityMapping.findMany({
    where: {
      connectionId,
      ...(status ? { status } : {}),
      ...(entityType ? { internalEntityType: entityType } : {}),
    },
    orderBy: { createdAt: "desc" },
    skip: (page - 1) * perPage,
    take: perPage,
  });

  return Promise.all(rows.map(async (row) => {
    const [internalEntity, externalEntity] = await Promise.all([
      row.status !== "UNMATCHED"
        ? getInternalCatalogEntity(row.storeId, row.internalEntityType as CatalogEntityType, row.internalEntityId)
        : null,
      getExternalCatalogEntity(row.connectionId, row.externalEntityType as CatalogEntityType, row.externalEntityId),
    ]);

    return {
      ...row,
      internalEntityType: row.internalEntityType as CatalogEntityType,
      externalEntityType: row.externalEntityType as CatalogEntityType,
      status: row.status as CatalogMappingStatus,
      source: row.source as CatalogMappingSource,
      internalEntityName: (internalEntity as { name?: string } | null)?.name ?? null,
      externalEntityName: (externalEntity as { normalizedName?: string } | null)?.normalizedName ?? null,
    };
  }));
}

export async function getMappingReviewSummary(
  connectionId: string
): Promise<MappingReviewSummary> {
  // Fetch all mappings for this connection.
  const all = await prisma.channelEntityMapping.findMany({
    where: { connectionId },
    select: { status: true, internalEntityType: true },
  });

  const entityTypes: CatalogEntityType[] = ["CATEGORY", "PRODUCT", "MODIFIER_GROUP", "MODIFIER_OPTION"];

  const totals = { active: 0, needsReview: 0, unmatched: 0, broken: 0, archived: 0 };
  for (const row of all) {
    if (row.status === "ACTIVE") totals.active++;
    else if (row.status === "NEEDS_REVIEW") totals.needsReview++;
    else if (row.status === "UNMATCHED") totals.unmatched++;
    else if (row.status === "BROKEN") totals.broken++;
    else if (row.status === "ARCHIVED") totals.archived++;
  }

  const byEntityType = entityTypes.map((et) => {
    const subset = all.filter((r) => r.internalEntityType === et);
    return {
      entityType: et,
      active: subset.filter((r) => r.status === "ACTIVE").length,
      needsReview: subset.filter((r) => r.status === "NEEDS_REVIEW").length,
      unmatched: subset.filter((r) => r.status === "UNMATCHED").length,
      broken: subset.filter((r) => r.status === "BROKEN").length,
    };
  });

  return { connectionId, totals, byEntityType };
}

export async function listUnmatchedExternalEntities(
  connectionId: string,
  entityType: CatalogEntityType
): Promise<UnmatchedExternalEntity[]> {
  // Find external entities with no non-archived, non-unmatched mapping.
  const existing = await prisma.channelEntityMapping.findMany({
    where: {
      connectionId,
      externalEntityType: entityType,
      status: { notIn: ["ARCHIVED"] },
    },
    select: { externalEntityId: true },
  });
  const alreadyMapped = new Set(existing.map((m) => m.externalEntityId));

  switch (entityType) {
    case "CATEGORY": {
      const rows = await prisma.externalCatalogCategory.findMany({ where: { connectionId } });
      return rows
        .filter((r) => !alreadyMapped.has(r.externalId))
        .map((r) => ({
          externalEntityId: r.externalId,
          externalEntityName: r.normalizedName ?? null,
          entityType,
          topCandidates: [],
        }));
    }
    case "PRODUCT": {
      const rows = await prisma.externalCatalogProduct.findMany({ where: { connectionId } });
      return rows
        .filter((r) => !alreadyMapped.has(r.externalId))
        .map((r) => ({
          externalEntityId: r.externalId,
          externalEntityName: r.normalizedName ?? null,
          entityType,
          topCandidates: [],
        }));
    }
    case "MODIFIER_GROUP": {
      const rows = await prisma.externalCatalogModifierGroup.findMany({ where: { connectionId } });
      return rows
        .filter((r) => !alreadyMapped.has(r.externalId))
        .map((r) => ({
          externalEntityId: r.externalId,
          externalEntityName: r.normalizedName ?? null,
          entityType,
          topCandidates: [],
        }));
    }
    case "MODIFIER_OPTION": {
      const rows = await prisma.externalCatalogModifierOption.findMany({ where: { connectionId } });
      return rows
        .filter((r) => !alreadyMapped.has(r.externalId))
        .map((r) => ({
          externalEntityId: r.externalId,
          externalEntityName: r.normalizedName ?? null,
          entityType,
          topCandidates: [],
        }));
    }
  }
}

export async function listInternalEntitiesForMapping(
  storeId: string,
  entityType: CatalogEntityType,
  search?: string
) {
  const searchFilter = search
    ? { name: { contains: search, mode: "insensitive" as const } }
    : {};

  switch (entityType) {
    case "CATEGORY":
      return prisma.catalogCategory.findMany({
        where: { storeId, deletedAt: null, ...searchFilter },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 50,
      });
    case "PRODUCT":
      return prisma.catalogProduct.findMany({
        where: { storeId, deletedAt: null, ...searchFilter },
        select: { id: true, name: true, basePriceAmount: true },
        orderBy: { name: "asc" },
        take: 50,
      });
    case "MODIFIER_GROUP":
      return prisma.catalogModifierGroup.findMany({
        where: { storeId, deletedAt: null, ...searchFilter },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
        take: 50,
      });
    case "MODIFIER_OPTION":
      return prisma.catalogModifierOption.findMany({
        where: { storeId, deletedAt: null, ...searchFilter },
        select: { id: true, name: true, priceDeltaAmount: true },
        orderBy: { name: "asc" },
        take: 50,
      });
  }
}

// ─── Write functions ──────────────────────────────────────────────────────────

/**
 * Create or update a mapping manually (OWNER / MANAGER action).
 *
 * Rules:
 *   - If a non-archived mapping already exists for the external entity in this
 *     connection, it is archived first.
 *   - The new mapping is created with source = MANUAL and status = ACTIVE.
 */
export async function linkEntityManually(input: LinkEntityInput) {
  const {
    tenantId,
    storeId,
    connectionId,
    internalEntityType,
    internalEntityId,
    externalEntityType,
    externalEntityId,
    notes,
  } = input;

  // Validate entity types match.
  if (internalEntityType !== externalEntityType) {
    throw new Error(
      `Entity type mismatch: internalEntityType=${internalEntityType} externalEntityType=${externalEntityType}`
    );
  }

  // Archive any existing non-archived mappings for the same external entity.
  await prisma.channelEntityMapping.updateMany({
    where: {
      connectionId,
      externalEntityType,
      externalEntityId,
      status: { notIn: ["ARCHIVED"] },
    },
    data: {
      status: "ARCHIVED",
      unlinkedAt: new Date(),
      notes: "Superseded by manual link",
    },
  });

  // Archive any existing non-archived mappings for the same internal entity.
  await prisma.channelEntityMapping.updateMany({
    where: {
      connectionId,
      internalEntityType,
      internalEntityId,
      status: { notIn: ["ARCHIVED"] },
    },
    data: {
      status: "ARCHIVED",
      unlinkedAt: new Date(),
      notes: "Superseded by manual link",
    },
  });

  return prisma.channelEntityMapping.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      internalEntityType,
      internalEntityId,
      externalEntityType,
      externalEntityId,
      status: "ACTIVE",
      source: "MANUAL",
      notes: notes ?? null,
      linkedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Change the internal entity a mapping points to (re-link).
 * The old mapping is archived; a new NEEDS_REVIEW mapping is created.
 */
export async function relinkEntity(input: RelinkEntityInput) {
  const { mappingId, newInternalEntityId, notes } = input;

  const existing = await prisma.channelEntityMapping.findUnique({ where: { id: mappingId } });
  if (!existing) throw new Error(`Mapping ${mappingId} not found`);

  // Archive the old mapping.
  await prisma.channelEntityMapping.update({
    where: { id: mappingId },
    data: {
      status: "ARCHIVED",
      unlinkedAt: new Date(),
      notes: "Re-linked to a different internal entity",
    },
  });

  // Archive any existing active mapping for the new internal entity in same connection.
  await prisma.channelEntityMapping.updateMany({
    where: {
      connectionId: existing.connectionId,
      internalEntityType: existing.internalEntityType,
      internalEntityId: newInternalEntityId,
      status: { notIn: ["ARCHIVED"] },
    },
    data: {
      status: "ARCHIVED",
      unlinkedAt: new Date(),
      notes: "Superseded by relink",
    },
  });

  return prisma.channelEntityMapping.create({
    data: {
      tenantId: existing.tenantId,
      storeId: existing.storeId,
      connectionId: existing.connectionId,
      internalEntityType: existing.internalEntityType,
      internalEntityId: newInternalEntityId,
      externalEntityType: existing.externalEntityType,
      externalEntityId: existing.externalEntityId,
      status: "NEEDS_REVIEW",
      source: "MANUAL",
      notes: notes ?? "Re-linked manually",
      linkedAt: new Date(),
      updatedAt: new Date(),
    },
  });
}

/**
 * Unlink a mapping — sets status to ARCHIVED and records unlinkedAt.
 */
export async function unlinkMapping(input: UnlinkMappingInput) {
  const { mappingId, reason } = input;
  return prisma.channelEntityMapping.update({
    where: { id: mappingId },
    data: {
      status: "ARCHIVED",
      unlinkedAt: new Date(),
      notes: reason ?? "Unlinked",
    },
  });
}

/**
 * Approve a NEEDS_REVIEW mapping — promotes it to ACTIVE.
 */
export async function approveMappingLink(mappingId: string) {
  return prisma.channelEntityMapping.update({
    where: { id: mappingId },
    data: { status: "ACTIVE", lastValidatedAt: new Date() },
  });
}

// ─── Auto-match ───────────────────────────────────────────────────────────────

/**
 * Run auto-match for all external entities in this connection.
 *
 * For each external entity that has no existing non-archived mapping, we score
 * all internal candidates and create the best match as either ACTIVE or
 * NEEDS_REVIEW.  Entities with no viable candidate get UNMATCHED rows.
 *
 * Returns summary counts.
 */
export async function autoMatchExternalEntities(connectionId: string): Promise<{
  categoriesMatched: number;
  productsMatched: number;
  modifierGroupsMatched: number;
  modifierOptionsMatched: number;
  totalUnmatched: number;
}> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { tenantId: true, storeId: true },
  });
  if (!connection) throw new Error(`Connection ${connectionId} not found`);

  const { tenantId, storeId } = connection;

  let categoriesMatched = 0;
  let productsMatched = 0;
  let modifierGroupsMatched = 0;
  let modifierOptionsMatched = 0;
  let totalUnmatched = 0;

  // ── Categories ──────────────────────────────────────────────────────────────

  const extCategories = await prisma.externalCatalogCategory.findMany({ where: { connectionId } });
  const intCategories = await prisma.catalogCategory.findMany({
    where: { storeId, deletedAt: null },
    select: { id: true, name: true, originConnectionId: true, originExternalRef: true, displayOrder: true, deletedAt: true },
  });

  for (const extCat of extCategories) {
    const alreadyMapped = await prisma.channelEntityMapping.findFirst({
      where: {
        connectionId,
        externalEntityType: "CATEGORY",
        externalEntityId: extCat.externalId,
        status: { notIn: ["ARCHIVED"] },
      },
    });
    if (alreadyMapped) continue;

    const result = matchCategory(
      { externalId: extCat.externalId, normalizedName: extCat.normalizedName, displayOrder: null },
      intCategories,
      connectionId
    );

    await upsertAutoMatchRow({
      tenantId, storeId, connectionId,
      entityType: "CATEGORY",
      externalEntityId: extCat.externalId,
      result,
    });

    if (result.best) categoriesMatched++;
    else totalUnmatched++;
  }

  // ── Products ────────────────────────────────────────────────────────────────

  const extProducts = await prisma.externalCatalogProduct.findMany({ where: { connectionId } });
  const intProducts = await prisma.catalogProduct.findMany({
    where: { storeId, deletedAt: null },
    select: { id: true, name: true, basePriceAmount: true, originConnectionId: true, originExternalRef: true, deletedAt: true },
  });

  for (const extProd of extProducts) {
    const alreadyMapped = await prisma.channelEntityMapping.findFirst({
      where: {
        connectionId,
        externalEntityType: "PRODUCT",
        externalEntityId: extProd.externalId,
        status: { notIn: ["ARCHIVED"] },
      },
    });
    if (alreadyMapped) continue;

    const result = matchProduct(
      {
        externalId: extProd.externalId,
        normalizedName: extProd.normalizedName,
        normalizedPriceAmount: extProd.normalizedPriceAmount,
      },
      intProducts,
      connectionId
    );

    await upsertAutoMatchRow({
      tenantId, storeId, connectionId,
      entityType: "PRODUCT",
      externalEntityId: extProd.externalId,
      result,
    });

    if (result.best) productsMatched++;
    else totalUnmatched++;
  }

  // ── Modifier Groups ──────────────────────────────────────────────────────────

  const extGroups = await prisma.externalCatalogModifierGroup.findMany({ where: { connectionId } });
  const intGroups = await prisma.catalogModifierGroup.findMany({
    where: { storeId, deletedAt: null },
    select: { id: true, name: true, selectionMin: true, selectionMax: true, isRequired: true, originConnectionId: true, originExternalRef: true, deletedAt: true },
  });

  for (const extGrp of extGroups) {
    const alreadyMapped = await prisma.channelEntityMapping.findFirst({
      where: {
        connectionId,
        externalEntityType: "MODIFIER_GROUP",
        externalEntityId: extGrp.externalId,
        status: { notIn: ["ARCHIVED"] },
      },
    });
    if (alreadyMapped) continue;

    const result = matchModifierGroup(
      { externalId: extGrp.externalId, normalizedName: extGrp.normalizedName },
      intGroups,
      connectionId
    );

    await upsertAutoMatchRow({
      tenantId, storeId, connectionId,
      entityType: "MODIFIER_GROUP",
      externalEntityId: extGrp.externalId,
      result,
    });

    if (result.best) modifierGroupsMatched++;
    else totalUnmatched++;
  }

  // ── Modifier Options ─────────────────────────────────────────────────────────

  const extOptions = await prisma.externalCatalogModifierOption.findMany({ where: { connectionId } });
  const intOptions = await prisma.catalogModifierOption.findMany({
    where: { storeId, deletedAt: null },
    select: { id: true, name: true, priceDeltaAmount: true, modifierGroupId: true, originConnectionId: true, originExternalRef: true, deletedAt: true },
  });

  // Build a set of internal group IDs already mapped for each external group.
  const groupMappings = await prisma.channelEntityMapping.findMany({
    where: { connectionId, externalEntityType: "MODIFIER_GROUP", status: "ACTIVE" },
    select: { externalEntityId: true, internalEntityId: true },
  });
  const extGroupToIntGroupIds = new Map<string, Set<string>>();
  for (const gm of groupMappings) {
    if (!extGroupToIntGroupIds.has(gm.externalEntityId)) {
      extGroupToIntGroupIds.set(gm.externalEntityId, new Set());
    }
    extGroupToIntGroupIds.get(gm.externalEntityId)!.add(gm.internalEntityId);
  }

  for (const extOpt of extOptions) {
    const alreadyMapped = await prisma.channelEntityMapping.findFirst({
      where: {
        connectionId,
        externalEntityType: "MODIFIER_OPTION",
        externalEntityId: extOpt.externalId,
        status: { notIn: ["ARCHIVED"] },
      },
    });
    if (alreadyMapped) continue;

    const parentGroupIds = extOpt.externalParentId
      ? extGroupToIntGroupIds.get(extOpt.externalParentId) ?? new Set<string>()
      : new Set<string>();

    const result = matchModifierOption(
      {
        externalId: extOpt.externalId,
        normalizedName: extOpt.normalizedName,
        normalizedPriceAmount: extOpt.normalizedPriceAmount,
        groupExternalId: extOpt.externalParentId,
      },
      intOptions,
      connectionId,
      parentGroupIds
    );

    await upsertAutoMatchRow({
      tenantId, storeId, connectionId,
      entityType: "MODIFIER_OPTION",
      externalEntityId: extOpt.externalId,
      result,
    });

    if (result.best) modifierOptionsMatched++;
    else totalUnmatched++;
  }

  return { categoriesMatched, productsMatched, modifierGroupsMatched, modifierOptionsMatched, totalUnmatched };
}

/** Internal helper to write a single auto-match result row. */
async function upsertAutoMatchRow(opts: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  entityType: CatalogEntityType;
  externalEntityId: string;
  result: { best: import("@/types/catalog-mapping").MatchCandidate | null; allCandidates: import("@/types/catalog-mapping").MatchCandidate[] };
}) {
  const { tenantId, storeId, connectionId, entityType, externalEntityId, result } = opts;
  const now = new Date();

  if (!result.best) {
    // UNMATCHED placeholder — uses externalEntityId as the internalEntityId sentinel.
    await prisma.channelEntityMapping.create({
      data: {
        tenantId,
        storeId,
        connectionId,
        internalEntityType: entityType,
        internalEntityId: UNMATCHED_INTERNAL_ENTITY_ID, // No match — see lib/catalog/mapping-status.ts for sentinel docs.
        externalEntityType: entityType,
        externalEntityId,
        status: "UNMATCHED",
        source: "AUTO",
        confidenceScore: 0,
        matchReason: result.allCandidates.length > 0
          ? `Top candidate confidence too low (${result.allCandidates[0]?.confidence.toFixed(2)})`
          : "No candidates found",
        linkedAt: now,
        updatedAt: now,
      },
    });
    return;
  }

  const status: CatalogMappingStatus =
    result.best.confidence >= ACTIVE_CONFIDENCE_THRESHOLD ? "ACTIVE" : "NEEDS_REVIEW";

  await prisma.channelEntityMapping.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      internalEntityType: entityType,
      internalEntityId: result.best.internalEntityId,
      externalEntityType: entityType,
      externalEntityId,
      status,
      source: "AUTO",
      confidenceScore: result.best.confidence,
      matchReason: result.best.reason,
      linkedAt: now,
      updatedAt: now,
    },
  });
}

// ─── Validation ───────────────────────────────────────────────────────────────

/**
 * validateMappings — checks all non-archived mappings for a connection and
 * marks any with missing/inactive entities as BROKEN.
 *
 * Returns the number of mappings updated to BROKEN.
 */
export async function validateMappings(connectionId: string): Promise<{ brokenCount: number }> {
  const activeMappings = await prisma.channelEntityMapping.findMany({
    where: {
      connectionId,
      status: { notIn: ["ARCHIVED"] },
    },
  });

  let brokenCount = 0;
  const now = new Date();

  for (const mapping of activeMappings) {
    if (mapping.status === "UNMATCHED") {
      // UNMATCHED rows have no internalEntityId to validate; skip entity checks.
      continue;
    }

    const reasons: string[] = [];

    // Check entity type consistency.
    if (mapping.internalEntityType !== mapping.externalEntityType) {
      reasons.push(
        `Entity type mismatch: internal=${mapping.internalEntityType} external=${mapping.externalEntityType}`
      );
    }

    // Check internal entity exists.
    const internalEntity = await getInternalCatalogEntity(
      mapping.storeId,
      mapping.internalEntityType as CatalogEntityType,
      mapping.internalEntityId
    );
    if (!internalEntity) {
      reasons.push("Internal entity not found");
    } else if ((internalEntity as { deletedAt?: Date | null }).deletedAt) {
      reasons.push("Internal entity has been deleted");
    } else if ((internalEntity as { isActive?: boolean }).isActive === false) {
      reasons.push("Internal entity is inactive");
    }

    // Check external entity exists.
    const externalEntity = await getExternalCatalogEntity(
      mapping.connectionId,
      mapping.externalEntityType as CatalogEntityType,
      mapping.externalEntityId
    );
    if (!externalEntity) {
      reasons.push("External entity not found in latest import");
    }

    // For modifier options: check parent group mapping still exists.
    if (mapping.internalEntityType === "MODIFIER_OPTION" && internalEntity) {
      const internalOption = internalEntity as { modifierGroupId: string };
      const groupMapping = await prisma.channelEntityMapping.findFirst({
        where: {
          connectionId,
          internalEntityType: "MODIFIER_GROUP",
          internalEntityId: internalOption.modifierGroupId,
          status: "ACTIVE",
        },
      });
      if (!groupMapping) {
        reasons.push("Parent modifier group mapping is missing or broken");
      }
    }

    if (reasons.length > 0) {
      await prisma.channelEntityMapping.update({
        where: { id: mapping.id },
        data: {
          status: "BROKEN",
          matchReason: reasons.join("; "),
          lastValidatedAt: now,
        },
      });
      brokenCount++;
    } else {
      // Update lastValidatedAt for healthy mappings.
      await prisma.channelEntityMapping.update({
        where: { id: mapping.id },
        data: { lastValidatedAt: now },
      });
    }
  }

  return { brokenCount };
}
