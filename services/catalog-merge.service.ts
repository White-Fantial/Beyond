/**
 * services/catalog-merge.service.ts
 *
 * Phase 8 — Advanced Merge Editor & Manual Reconciliation.
 *
 * Provides functions for creating and managing CatalogMergeDraft records,
 * validating merge decisions, generating sync plans, and applying merges.
 */

import { prisma } from "@/lib/prisma";
import { validateMergeDraftData } from "./catalog-merge/validate";
import { generateSyncPlanFromMergeDraft as generatePlan } from "./catalog-merge/plan-generator";
import { resolveFieldValue, resolveStructureValue } from "./catalog-merge/resolve-values";
import { applySyncPlan } from "./catalog-sync-executor.service";

import type {
  CatalogMergeDraftDto,
  CatalogMergeDraftFieldDto,
  CatalogMergeDraftStructureDto,
  CatalogMergeExecutionLogDto,
  ListMergeDraftsOptions,
  UpdateMergeDraftMetadataInput,
  SetMergeApplyTargetInput,
  UpsertMergeFieldChoiceInput,
  UpsertMergeStructureChoiceInput,
  MergeValidationResult,
  ApplyMergeDraftOptions,
  MergeDraftPreview,
  CatalogMergeDraftStatus,
  CatalogMergeApplyTarget,
} from "@/types/catalog-merge";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toFieldDto(row: {
  id: string;
  draftId: string;
  fieldPath: string;
  choice: string;
  baselineValue: unknown;
  internalValue: unknown;
  externalValue: unknown;
  customValue: unknown;
  resolvedValue: unknown;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CatalogMergeDraftFieldDto {
  return {
    id: row.id,
    draftId: row.draftId,
    fieldPath: row.fieldPath,
    choice: row.choice as CatalogMergeDraftFieldDto["choice"],
    baselineValue: row.baselineValue,
    internalValue: row.internalValue,
    externalValue: row.externalValue,
    customValue: row.customValue,
    resolvedValue: row.resolvedValue,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStructureDto(row: {
  id: string;
  draftId: string;
  fieldPath: string;
  choice: string;
  baselineValue: unknown;
  internalValue: unknown;
  externalValue: unknown;
  customValue: unknown;
  resolvedValue: unknown;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}): CatalogMergeDraftStructureDto {
  return {
    id: row.id,
    draftId: row.draftId,
    fieldPath: row.fieldPath,
    choice: row.choice,
    baselineValue: row.baselineValue,
    internalValue: row.internalValue,
    externalValue: row.externalValue,
    customValue: row.customValue,
    resolvedValue: row.resolvedValue,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toExecutionLogDto(row: {
  id: string;
  draftId: string;
  generatedPlanId: string | null;
  status: string;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  changedByUserId: string | null;
  createdAt: Date;
}): CatalogMergeExecutionLogDto {
  return {
    id: row.id,
    draftId: row.draftId,
    generatedPlanId: row.generatedPlanId,
    status: row.status,
    requestPayload: row.requestPayload,
    responsePayload: row.responsePayload,
    errorMessage: row.errorMessage,
    changedByUserId: row.changedByUserId,
    createdAt: row.createdAt.toISOString(),
  };
}

function toDraftDto(
  row: {
    id: string;
    tenantId: string;
    storeId: string;
    connectionId: string;
    conflictId: string | null;
    internalEntityType: string;
    internalEntityId: string;
    externalEntityType: string | null;
    externalEntityId: string | null;
    status: string;
    applyTarget: string;
    title: string | null;
    summary: string | null;
    validationErrors: unknown;
    generatedPlanId: string | null;
    createdByUserId: string | null;
    updatedByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
    fieldChoices?: Parameters<typeof toFieldDto>[0][];
    structureChoices?: Parameters<typeof toStructureDto>[0][];
    executionLogs?: Parameters<typeof toExecutionLogDto>[0][];
  }
): CatalogMergeDraftDto {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    connectionId: row.connectionId,
    conflictId: row.conflictId,
    internalEntityType: row.internalEntityType as CatalogMergeDraftDto["internalEntityType"],
    internalEntityId: row.internalEntityId,
    externalEntityType: row.externalEntityType as CatalogMergeDraftDto["externalEntityType"],
    externalEntityId: row.externalEntityId,
    status: row.status as CatalogMergeDraftStatus,
    applyTarget: row.applyTarget as CatalogMergeApplyTarget,
    title: row.title,
    summary: row.summary,
    validationErrors: row.validationErrors,
    generatedPlanId: row.generatedPlanId,
    createdByUserId: row.createdByUserId,
    updatedByUserId: row.updatedByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    fieldChoices: row.fieldChoices?.map(toFieldDto),
    structureChoices: row.structureChoices?.map(toStructureDto),
    executionLogs: row.executionLogs?.map(toExecutionLogDto),
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a merge draft seeded from an existing conflict.
 * Pre-populates entity ids and field values from the conflict.
 */
export async function createMergeDraftFromConflict(
  conflictId: string,
  userId?: string
): Promise<CatalogMergeDraftDto> {
  const conflict = await prisma.catalogConflict.findUnique({
    where: { id: conflictId },
    include: { conflictFields: true },
  });

  if (!conflict) {
    throw new Error(`Conflict ${conflictId} not found`);
  }

  const connection = await prisma.connection.findUnique({
    where: { id: conflict.connectionId },
    select: { tenantId: true, storeId: true },
  });

  if (!connection) {
    throw new Error(`Connection ${conflict.connectionId} not found`);
  }

  const draft = await prisma.catalogMergeDraft.create({
    data: {
      tenantId: connection.tenantId,
      storeId: connection.storeId,
      connectionId: conflict.connectionId,
      conflictId,
      internalEntityType: conflict.internalEntityType,
      internalEntityId: conflict.internalEntityId,
      externalEntityType: conflict.externalEntityType ?? null,
      externalEntityId: conflict.externalEntityId ?? null,
      status: "DRAFT",
      applyTarget: "INTERNAL_THEN_EXTERNAL",
      title: `Merge: ${conflict.internalEntityType} ${conflict.internalEntityId}`,
      summary: conflict.summary ?? null,
      createdByUserId: userId ?? null,
      // Pre-populate field choices from conflict fields
      fieldChoices: {
        create: conflict.conflictFields.map((cf) => ({
          fieldPath: cf.fieldPath,
          choice: "TAKE_INTERNAL" as const,
          baselineValue: cf.baselineValue ?? undefined,
          internalValue: cf.internalValue ?? undefined,
          externalValue: cf.externalValue ?? undefined,
          resolvedValue: cf.internalValue ?? undefined,
        })),
      },
    },
    include: {
      fieldChoices: true,
      structureChoices: true,
      executionLogs: true,
    },
  });

  return toDraftDto(draft);
}

/**
 * Get a single merge draft with all sub-relations.
 */
export async function getMergeDraft(draftId: string): Promise<CatalogMergeDraftDto | null> {
  const draft = await prisma.catalogMergeDraft.findUnique({
    where: { id: draftId },
    include: {
      fieldChoices: { orderBy: { fieldPath: "asc" } },
      structureChoices: { orderBy: { fieldPath: "asc" } },
      executionLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!draft) return null;
  return toDraftDto(draft);
}

/**
 * List merge drafts for a connection with optional filters.
 */
export async function listMergeDrafts(
  opts: ListMergeDraftsOptions
): Promise<CatalogMergeDraftDto[]> {
  const { connectionId, status, internalEntityType, internalEntityId, limit = 50, offset = 0 } = opts;

  const rows = await prisma.catalogMergeDraft.findMany({
    where: {
      connectionId,
      ...(status ? { status } : {}),
      ...(internalEntityType ? { internalEntityType } : {}),
      ...(internalEntityId ? { internalEntityId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    skip: offset,
    include: {
      fieldChoices: { orderBy: { fieldPath: "asc" } },
      structureChoices: { orderBy: { fieldPath: "asc" } },
    },
  });

  return rows.map(toDraftDto);
}

/**
 * Update draft title and/or summary.
 */
export async function updateMergeDraftMetadata(
  input: UpdateMergeDraftMetadataInput
): Promise<CatalogMergeDraftDto> {
  const { draftId, title, summary, updatedByUserId } = input;

  const draft = await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: {
      ...(title !== undefined ? { title } : {}),
      ...(summary !== undefined ? { summary } : {}),
      updatedByUserId: updatedByUserId ?? null,
    },
    include: {
      fieldChoices: true,
      structureChoices: true,
      executionLogs: true,
    },
  });

  return toDraftDto(draft);
}

/**
 * Set the apply target (INTERNAL_ONLY / EXTERNAL_ONLY / INTERNAL_THEN_EXTERNAL).
 */
export async function setMergeApplyTarget(
  input: SetMergeApplyTargetInput
): Promise<CatalogMergeDraftDto> {
  const { draftId, applyTarget, updatedByUserId } = input;

  const draft = await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: {
      applyTarget,
      updatedByUserId: updatedByUserId ?? null,
      // Reset to DRAFT if previously validated
      status: "DRAFT",
    },
    include: {
      fieldChoices: true,
      structureChoices: true,
      executionLogs: true,
    },
  });

  return toDraftDto(draft);
}

/**
 * Upsert a field-level merge choice.
 */
export async function upsertMergeFieldChoice(
  input: UpsertMergeFieldChoiceInput
): Promise<CatalogMergeDraftFieldDto> {
  const { draftId, fieldPath, choice, customValue, note } = input;

  const resolved = resolveFieldValue({
    choice,
    internalValue: null,
    externalValue: null,
    customValue: customValue ?? null,
  });

  // Load existing to get internalValue / externalValue for resolution
  const existing = await prisma.catalogMergeDraftField.findUnique({
    where: { draftId_fieldPath: { draftId, fieldPath } },
  });

  const resolvedValue = resolveFieldValue({
    choice,
    internalValue: existing?.internalValue ?? null,
    externalValue: existing?.externalValue ?? null,
    customValue: customValue ?? existing?.customValue ?? null,
  });

  void resolved; // suppress unused warning

  const row = await prisma.catalogMergeDraftField.upsert({
    where: { draftId_fieldPath: { draftId, fieldPath } },
    create: {
      draftId,
      fieldPath,
      choice,
      customValue: customValue !== undefined ? (customValue as Parameters<typeof prisma.catalogMergeDraftField.upsert>[0]["create"]["customValue"]) : undefined,
      resolvedValue: resolvedValue as Parameters<typeof prisma.catalogMergeDraftField.upsert>[0]["create"]["resolvedValue"],
      note: note ?? null,
    },
    update: {
      choice,
      customValue: customValue !== undefined ? (customValue as Parameters<typeof prisma.catalogMergeDraftField.upsert>[0]["update"]["customValue"]) : undefined,
      resolvedValue: resolvedValue as Parameters<typeof prisma.catalogMergeDraftField.upsert>[0]["update"]["resolvedValue"],
      note: note ?? null,
    },
  });

  // Reset draft to DRAFT on field change
  await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: { status: "DRAFT" },
  });

  return toFieldDto(row);
}

/**
 * Upsert a structure-level merge choice.
 */
export async function upsertMergeStructureChoice(
  input: UpsertMergeStructureChoiceInput
): Promise<CatalogMergeDraftStructureDto> {
  const { draftId, fieldPath, choice, customValue, note } = input;

  const existing = await prisma.catalogMergeDraftStructure.findUnique({
    where: { draftId_fieldPath: { draftId, fieldPath } },
  });

  const resolvedValue = resolveStructureValue({
    choice,
    internalValue: existing?.internalValue ?? null,
    externalValue: existing?.externalValue ?? null,
    customValue: customValue ?? existing?.customValue ?? null,
  });

  const row = await prisma.catalogMergeDraftStructure.upsert({
    where: { draftId_fieldPath: { draftId, fieldPath } },
    create: {
      draftId,
      fieldPath,
      choice,
      customValue: customValue !== undefined ? (customValue as Parameters<typeof prisma.catalogMergeDraftStructure.upsert>[0]["create"]["customValue"]) : undefined,
      resolvedValue: resolvedValue as Parameters<typeof prisma.catalogMergeDraftStructure.upsert>[0]["create"]["resolvedValue"],
      note: note ?? null,
    },
    update: {
      choice,
      customValue: customValue !== undefined ? (customValue as Parameters<typeof prisma.catalogMergeDraftStructure.upsert>[0]["update"]["customValue"]) : undefined,
      resolvedValue: resolvedValue as Parameters<typeof prisma.catalogMergeDraftStructure.upsert>[0]["update"]["resolvedValue"],
      note: note ?? null,
    },
  });

  // Reset draft to DRAFT on structure change
  await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: { status: "DRAFT" },
  });

  return toStructureDto(row);
}

/**
 * Reset a draft back to DRAFT status, clearing validation errors and generated plan.
 */
export async function resetMergeDraft(draftId: string): Promise<CatalogMergeDraftDto> {
  const draft = await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: {
      status: "DRAFT",
      validationErrors: undefined,
      generatedPlanId: null,
    },
    include: {
      fieldChoices: true,
      structureChoices: true,
      executionLogs: true,
    },
  });
  return toDraftDto(draft);
}

/**
 * Validate the draft, updating status to VALIDATED or INVALID.
 */
export async function validateMergeDraft(draftId: string): Promise<MergeValidationResult> {
  const draft = await getMergeDraft(draftId);
  if (!draft) throw new Error(`MergeDraft ${draftId} not found`);

  const result = validateMergeDraftData(draft);

  await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: {
      status: result.valid ? "VALIDATED" : "INVALID",
      validationErrors: result.valid ? undefined : (result.errors as unknown as Parameters<typeof prisma.catalogMergeDraft.update>[0]["data"]["validationErrors"]),
    },
  });

  return result;
}

