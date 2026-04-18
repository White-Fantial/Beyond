/**
 * types/catalog-conflicts.ts
 *
 * Type definitions for Phase 6 — Conflict Detection & Resolution Foundation.
 */

import type { CatalogEntityType } from "./catalog-external-changes";

export type { CatalogEntityType };

// ─── Enums (mirrors Prisma schema) ───────────────────────────────────────────

export type CatalogConflictType =
  | "FIELD_VALUE_CONFLICT"
  | "STRUCTURE_CONFLICT"
  | "MISSING_ON_EXTERNAL"
  | "MISSING_ON_INTERNAL"
  | "PARENT_RELATION_CONFLICT"
  | "UNKNOWN_CONFLICT";

export type CatalogConflictStatus =
  | "OPEN"
  | "IN_REVIEW"
  | "RESOLVED"
  | "IGNORED"
  | "SUPERSEDED";

export type CatalogConflictResolutionStrategy =
  | "KEEP_INTERNAL"
  | "ACCEPT_EXTERNAL"
  | "MERGE_MANUALLY"
  | "DEFER"
  | "IGNORE";

export type CatalogConflictScope =
  | "CATEGORY"
  | "PRODUCT"
  | "MODIFIER_GROUP"
  | "MODIFIER_OPTION"
  | "PRODUCT_CATEGORY_LINK"
  | "PRODUCT_MODIFIER_GROUP_LINK";

export type ConflictFieldConflictType =
  | "VALUE_MISMATCH"
  | "ADDED_ON_EXTERNAL"
  | "REMOVED_ON_EXTERNAL"
  | "ORDER_MISMATCH"
  | "PARENT_MISMATCH"
  | "STRUCTURE_MISMATCH";

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface CatalogConflictFieldDto {
  id: string;
  conflictId: string;
  fieldPath: string;
  fieldConflictType: ConflictFieldConflictType;
  baselineValue: unknown;
  internalValue: unknown;
  externalValue: unknown;
  createdAt: string;
}

export interface CatalogConflictResolutionLogDto {
  id: string;
  conflictId: string;
  previousStatus: CatalogConflictStatus | null;
  newStatus: CatalogConflictStatus;
  strategy: CatalogConflictResolutionStrategy | null;
  note: string | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface CatalogConflictDto {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;

  internalEntityType: CatalogEntityType;
  internalEntityId: string;

  externalEntityType: CatalogEntityType | null;
  externalEntityId: string | null;

  mappingId: string | null;
  externalChangeId: string | null;

  scope: CatalogConflictScope;
  conflictType: CatalogConflictType;
  status: CatalogConflictStatus;

  summary: string | null;
  detectedAt: string;

  resolutionStrategy: CatalogConflictResolutionStrategy | null;
  resolutionNote: string | null;
  resolvedAt: string | null;
  resolvedByUserId: string | null;

  createdAt: string;
  updatedAt: string;

  conflictFields?: CatalogConflictFieldDto[];
  resolutionLogs?: CatalogConflictResolutionLogDto[];
}

// ─── Service Input / Output ───────────────────────────────────────────────────

export interface DetectConflictsInput {
  connectionId?: string;
  externalChangeId?: string;
}

export interface DetectConflictsResult {
  connectionId: string;
  conflictsCreated: number;
  conflictsSuperseded: number;
  status: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
}

export interface ListConflictsOptions {
  connectionId: string;
  status?: CatalogConflictStatus;
  entityType?: CatalogEntityType;
  conflictType?: CatalogConflictType;
  internalEntityId?: string;
  mappedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ConflictSummary {
  connectionId: string;
  totalOpen: number;
  totalInReview: number;
  totalResolved: number;
  totalIgnored: number;
  fieldConflicts: number;
  structureConflicts: number;
  missingIssues: number;
  byEntityType: Record<CatalogEntityType, number>;
}

export interface ResolveConflictInput {
  conflictId: string;
  resolutionStrategy: CatalogConflictResolutionStrategy;
  note?: string;
  resolvedByUserId?: string;
}

export interface SetConflictStatusInput {
  conflictId: string;
  newStatus: CatalogConflictStatus;
  note?: string;
  changedByUserId?: string;
}

// ─── Internal conflict detection helpers ─────────────────────────────────────

export interface ConflictFieldCandidate {
  fieldPath: string;
  fieldConflictType: ConflictFieldConflictType;
  baselineValue: unknown;
  internalValue: unknown;
  externalValue: unknown;
}

export interface DetectFieldConflictsInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  externalEntityId: string;
  externalChangeId: string;
  mappingId: string;
  /** Field diffs from the external change log */
  externalFieldDiffs: Array<{
    fieldPath: string;
    previousValue: unknown;
    currentValue: unknown;
  }>;
  /** Current internal entity state */
  internalEntity: Record<string, unknown>;
  /** Baseline internal state (e.g. at last publish) */
  baselineInternalValues: Record<string, unknown>;
}

export interface DetectStructureConflictsInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  externalEntityId: string;
  externalChangeId: string;
  mappingId: string;
  internalLinks: string[];
  externalLinks: string[];
  baselineLinks: string[];
  scope: CatalogConflictScope;
}
