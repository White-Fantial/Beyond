/**
 * services/catalog-sync-planner.service.ts
 *
 * Phase 7 — Policy-based Controlled Two-way Sync: Plan Builder.
 *
 * Builds CatalogSyncPlan + CatalogSyncPlanItem records by evaluating:
 *   - Open external changes for the connection
 *   - Resolved conflicts
 *   - Open unresolved conflicts (→ BLOCKED items)
 *   - Sync policies (or defaults when no explicit policy exists)
 *
 * Planning is idempotent: duplicate READY items are skipped.
 */

import { prisma } from "@/lib/prisma";
import type {
  BuildSyncPlanInput,
  CatalogSyncAction,
  CatalogSyncAutoApplyMode,
  CatalogSyncConflictStrategy,
  CatalogSyncDirection,
  CatalogSyncItemStatus,
  CatalogSyncPlanDto,
  CatalogSyncPlanItemDto,
  CatalogSyncPlanStatus,
  CatalogSyncPolicyDto,
  CatalogSyncPolicyScope,
  ListSyncPlansOptions,
  ResolvedPolicy,
  SyncPlanPreview,
} from "@/types/catalog-sync";
import type { CatalogEntityType, ExternalCatalogChangeStatus } from "@/types/catalog-external-changes";
import type { CatalogConflictStatus } from "@/types/catalog-conflicts";

// ─── Default policies ─────────────────────────────────────────────────────────

type DefaultPolicyKey = string; // "scope:fieldPath" or "scope"

const DEFAULT_POLICIES: Record<
  DefaultPolicyKey,
  {
    direction: CatalogSyncDirection;
    conflictStrategy: CatalogSyncConflictStrategy;
    autoApplyMode: CatalogSyncAutoApplyMode;
  }
