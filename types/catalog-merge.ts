/**
 * types/catalog-merge.ts
 *
 * Type definitions for Phase 8 — Advanced Merge Editor & Manual Reconciliation.
 */

import type { CatalogEntityType } from "./catalog-external-changes";

export type { CatalogEntityType };

// ─── Enums (mirrors Prisma schema) ───────────────────────────────────────────

export type CatalogMergeDraftStatus =
  | "DRAFT"
  | "VALIDATED"
  | "INVALID"
  | "PLAN_GENERATED"
  | "APPLIED"
  | "CANCELLED";

export type CatalogMergeFieldChoice =
  | "TAKE_INTERNAL"
  | "TAKE_EXTERNAL"
  | "CUSTOM_VALUE";

export type CatalogMergeStructureChoice =
  | "KEEP_INTERNAL_SET"
  | "TAKE_EXTERNAL_SET"
  | "MERGE_SELECTED"
  | "CUSTOM_STRUCTURE";

export type CatalogMergeParentChoice =
  | "KEEP_INTERNAL_PARENT"
  | "TAKE_EXTERNAL_PARENT"
  | "SET_CUSTOM_PARENT";

export type CatalogMergeApplyTarget =
  | "INTERNAL_ONLY"
  | "EXTERNAL_ONLY"
  | "INTERNAL_THEN_EXTERNAL";

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface CatalogMergeDraftFieldDto {
  id: string;
  draftId: string;
  fieldPath: string;
  choice: CatalogMergeFieldChoice;
  baselineValue: unknown;
  internalValue: unknown;
  externalValue: unknown;
  customValue: unknown;
  resolvedValue: unknown;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogMergeDraftStructureDto {
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
  createdAt: string;
  updatedAt: string;
}

export interface CatalogMergeExecutionLogDto {
  id: string;
  draftId: string;
  generatedPlanId: string | null;
  status: string;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface CatalogMergeDraftDto {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;

  conflictId: string | null;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;

  externalEntityType: CatalogEntityType | null;
  externalEntityId: string | null;

  status: CatalogMergeDraftStatus;
  applyTarget: CatalogMergeApplyTarget;

  title: string | null;
  summary: string | null;
  validationErrors: unknown;
  generatedPlanId: string | null;

  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;

  fieldChoices?: CatalogMergeDraftFieldDto[];
  structureChoices?: CatalogMergeDraftStructureDto[];
  executionLogs?: CatalogMergeExecutionLogDto[];
}

// ─── Validation ───────────────────────────────────────────────────────────────

export interface MergeValidationError {
  fieldPath: string;
  message: string;
}

export interface MergeValidationResult {
  valid: boolean;
  errors: MergeValidationError[];
}

// ─── Service Inputs ───────────────────────────────────────────────────────────

export interface CreateMergeDraftFromConflictInput {
  conflictId: string;
  userId?: string;
}

export interface UpdateMergeDraftMetadataInput {
  draftId: string;
  title?: string;
  summary?: string;
  updatedByUserId?: string;
}

export interface SetMergeApplyTargetInput {
  draftId: string;
  applyTarget: CatalogMergeApplyTarget;
  updatedByUserId?: string;
}

export interface UpsertMergeFieldChoiceInput {
  draftId: string;
  fieldPath: string;
  choice: CatalogMergeFieldChoice;
  customValue?: unknown;
  note?: string;
}

export interface UpsertMergeStructureChoiceInput {
  draftId: string;
  fieldPath: string;
  choice: string;
  customValue?: unknown;
  note?: string;
}

export interface ListMergeDraftsOptions {
  connectionId: string;
  status?: CatalogMergeDraftStatus;
  internalEntityType?: CatalogEntityType;
  internalEntityId?: string;
  limit?: number;
  offset?: number;
}

export interface ApplyMergeDraftOptions {
  userId?: string;
}

// ─── Preview ─────────────────────────────────────────────────────────────────

export interface MergeDraftPreview {
  draft: CatalogMergeDraftDto;
  validation: MergeValidationResult;
  resolvedFields: Array<{
    fieldPath: string;
    resolvedValue: unknown;
    choice: CatalogMergeFieldChoice;
  }>;
  resolvedStructures: Array<{
    fieldPath: string;
    resolvedValue: unknown;
    choice: string;
  }>;
}