/**
 * Generate a CatalogSyncPlan from a validated draft.
 * Returns the generated plan ID.
 */
export async function generateSyncPlanFromMergeDraft(
  draftId: string,
  userId?: string
): Promise<string> {
  return generatePlan(draftId, userId);
}

/**
 * Apply the merge draft by applying its generated sync plan.
 */
export async function applyMergeDraft(
  draftId: string,
  opts?: ApplyMergeDraftOptions
): Promise<{ success: boolean; appliedCount: number; failedCount: number; planId: string }> {
  const draft = await prisma.catalogMergeDraft.findUnique({
    where: { id: draftId },
    select: { status: true, generatedPlanId: true },
  });

  if (!draft) throw new Error(`MergeDraft ${draftId} not found`);
  if (!draft.generatedPlanId) {
    throw new Error("Draft does not have a generated plan. Run generateSyncPlanFromMergeDraft first.");
  }
  if (draft.status !== "PLAN_GENERATED") {
    throw new Error(`Draft must be in PLAN_GENERATED status. Current: ${draft.status}`);
  }

  const planId = draft.generatedPlanId;

  const result = await applySyncPlan(planId, {});
  const appliedCount = result.applied;
  const failedCount = result.failed;

  const finalStatus = failedCount === 0 ? "APPLIED" : "PLAN_GENERATED";

  await prisma.catalogMergeDraft.update({
    where: { id: draftId },
    data: {
      status: finalStatus,
      updatedByUserId: opts?.userId ?? null,
    },
  });

  await prisma.catalogMergeExecutionLog.create({
    data: {
      draftId,
      generatedPlanId: planId,
      status: finalStatus,
      requestPayload: { planId },
      responsePayload: { appliedCount, failedCount },
      changedByUserId: opts?.userId ?? null,
    },
  });

  return { success: failedCount === 0, appliedCount, failedCount, planId };
}

/**
 * Preview the draft: return resolved values + validation + plan summary.
 */
export async function previewMergeDraft(draftId: string): Promise<MergeDraftPreview> {
  const draft = await getMergeDraft(draftId);
  if (!draft) throw new Error(`MergeDraft ${draftId} not found`);

  const validation = validateMergeDraftData(draft);

  const resolvedFields = (draft.fieldChoices ?? []).map((f) => ({
    fieldPath: f.fieldPath,
    choice: f.choice,
    resolvedValue: resolveFieldValue({
      choice: f.choice,
      internalValue: f.internalValue,
      externalValue: f.externalValue,
      customValue: f.customValue,
    }),
  }));

  const resolvedStructures = (draft.structureChoices ?? []).map((s) => ({
    fieldPath: s.fieldPath,
    choice: s.choice,
    resolvedValue: resolveStructureValue({
      choice: s.choice,
      internalValue: s.internalValue,
      externalValue: s.externalValue,
      customValue: s.customValue,
    }),
  }));

  return { draft, validation, resolvedFields, resolvedStructures };
}
