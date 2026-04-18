/**
 * services/catalog-conflict.service.ts
 *
 * Phase 6 — Conflict Detection & Resolution Foundation.
 *
 * Orchestrates comparison of internal catalog state vs external detected changes
 * to identify true conflicts (both sides changed the same area differently).
 *
 * Constraints:
 *   - Conflicts are DETECTED and LOGGED only.
 *   - Internal catalog is NEVER modified by this service.
 *   - External channel is NEVER modified by this service.
 *   - Resolution actions record DECISIONS ONLY — no data is applied.
 *
 * TODO Phase 7:
 *   - policy-based two-way sync execution
 *   - apply KEEP_INTERNAL as outbound publish plan
 *   - apply ACCEPT_EXTERNAL as internal patch plan
 *   - manual merge execution workflow
 *   - field ownership and auto-merge policies
 */

import { prisma } from "@/lib/prisma";
import { resolveBaseline } from "./catalog-conflict/baseline";
import { detectFieldConflicts, extractInternalFieldValues } from "./catalog-conflict/detect-field-conflicts";
import { detectStructureConflicts } from "./catalog-conflict/detect-structure-conflicts";
import {
  detectMissingOnExternal,
  detectMissingOnInternal,
  entityTypeToScope,
} from "./catalog-conflict/detect-missing-conflicts";
import { buildConflictSummary } from "./catalog-conflict/summary";
import { resolveConflict, setConflictStatus } from "./catalog-conflict/resolution";

import type {
  CatalogConflictDto,
  CatalogConflictFieldDto,
  CatalogConflictResolutionLogDto,
  ListConflictsOptions,
  ConflictSummary,
  DetectConflictsResult,
  ResolveConflictInput,
  SetConflictStatusInput,
  ConflictFieldCandidate,
  CatalogConflictScope,
  CatalogConflictType,
} from "@/types/catalog-conflicts";

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Detect conflicts for all OPEN external changes associated with a connection.
 */
export async function detectConflictsForConnection(
  connectionId: string
): Promise<DetectConflictsResult> {
  const connection = await prisma.connection.findUnique({
    where: { id: connectionId },
    select: { id: true, tenantId: true, storeId: true },
  });
  if (!connection) {
    return {
      connectionId,
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "FAILED",
      errorMessage: `Connection ${connectionId} not found`,
    };
  }

  try {
    // Find all OPEN external changes for this connection that have a mapping
    const openChanges = await prisma.externalCatalogChange.findMany({
      where: {
        connectionId,
        status: "OPEN",
        internalEntityId: { not: null },
      },
      include: { fieldDiffs: true },
    });

    let conflictsCreated = 0;
    let conflictsSuperseded = 0;

    for (const change of openChanges) {
      try {
        const result = await detectConflictsForExternalChange(change.id);
        conflictsCreated   += result.conflictsCreated;
        conflictsSuperseded += result.conflictsSuperseded;
      } catch {
        // Non-blocking — log but continue
        continue;
      }
    }

    return {
      connectionId,
      conflictsCreated,
      conflictsSuperseded,
      status: "SUCCEEDED",
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      connectionId,
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "FAILED",
      errorMessage,
    };
  }
}

/**
 * Detect conflicts for a single external change record.
 */
