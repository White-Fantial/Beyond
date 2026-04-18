/**
 * types/catalog-external-changes.ts
 *
 * Type definitions for Phase 5 — External Change Detection.
 */

// ─── Enums (mirrors Prisma schema) ───────────────────────────────────────────

export type CatalogEntityType = "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION";

export type ExternalCatalogChangeKind =
  | "CREATED"
  | "UPDATED"
  | "DELETED"
  | "RELINKED"
  | "STRUCTURE_UPDATED";

export type ExternalCatalogChangeStatus =
  | "OPEN"
  | "ACKNOWLEDGED"
  | "IGNORED"
  | "SUPERSEDED";

export type ExternalChangeFieldChangeType =
  | "VALUE_CHANGED"
  | "ADDED"
  | "REMOVED"
  | "ORDER_CHANGED"
  | "PARENT_CHANGED";

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface ExternalCatalogChangeFieldDto {
  id: string;
  changeId: string;
  fieldPath: string;
  previousValue: unknown;
  currentValue: unknown;
  changeType: ExternalChangeFieldChangeType;
  createdAt: string;
}

export interface ExternalCatalogChangeDto {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;

  entityType: CatalogEntityType;
  externalEntityId: string;

  internalEntityId: string | null;
  mappingId: string | null;

  changeKind: ExternalCatalogChangeKind;
  status: ExternalCatalogChangeStatus;

  previousEntityHash: string | null;
  currentEntityHash: string | null;

  importRunId: string;
  comparedImportRunId: string | null;

  summary: string | null;
  detectedAt: string;
  acknowledgedAt: string | null;
  ignoredAt: string | null;

  createdAt: string;
  updatedAt: string;

  fieldDiffs?: ExternalCatalogChangeFieldDto[];
}

// ─── Service Input / Output ───────────────────────────────────────────────────

export interface DetectExternalChangesInput {
  importRunId: string;
}

export interface DetectExternalChangesResult {
  importRunId: string;
  comparedImportRunId: string | null;
  created: number;
  updated: number;
  deleted: number;
  structureUpdated: number;
  unchanged: number;
  diffStatus: "SUCCEEDED" | "FAILED";
  errorMessage?: string;
}

export interface ListExternalChangesOptions {
  connectionId: string;
  status?: ExternalCatalogChangeStatus;
  entityType?: CatalogEntityType;
  changeKind?: ExternalCatalogChangeKind;
  mappedOnly?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExternalChangeSummary {
  connectionId: string;
  totalOpen: number;
  byEntityType: Record<CatalogEntityType, number>;
  mapped: number;
  unmapped: number;
  deleted: number;
  updated: number;
  created: number;
  structureChanges: number;
}