> = {
  "PRODUCT:name":                { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "PRODUCT:description":         { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "PRODUCT:priceAmount":         { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
  "PRODUCT:isActive":            { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "PRODUCT:isSoldOut":           { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "CATEGORY:name":               { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "CATEGORY:sortOrder":          { direction: "BIDIRECTIONAL", conflictStrategy: "PREFER_INTERNAL", autoApplyMode: "NEVER" },
  "MODIFIER_GROUP:name":         { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "MODIFIER_GROUP:minSelect":    { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
  "MODIFIER_GROUP:maxSelect":    { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
  "MODIFIER_OPTION:name":        { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY" },
  "MODIFIER_OPTION:priceAmount": { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
  "PRODUCT_CATEGORY_LINK":       { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
  "PRODUCT_MODIFIER_GROUP_LINK": { direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "NEVER" },
};

export function getDefaultPolicy(
  scope: CatalogSyncPolicyScope,
  fieldPath?: string | null
): ResolvedPolicy {
  const key = fieldPath ? `${scope}:${fieldPath}` : scope;
  const found = DEFAULT_POLICIES[key];
  if (found) {
    return { ...found, source: "default" };
  }
  // Fallback
  return {
    direction: "BIDIRECTIONAL",
    conflictStrategy: "MANUAL_REVIEW",
    autoApplyMode: "SAFE_ONLY",
    source: "default",
  };
}

// ─── Policy resolution ────────────────────────────────────────────────────────

export async function getSyncPoliciesForConnection(
  connectionId: string
): Promise<CatalogSyncPolicyDto[]> {
  const rows = await prisma.catalogSyncPolicy.findMany({
    where: { connectionId, isEnabled: true },
    orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toSyncPolicyDto);
}

function resolvePolicy(
  policies: CatalogSyncPolicyDto[],
  scope: CatalogSyncPolicyScope,
  fieldPath?: string | null
): ResolvedPolicy {
  // Match field-specific first, then scope-level
  const fieldMatch = fieldPath
    ? policies.find((p) => p.scope === scope && p.fieldPath === fieldPath)
    : undefined;
  const scopeMatch = policies.find((p) => p.scope === scope && !p.fieldPath);

  const hit = fieldMatch ?? scopeMatch;
  if (hit) {
    return {
      direction: hit.direction,
      conflictStrategy: hit.conflictStrategy,
      autoApplyMode: hit.autoApplyMode,
      source: "explicit",
    };
  }
  return getDefaultPolicy(scope, fieldPath);
}

// ─── Scope helpers ────────────────────────────────────────────────────────────

function entityTypeToScope(entityType: CatalogEntityType): CatalogSyncPolicyScope {
  switch (entityType) {
    case "PRODUCT":
      return "PRODUCT";
    case "CATEGORY":
      return "CATEGORY";
    case "MODIFIER_GROUP":
      return "MODIFIER_GROUP";
    case "MODIFIER_OPTION":
      return "MODIFIER_OPTION";
    default:
      return "PRODUCT";
  }
}

// ─── Idempotency check ────────────────────────────────────────────────────────

async function existsReadyItemForChange(
  externalChangeId: string,
  action: CatalogSyncAction,
  connectionId: string
): Promise<boolean> {
  const count = await prisma.catalogSyncPlanItem.count({
    where: {
      externalChangeId,
      action,
      status: { in: ["READY", "PENDING"] },
      plan: {
        connectionId,
        status: { in: ["DRAFT", "READY", "PARTIALLY_BLOCKED"] },
      },
    },
  });
  return count > 0;
}

// ─── Plan status computation ──────────────────────────────────────────────────

function computePlanStatus(items: { status: CatalogSyncItemStatus }[]): CatalogSyncPlanStatus {
  if (items.length === 0) return "READY";
  const statuses = items.map((i) => i.status);
  const hasReady = statuses.some((s) => s === "READY");
  const hasBlocked = statuses.some((s) => s === "BLOCKED");

  if (hasBlocked && hasReady) return "PARTIALLY_BLOCKED";
  if (hasBlocked && !hasReady) return "BLOCKED";
  return "READY";
}

// ─── Build plan from external changes ────────────────────────────────────────

export async function buildSyncPlanForConnection(
  input: BuildSyncPlanInput
): Promise<CatalogSyncPlanDto> {
  const { tenantId, storeId, connectionId, externalChangeId, conflictId, createdByUserId } = input;

  const policies = await getSyncPoliciesForConnection(connectionId);

  // Load open external changes
  const changeWhere = externalChangeId
    ? { id: externalChangeId, connectionId }
    : {
        connectionId,
        status: { in: ["OPEN", "ACKNOWLEDGED"] as ExternalCatalogChangeStatus[] },
      };

  const externalChanges = await prisma.externalCatalogChange.findMany({
    where: changeWhere,
    orderBy: { detectedAt: "asc" },
    include: { fieldDiffs: true },
  });

  // Load open conflicts (unresolved → BLOCKED candidates)
  const conflictWhere = conflictId
    ? { id: conflictId, connectionId: { in: [connectionId] } }
    : {
        connectionId,
        status: { in: ["OPEN", "IN_REVIEW"] as CatalogConflictStatus[] },
      };

  const openConflicts = await prisma.catalogConflict.findMany({
    where: conflictWhere,
    select: { id: true, internalEntityId: true, internalEntityType: true, externalChangeId: true, scope: true },
  });

  // Load resolved conflicts
  const resolvedConflicts = await prisma.catalogConflict.findMany({
    where: {
      connectionId,
      status: "RESOLVED",
      externalChangeId: { not: null },
    },
    select: {
      id: true,
      internalEntityId: true,
      internalEntityType: true,
      externalChangeId: true,
      scope: true,
      resolutionStrategy: true,
    },
  });

  const blockedChangeIds = new Set(
    openConflicts.map((c) => c.externalChangeId).filter(Boolean) as string[]
  );

  const items: Array<{
    internalEntityType: CatalogEntityType | null;
    internalEntityId: string | null;
    externalEntityType: CatalogEntityType | null;
    externalEntityId: string | null;
    scope: CatalogSyncPolicyScope;
    fieldPath: string | null;
    action: CatalogSyncAction;
    direction: CatalogSyncDirection | null;
    status: CatalogSyncItemStatus;
    blockedReason: string | null;
    previewBeforeValue: unknown;
    previewAfterValue: unknown;
    externalChangeId: string | null;
    conflictId: string | null;
  }> = [];

  // Process each external change
  for (const change of externalChanges) {
    const entityType = change.entityType as CatalogEntityType;
    const scope = entityTypeToScope(entityType);
    const isBlocked = blockedChangeIds.has(change.id);

    // Get field diffs from the included relation
    const fieldDiffs = change.fieldDiffs ?? [];

    if (fieldDiffs.length === 0) {
      // No field diffs — create a single APPLY_INTERNAL_PATCH item
      const policy = resolvePolicy(policies, scope, null);
      const action: CatalogSyncAction = "APPLY_INTERNAL_PATCH";
      const isDuplicate = await existsReadyItemForChange(change.id, action, connectionId);
      if (isDuplicate) continue;

      const itemStatus: CatalogSyncItemStatus = isBlocked
        ? "BLOCKED"
        : policy.autoApplyMode === "NEVER"
        ? "BLOCKED"
        : "READY";

      items.push({
        internalEntityType: entityType,
        internalEntityId: change.internalEntityId ?? null,
        externalEntityType: entityType,
        externalEntityId: change.externalEntityId ?? null,
        scope,
        fieldPath: null,
        action,
        direction: policy.direction,
        status: itemStatus,
        blockedReason: isBlocked
          ? "Unresolved conflict exists"
          : policy.autoApplyMode === "NEVER"
          ? "Policy autoApplyMode is NEVER"
          : null,
        previewBeforeValue: null,
        previewAfterValue: null,
        externalChangeId: change.id,
        conflictId: null,
      });
    } else {
      // Create one item per field diff
      for (const diff of fieldDiffs) {
        const policy = resolvePolicy(policies, scope, diff.fieldPath);
        if (policy.direction === "DISABLED") continue;

        const action: CatalogSyncAction = "APPLY_INTERNAL_PATCH";
        const isDuplicate = await existsReadyItemForChange(change.id, action, connectionId);
        if (isDuplicate) continue;

        const itemStatus: CatalogSyncItemStatus = isBlocked
          ? "BLOCKED"
          : policy.autoApplyMode === "NEVER"
          ? "BLOCKED"
          : "READY";

        items.push({
          internalEntityType: entityType,
          internalEntityId: change.internalEntityId ?? null,
          externalEntityType: entityType,
          externalEntityId: change.externalEntityId ?? null,
          scope,
          fieldPath: diff.fieldPath,
          action,
          direction: policy.direction,
          status: itemStatus,
          blockedReason: isBlocked
            ? "Unresolved conflict exists"
            : policy.autoApplyMode === "NEVER"
            ? `Policy autoApplyMode is NEVER for field '${diff.fieldPath}'`
            : null,
          previewBeforeValue: diff.previousValue,
          previewAfterValue: diff.currentValue,
          externalChangeId: change.id,
          conflictId: null,
        });
      }
    }
  }

  // Add items from resolved conflicts
  for (const conflict of resolvedConflicts) {
    if (!conflict.externalChangeId) continue;
    const entityType = conflict.internalEntityType as CatalogEntityType;
    const scope = entityTypeToScope(entityType);

    let action: CatalogSyncAction;
    if (conflict.resolutionStrategy === "KEEP_INTERNAL") {
      action = "APPLY_EXTERNAL_PATCH";
    } else if (conflict.resolutionStrategy === "ACCEPT_EXTERNAL") {
      action = "APPLY_INTERNAL_PATCH";
    } else {
      continue; // DEFER / MERGE_MANUALLY / IGNORE don't generate auto items
    }

    const isDuplicate = await existsReadyItemForChange(conflict.externalChangeId, action, connectionId);
    if (isDuplicate) continue;

    items.push({
      internalEntityType: entityType,
      internalEntityId: conflict.internalEntityId,
      externalEntityType: entityType,
      externalEntityId: null,
      scope,
      fieldPath: null,
      action,
      direction: action === "APPLY_INTERNAL_PATCH" ? "EXTERNAL_TO_INTERNAL" : "INTERNAL_TO_EXTERNAL",
      status: "READY",
      blockedReason: null,
      previewBeforeValue: null,
      previewAfterValue: null,
      externalChangeId: conflict.externalChangeId,
      conflictId: conflict.id,
    });
  }

  const planStatus = computePlanStatus(items);
  const summary = `${items.filter((i) => i.status === "READY").length} ready, ${items.filter((i) => i.status === "BLOCKED").length} blocked`;

  const plan = await prisma.catalogSyncPlan.create({
    data: {
      tenantId,
      storeId,
      connectionId,
      source: "AUTO",
      status: planStatus,
      basedOnExternalChangeId: externalChangeId ?? null,
      basedOnConflictId: conflictId ?? null,
      summary,
      createdByUserId: createdByUserId ?? null,
      items: {
        create: items.map((item) => ({
          internalEntityType: item.internalEntityType ?? undefined,
          internalEntityId: item.internalEntityId ?? undefined,
          externalEntityType: item.externalEntityType ?? undefined,
          externalEntityId: item.externalEntityId ?? undefined,
          scope: item.scope,
          fieldPath: item.fieldPath ?? undefined,
          action: item.action,
          direction: item.direction ?? undefined,
          status: item.status,
          blockedReason: item.blockedReason ?? undefined,
          previewBeforeValue: item.previewBeforeValue as Parameters<typeof prisma.catalogSyncPlanItem.create>[0]["data"]["previewBeforeValue"],
          previewAfterValue: item.previewAfterValue as Parameters<typeof prisma.catalogSyncPlanItem.create>[0]["data"]["previewAfterValue"],
          externalChangeId: item.externalChangeId ?? undefined,
          conflictId: item.conflictId ?? undefined,
        })),
      },
    },
    include: { items: true },
  });

  return toPlanDto(plan);
}

export async function buildSyncPlanFromConflict(
  conflictId: string
): Promise<CatalogSyncPlanDto> {
  const conflict = await prisma.catalogConflict.findUniqueOrThrow({
    where: { id: conflictId },
    select: { tenantId: true, storeId: true, connectionId: true, status: true },
  });

  return buildSyncPlanForConnection({
    tenantId: conflict.tenantId,
    storeId: conflict.storeId,
    connectionId: conflict.connectionId,
    conflictId,
  });
}

export async function buildSyncPlanFromExternalChange(
  externalChangeId: string
): Promise<CatalogSyncPlanDto> {
  const change = await prisma.externalCatalogChange.findUniqueOrThrow({
    where: { id: externalChangeId },
    select: { tenantId: true, storeId: true, connectionId: true },
  });

  return buildSyncPlanForConnection({
    tenantId: change.tenantId,
    storeId: change.storeId,
    connectionId: change.connectionId,
    externalChangeId,
  });
}

export async function buildSyncPlanFromResolution(
  conflictId: string
): Promise<CatalogSyncPlanDto> {
  return buildSyncPlanFromConflict(conflictId);
}

export async function buildAutoSyncPlan(
  connectionId: string
): Promise<CatalogSyncPlanDto> {
  const connection = await prisma.connection.findUniqueOrThrow({
    where: { id: connectionId },
    select: { tenantId: true, storeId: true },
  });

  return buildSyncPlanForConnection({
    tenantId: connection.tenantId,
    storeId: connection.storeId,
    connectionId,
  });
}

// ─── Plan inspection ──────────────────────────────────────────────────────────

export async function previewSyncPlan(planId: string): Promise<SyncPlanPreview> {
  const plan = await prisma.catalogSyncPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { items: true },
  });

  const dto = toPlanDto(plan);
  const items = dto.items ?? [];

  return {
    plan: dto,
    readyCount:   items.filter((i) => i.status === "READY").length,
    blockedCount: items.filter((i) => i.status === "BLOCKED").length,
    skippedCount: items.filter((i) => i.status === "SKIPPED").length,
    appliedCount: items.filter((i) => i.status === "APPLIED").length,
    failedCount:  items.filter((i) => i.status === "FAILED").length,
    items,
  };
}

export async function validateSyncPlan(planId: string): Promise<{ valid: boolean; issues: string[] }> {
  const plan = await prisma.catalogSyncPlan.findUniqueOrThrow({
    where: { id: planId },
    include: { items: true },
  });

  const issues: string[] = [];
  const readyItems = plan.items.filter((i) => i.status === "READY");

  if (readyItems.length === 0) {
    issues.push("No READY items in this plan");
  }

  // Check for duplicate (externalChangeId + action) pairs in READY items
  const seen = new Set<string>();
  for (const item of readyItems) {
    const key = `${item.externalChangeId}:${item.action}`;
    if (seen.has(key)) {
      issues.push(`Duplicate READY item for externalChangeId=${item.externalChangeId} action=${item.action}`);
    }
    seen.add(key);
  }

  return { valid: issues.length === 0, issues };
}

// ─── List plans ───────────────────────────────────────────────────────────────

export async function listSyncPlans(opts: ListSyncPlansOptions): Promise<CatalogSyncPlanDto[]> {
  const rows = await prisma.catalogSyncPlan.findMany({
    where: {
      connectionId: opts.connectionId,
      ...(opts.status ? { status: opts.status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 50,
    skip: opts.offset ?? 0,
    include: { items: false },
  });
  return rows.map(toPlanDto);
}

export async function getSyncPlan(planId: string): Promise<CatalogSyncPlanDto | null> {
  const row = await prisma.catalogSyncPlan.findUnique({
    where: { id: planId },
    include: { items: true },
  });
  if (!row) return null;
  return toPlanDto(row);
}

// ─── DTO mappers ──────────────────────────────────────────────────────────────

function toSyncPolicyDto(row: {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  scope: string;
  fieldPath: string | null;
  direction: string;
  conflictStrategy: string;
  autoApplyMode: string;
  isEnabled: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}): CatalogSyncPolicyDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    connectionId: row.connectionId,
    scope: row.scope as CatalogSyncPolicyScope,
    fieldPath: row.fieldPath,
    direction: row.direction as CatalogSyncDirection,
    conflictStrategy: row.conflictStrategy as CatalogSyncConflictStrategy,
    autoApplyMode: row.autoApplyMode as CatalogSyncAutoApplyMode,
    isEnabled: row.isEnabled,
    priority: row.priority,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toPlanItemDto(item: {
  id: string;
  planId: string;
  internalEntityType: string | null;
  internalEntityId: string | null;
  externalEntityType: string | null;
  externalEntityId: string | null;
  scope: string;
  fieldPath: string | null;
  action: string;
  direction: string | null;
  status: string;
  blockedReason: string | null;
  previewBeforeValue: unknown;
  previewAfterValue: unknown;
  mappingId: string | null;
  externalChangeId: string | null;
  conflictId: string | null;
  publishJobId: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CatalogSyncPlanItemDto {
  return {
    id: item.id,
    planId: item.planId,
    internalEntityType: item.internalEntityType as CatalogEntityType | null,
    internalEntityId: item.internalEntityId,
    externalEntityType: item.externalEntityType as CatalogEntityType | null,
    externalEntityId: item.externalEntityId,
    scope: item.scope as CatalogSyncPolicyScope,
    fieldPath: item.fieldPath,
    action: item.action as CatalogSyncAction,
    direction: item.direction as CatalogSyncDirection | null,
    status: item.status as CatalogSyncItemStatus,
    blockedReason: item.blockedReason,
    previewBeforeValue: item.previewBeforeValue,
    previewAfterValue: item.previewAfterValue,
    mappingId: item.mappingId,
    externalChangeId: item.externalChangeId,
    conflictId: item.conflictId,
    publishJobId: item.publishJobId,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  };
}

function toPlanDto(plan: {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  source: string | null;
  status: string;
  basedOnImportRunId: string | null;
  basedOnExternalChangeId: string | null;
  basedOnConflictId: string | null;
  summary: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  items?: Parameters<typeof toPlanItemDto>[0][];
}): CatalogSyncPlanDto {
  return {
    id: plan.id,
    tenantId: plan.tenantId,
    storeId: plan.storeId,
    connectionId: plan.connectionId,
    source: plan.source,
    status: plan.status as CatalogSyncPlanStatus,
    basedOnImportRunId: plan.basedOnImportRunId,
    basedOnExternalChangeId: plan.basedOnExternalChangeId,
    basedOnConflictId: plan.basedOnConflictId,
    summary: plan.summary,
    createdByUserId: plan.createdByUserId,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
    items: plan.items?.map(toPlanItemDto),
  };
}
