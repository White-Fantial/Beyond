/**
 * types/catalog-sync.ts
 *
 * Type definitions for Phase 7 — Policy-based Controlled Two-way Sync.
 */

import type { CatalogEntityType } from "./catalog-external-changes";

export type { CatalogEntityType };

// ─── Enums (mirrors Prisma schema) ───────────────────────────────────────────

export type CatalogSyncDirection =
  | "INTERNAL_TO_EXTERNAL"
  | "EXTERNAL_TO_INTERNAL"
  | "BIDIRECTIONAL"
  | "DISABLED";

export type CatalogSyncConflictStrategy =
  | "MANUAL_REVIEW"
  | "PREFER_INTERNAL"
  | "PREFER_EXTERNAL"
  | "LAST_WRITE_WINS";

export type CatalogSyncAutoApplyMode = "NEVER" | "SAFE_ONLY" | "ALWAYS";

export type CatalogSyncPolicyScope =
  | "CATEGORY"
  | "PRODUCT"
  | "MODIFIER_GROUP"
  | "MODIFIER_OPTION"
  | "PRODUCT_CATEGORY_LINK"
  | "PRODUCT_MODIFIER_GROUP_LINK";

export type CatalogSyncPlanStatus =
  | "DRAFT"
  | "READY"
  | "PARTIALLY_BLOCKED"
  | "BLOCKED"
  | "APPLIED"
  | "FAILED"
  | "CANCELLED";

export type CatalogSyncAction =
  | "APPLY_INTERNAL_PATCH"
  | "APPLY_EXTERNAL_PATCH"
  | "CREATE_INTERNAL_ENTITY"
  | "CREATE_EXTERNAL_ENTITY"
  | "ARCHIVE_INTERNAL_ENTITY"
  | "ARCHIVE_EXTERNAL_ENTITY"
  | "LINK_MAPPING"
  | "UNLINK_MAPPING"
  | "SKIP";

export type CatalogSyncItemStatus =
  | "PENDING"
  | "READY"
  | "BLOCKED"
  | "APPLIED"
  | "FAILED"
  | "SKIPPED";

// ─── Core DTOs ────────────────────────────────────────────────────────────────

export interface CatalogSyncPolicyDto {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  scope: CatalogSyncPolicyScope;
  fieldPath: string | null;
  direction: CatalogSyncDirection;
  conflictStrategy: CatalogSyncConflictStrategy;
  autoApplyMode: CatalogSyncAutoApplyMode;
  isEnabled: boolean;
  priority: number;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSyncPlanItemDto {
  id: string;
  planId: string;
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
  mappingId: string | null;
  externalChangeId: string | null;
  conflictId: string | null;
  publishJobId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CatalogSyncPlanDto {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;
  source: string | null;
  status: CatalogSyncPlanStatus;
  basedOnImportRunId: string | null;
  basedOnExternalChangeId: string | null;
  basedOnConflictId: string | null;
  summary: string | null;
  createdByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  items?: CatalogSyncPlanItemDto[];
}

export interface CatalogSyncExecutionLogDto {
  id: string;
  planId: string;
  planItemId: string | null;
  status: string;
  action: CatalogSyncAction;
  requestPayload: unknown;
  responsePayload: unknown;
  errorMessage: string | null;
  errorCode: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateSyncPolicyInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  scope: CatalogSyncPolicyScope;
  fieldPath?: string;
  direction: CatalogSyncDirection;
  conflictStrategy: CatalogSyncConflictStrategy;
  autoApplyMode: CatalogSyncAutoApplyMode;
  isEnabled?: boolean;
  priority?: number;
}

export interface UpdateSyncPolicyInput {
  direction?: CatalogSyncDirection;
  conflictStrategy?: CatalogSyncConflictStrategy;
  autoApplyMode?: CatalogSyncAutoApplyMode;
  isEnabled?: boolean;
  priority?: number;
}

export interface BuildSyncPlanInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  /** If provided, build plan scoped to a single external change */
  externalChangeId?: string;
  /** If provided, build plan scoped to a single conflict */
  conflictId?: string;
  createdByUserId?: string;
}

export interface ApplySyncPlanOptions {
  /** If true, only apply items matching these statuses. Defaults to READY. */
  statusFilter?: CatalogSyncItemStatus[];
  /** Skip items that would require ALWAYS mode if current policy is SAFE_ONLY */
  safeOnly?: boolean;
}

export interface ApplyExternalFieldPatchInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  /** Map of fieldPath → newValue from the external change */
  fieldPatches: Record<string, unknown>;
  externalChangeId?: string;
  changedByUserId?: string;
}

export interface ApplyExternalStructurePatchInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  externalEntityId?: string;
  externalChangeId?: string;
  changedByUserId?: string;
}

// ─── Summary types ────────────────────────────────────────────────────────────

export interface SyncInboxSummary {
  connectionId: string;
  openExternalChanges: number;
  openConflicts: number;
  readyPlanItems: number;
  blockedPlanItems: number;
  failedPlanItems: number;
  lastSyncAt: string | null;
  activePlanId: string | null;
}

export interface SyncPlanPreview {
  plan: CatalogSyncPlanDto;
  readyCount: number;
  blockedCount: number;
  skippedCount: number;
  appliedCount: number;
  failedCount: number;
  items: CatalogSyncPlanItemDto[];
}

export interface ListSyncPlansOptions {
  connectionId: string;
  status?: CatalogSyncPlanStatus;
  limit?: number;
  offset?: number;
}

// ─── Policy resolution ────────────────────────────────────────────────────────

export interface ResolvedPolicy {
  direction: CatalogSyncDirection;
  conflictStrategy: CatalogSyncConflictStrategy;
  autoApplyMode: CatalogSyncAutoApplyMode;
  source: "explicit" | "default";
}

// ─── Inbound apply result ─────────────────────────────────────────────────────

export interface InboundApplyResult {
  internalEntityId: string;
  internalEntityType: CatalogEntityType;
  appliedFields: string[];
  skippedFields: string[];
  rejectedFields: string[];
  changeRecordsCreated: number;
}

export interface FieldPatchPreview {
  fieldPath: string;
  beforeValue: unknown;
  afterValue: unknown;
  allowed: boolean;
  reason?: string;
}

export interface ExternalChangePatchPreview {
  internalEntityId: string;
  internalEntityType: CatalogEntityType;
  fieldPreviews: FieldPatchPreview[];
}