export async function detectConflictsForExternalChange(
  externalChangeId: string
): Promise<DetectConflictsResult> {
  const change = await prisma.externalCatalogChange.findUnique({
    where: { id: externalChangeId },
    include: { fieldDiffs: true },
  });

  if (!change) {
    return {
      connectionId: "",
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "FAILED",
      errorMessage: `ExternalCatalogChange ${externalChangeId} not found`,
    };
  }

  if (!change.internalEntityId) {
    // No mapping — cannot detect conflict
    return {
      connectionId: change.connectionId,
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "SUCCEEDED",
    };
  }

  try {
    let conflictsCreated   = 0;
    let conflictsSuperseded = 0;

    const entityType       = change.entityType as string;
    const internalEntityId = change.internalEntityId;
    const connectionId     = change.connectionId;
    const tenantId         = change.tenantId;
    const storeId          = change.storeId;
    const mappingId        = change.mappingId ?? undefined;

    // ── Resolve baseline ──────────────────────────────────────────────────────
    const { baselineAt } = await resolveBaseline(connectionId, internalEntityId, entityType);

    // ── Check missing-on-external ─────────────────────────────────────────────
    if (change.externalEntityId && change.changeKind === "DELETED") {
      const isMissingOnExternal = await detectMissingOnExternal(
        connectionId,
        change.externalEntityId,
        entityType
      );
      if (isMissingOnExternal) {
        const scope = entityTypeToScope(entityType);
        const created = await createConflictIfNotExists({
          tenantId,
          storeId,
          connectionId,
          internalEntityType: entityType,
          internalEntityId,
          externalEntityType: entityType,
          externalEntityId: change.externalEntityId,
          mappingId,
          externalChangeId,
          scope,
          conflictType: "MISSING_ON_EXTERNAL",
          summary: `External entity ${change.externalEntityId} is missing from the latest import but mapping still exists`,
          fieldCandidates: [],
        });
        if (created) conflictsCreated++;
      }
    }

    // ── Check missing-on-internal ─────────────────────────────────────────────
    const isMissingOnInternal = await detectMissingOnInternal(internalEntityId, entityType);
    if (isMissingOnInternal) {
      const scope = entityTypeToScope(entityType);
      const created = await createConflictIfNotExists({
        tenantId,
        storeId,
        connectionId,
        internalEntityType: entityType,
        internalEntityId,
        externalEntityType: change.externalEntityId ? entityType : undefined,
        externalEntityId: change.externalEntityId ?? undefined,
        mappingId,
        externalChangeId,
        scope,
        conflictType: "MISSING_ON_INTERNAL",
        summary: `Internal entity ${internalEntityId} is missing or deleted but external change exists`,
        fieldCandidates: [],
      });
      if (created) conflictsCreated++;
      // Entity is gone — skip field conflict detection
      return { connectionId, conflictsCreated, conflictsSuperseded, status: "SUCCEEDED" };
    }

    // ── Load internal entity ──────────────────────────────────────────────────
    const internalEntity = await loadInternalEntity(internalEntityId, entityType);
    if (!internalEntity) {
      return { connectionId, conflictsCreated, conflictsSuperseded, status: "SUCCEEDED" };
    }

    const internalCurrentValues = extractInternalFieldValues(entityType, internalEntity);

    // ── Field-level conflicts ─────────────────────────────────────────────────
    if (change.fieldDiffs.length > 0) {
      const fieldCandidates = await detectFieldConflicts({
        tenantId,
        storeId,
        connectionId,
        internalEntityType: entityType,
        internalEntityId,
        baselineAt,
        externalFieldDiffs: change.fieldDiffs.map((d) => ({
          fieldPath: d.fieldPath,
          previousValue: d.previousValue,
          currentValue: d.currentValue,
        })),
        internalCurrentValues,
      });

      if (fieldCandidates.length > 0) {
        const scope = entityTypeToScope(entityType);
        const superseded = await supersedePreviousConflicts({
          connectionId,
          internalEntityType: entityType,
          internalEntityId,
          conflictType: "FIELD_VALUE_CONFLICT",
          externalChangeId,
        });
        conflictsSuperseded += superseded;

        const created = await createConflictRecord({
          tenantId,
          storeId,
          connectionId,
          internalEntityType: entityType,
          internalEntityId,
          externalEntityType: entityType,
          externalEntityId: change.externalEntityId ?? undefined,
          mappingId,
          externalChangeId,
          scope,
          conflictType: "FIELD_VALUE_CONFLICT",
          summary: buildFieldConflictSummary(fieldCandidates),
          fieldCandidates,
        });
        if (created) conflictsCreated++;
      }
    }

    // ── Structure-level conflicts (STRUCTURE_UPDATED / RELINKED changes) ──────
    if (change.changeKind === "STRUCTURE_UPDATED" || change.changeKind === "RELINKED") {
      if (entityType === "PRODUCT") {
        // Modifier group links
        const result = await detectProductModifierGroupConflict({
          tenantId,
          storeId,
          connectionId,
          internalEntityId,
          externalEntityId: change.externalEntityId ?? "",
          externalChangeId,
          mappingId,
          baselineAt,
        });
        conflictsCreated   += result.created;
        conflictsSuperseded += result.superseded;
      }
    }

    return { connectionId, conflictsCreated, conflictsSuperseded, status: "SUCCEEDED" };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    return {
      connectionId: change.connectionId,
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "FAILED",
      errorMessage,
    };
  }
}

// ─── Structure conflict helpers ───────────────────────────────────────────────

async function detectProductModifierGroupConflict(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityId: string;
  externalEntityId: string;
  externalChangeId: string;
  mappingId: string | undefined;
  baselineAt: Date | null;
}): Promise<{ created: number; superseded: number }> {
  // Get internal modifier group links for this product
  const internalLinks = await prisma.catalogProductModifierGroup.findMany({
    where: { productId: args.internalEntityId, isActive: true },
    select: { modifierGroupId: true },
  });

  // Get external modifier group links for the external product
  const externalLinks = await prisma.externalCatalogProductModifierGroupLink.findMany({
    where: { connectionId: args.connectionId, externalProductId: args.externalEntityId },
    select: { externalModifierGroupId: true },
  });

  const internalLinkIds = internalLinks.map((l) => l.modifierGroupId);
  const externalLinkIds = externalLinks.map((l) => l.externalModifierGroupId);

  // For baseline, use empty array — we can't easily reconstruct historical state here
  // TODO Phase 7: use published snapshot or baseline snapshot
  const baselineLinkIds: string[] = [];

  const candidates = await detectStructureConflicts({
    tenantId: args.tenantId,
    storeId: args.storeId,
    connectionId: args.connectionId,
    internalEntityType: "PRODUCT",
    internalEntityId: args.internalEntityId,
    baselineAt: args.baselineAt,
    area: "modifierGroupLinks",
    internalLinks: internalLinkIds,
    externalLinks: externalLinkIds,
    baselineLinks: baselineLinkIds,
  });

  if (candidates.length === 0) return { created: 0, superseded: 0 };

  const superseded = await supersedePreviousConflicts({
    connectionId: args.connectionId,
    internalEntityType: "PRODUCT",
    internalEntityId: args.internalEntityId,
    conflictType: "STRUCTURE_CONFLICT",
    externalChangeId: args.externalChangeId,
  });

  const created = await createConflictRecord({
    tenantId: args.tenantId,
    storeId: args.storeId,
    connectionId: args.connectionId,
    internalEntityType: "PRODUCT",
    internalEntityId: args.internalEntityId,
    externalEntityType: "PRODUCT",
    externalEntityId: args.externalEntityId,
    mappingId: args.mappingId,
    externalChangeId: args.externalChangeId,
    scope: "PRODUCT_MODIFIER_GROUP_LINK",
    conflictType: "STRUCTURE_CONFLICT",
    summary: `Modifier group links differ between internal and external for product ${args.internalEntityId}`,
    fieldCandidates: candidates,
  });

  return { created: created ? 1 : 0, superseded };
}

// ─── Conflict record helpers ──────────────────────────────────────────────────

async function createConflictIfNotExists(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  externalEntityType?: string;
  externalEntityId?: string;
  mappingId?: string;
  externalChangeId: string;
  scope: CatalogConflictScope;
  conflictType: CatalogConflictType;
  summary: string;
  fieldCandidates: ConflictFieldCandidate[];
}): Promise<boolean> {
  // Check if already exists for this externalChangeId + conflictType
  const existing = await prisma.catalogConflict.findFirst({
    where: {
      connectionId: args.connectionId,
      internalEntityId: args.internalEntityId,
      externalChangeId: args.externalChangeId,
      conflictType: args.conflictType as never,
      status: { in: ["OPEN", "IN_REVIEW"] },
    },
    select: { id: true },
  });
  if (existing) return false;

  return createConflictRecord(args);
}

async function createConflictRecord(args: {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  externalEntityType?: string;
  externalEntityId?: string;
  mappingId?: string;
  externalChangeId: string;
  scope: CatalogConflictScope;
  conflictType: CatalogConflictType;
  summary: string;
  fieldCandidates: ConflictFieldCandidate[];
}): Promise<boolean> {
  try {
    await prisma.catalogConflict.create({
      data: {
        tenantId:          args.tenantId,
        storeId:           args.storeId,
        connectionId:      args.connectionId,
        internalEntityType: args.internalEntityType as never,
        internalEntityId:  args.internalEntityId,
        externalEntityType: args.externalEntityType as never ?? null,
        externalEntityId:  args.externalEntityId ?? null,
        mappingId:         args.mappingId ?? null,
        externalChangeId:  args.externalChangeId,
        scope:             args.scope as never,
        conflictType:      args.conflictType as never,
        status:            "OPEN",
        summary:           args.summary,
        conflictFields: {
          create: args.fieldCandidates.map((f) => ({
            fieldPath:         f.fieldPath,
            fieldConflictType: f.fieldConflictType,
            baselineValue:     f.baselineValue as never ?? null,
            internalValue:     f.internalValue as never ?? null,
            externalValue:     f.externalValue as never ?? null,
          })),
        },
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function supersedePreviousConflicts(args: {
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  conflictType: CatalogConflictType;
  externalChangeId: string;
}): Promise<number> {
  const result = await prisma.catalogConflict.updateMany({
    where: {
      connectionId:      args.connectionId,
      internalEntityType: args.internalEntityType as never,
      internalEntityId:  args.internalEntityId,
      conflictType:      args.conflictType as never,
      status:            { in: ["OPEN", "IN_REVIEW"] },
      externalChangeId:  { not: args.externalChangeId },
    },
    data: { status: "SUPERSEDED" },
  });
  return result.count;
}

// ─── Entity loading ───────────────────────────────────────────────────────────

async function loadInternalEntity(
  internalEntityId: string,
  entityType: string
): Promise<Record<string, unknown> | null> {
  switch (entityType) {
    case "PRODUCT": {
      const r = await prisma.catalogProduct.findUnique({ where: { id: internalEntityId } });
      return r as Record<string, unknown> | null;
    }
    case "CATEGORY": {
      const r = await prisma.catalogCategory.findUnique({ where: { id: internalEntityId } });
      return r as Record<string, unknown> | null;
    }
    case "MODIFIER_GROUP": {
      const r = await prisma.catalogModifierGroup.findUnique({ where: { id: internalEntityId } });
      return r as Record<string, unknown> | null;
    }
    case "MODIFIER_OPTION": {
      const r = await prisma.catalogModifierOption.findUnique({ where: { id: internalEntityId } });
      return r as Record<string, unknown> | null;
    }
    default:
      return null;
  }
}

function buildFieldConflictSummary(candidates: ConflictFieldCandidate[]): string {
  const paths = candidates.map((c) => c.fieldPath).join(", ");
  return `Field conflict on ${candidates.length} field(s): ${paths}`;
}

// ─── Query API ────────────────────────────────────────────────────────────────

export async function listConflicts(opts: ListConflictsOptions): Promise<CatalogConflictDto[]> {
  const {
    connectionId,
    status,
    entityType,
    conflictType,
    internalEntityId,
    mappedOnly,
    limit = 50,
    offset = 0,
  } = opts;

  const conflicts = await prisma.catalogConflict.findMany({
    where: {
      connectionId,
      ...(status       ? { status:             status as never } : {}),
      ...(entityType   ? { internalEntityType: entityType as never } : {}),
      ...(conflictType ? { conflictType:       conflictType as never } : {}),
      ...(internalEntityId ? { internalEntityId } : {}),
      ...(mappedOnly ? { mappingId: { not: null } } : {}),
    },
    include: {
      conflictFields: true,
      resolutionLogs: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { detectedAt: "desc" },
    take: limit,
    skip: offset,
  });

  return conflicts.map(toDto);
}

export async function getConflictSummary(connectionId: string): Promise<ConflictSummary> {
  return buildConflictSummary(connectionId);
}

export async function getConflictById(conflictId: string): Promise<CatalogConflictDto | null> {
  const conflict = await prisma.catalogConflict.findUnique({
    where: { id: conflictId },
    include: {
      conflictFields: true,
      resolutionLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  return conflict ? toDto(conflict) : null;
}

export { resolveConflict, setConflictStatus };

// ─── DTO mapping ──────────────────────────────────────────────────────────────

function toDto(conflict: {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  externalEntityType: string | null;
  externalEntityId: string | null;
  mappingId: string | null;
  externalChangeId: string | null;
  scope: string;
  conflictType: string;
  status: string;
  summary: string | null;
  detectedAt: Date;
  resolutionStrategy: string | null;
  resolutionNote: string | null;
  resolvedAt: Date | null;
  resolvedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  conflictFields: Array<{
    id: string;
    conflictId: string;
    fieldPath: string;
    fieldConflictType: string;
    baselineValue: unknown;
    internalValue: unknown;
    externalValue: unknown;
    createdAt: Date;
  }>;
  resolutionLogs: Array<{
    id: string;
    conflictId: string;
    previousStatus: string | null;
    newStatus: string;
    strategy: string | null;
    note: string | null;
    changedByUserId: string | null;
    createdAt: Date;
  }>;
}): CatalogConflictDto {
  return {
    id: conflict.id,
    tenantId: conflict.tenantId,
    storeId: conflict.storeId,
    connectionId: conflict.connectionId,
    internalEntityType: conflict.internalEntityType as never,
    internalEntityId: conflict.internalEntityId,
    externalEntityType: conflict.externalEntityType as never,
    externalEntityId: conflict.externalEntityId,
    mappingId: conflict.mappingId,
    externalChangeId: conflict.externalChangeId,
    scope: conflict.scope as never,
    conflictType: conflict.conflictType as never,
    status: conflict.status as never,
    summary: conflict.summary,
    detectedAt: conflict.detectedAt.toISOString(),
    resolutionStrategy: conflict.resolutionStrategy as never,
    resolutionNote: conflict.resolutionNote,
    resolvedAt: conflict.resolvedAt?.toISOString() ?? null,
    resolvedByUserId: conflict.resolvedByUserId,
    createdAt: conflict.createdAt.toISOString(),
    updatedAt: conflict.updatedAt.toISOString(),
    conflictFields: conflict.conflictFields.map((f): CatalogConflictFieldDto => ({
      id: f.id,
      conflictId: f.conflictId,
      fieldPath: f.fieldPath,
      fieldConflictType: f.fieldConflictType as never,
      baselineValue: f.baselineValue,
      internalValue: f.internalValue,
      externalValue: f.externalValue,
      createdAt: f.createdAt.toISOString(),
    })),
    resolutionLogs: conflict.resolutionLogs.map((l): CatalogConflictResolutionLogDto => ({
      id: l.id,
      conflictId: l.conflictId,
      previousStatus: l.previousStatus as never,
      newStatus: l.newStatus as never,
      strategy: l.strategy as never,
      note: l.note,
      changedByUserId: l.changedByUserId,
      createdAt: l.createdAt.toISOString(),
    })),
  };
}
