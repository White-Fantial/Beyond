/**
 * TypeScript types for the Phase 4 catalog outbound publish layer.
 *
 * Publish = one-way push from internal Beyond canonical catalog → external channel.
 * The mapping layer (ChannelEntityMapping) determines whether to CREATE or UPDATE.
 *
 * Architecture principle:
 *   internal entity → mapping lookup → provider payload → provider API → result persistence
 *
 * External normalized catalog is still primarily refreshed via import.
 * Publish success does NOT automatically make external_catalog_* tables authoritative.
 *
 * TODO Phase 5: external change detection after import
 * TODO Phase 6: conflict detection between internal changes and external changes
 * TODO Phase 7: policy-based two-way sync
 */

import type { CatalogEntityType } from "@/types/catalog-mapping";

export type { CatalogEntityType };

// ─── Publish enums ────────────────────────────────────────────────────────────

export type CatalogPublishAction = "CREATE" | "UPDATE" | "ARCHIVE" | "UNARCHIVE";

export type CatalogPublishStatus =
  | "PENDING"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "SKIPPED"
  | "CANCELLED";

export type CatalogPublishScope =
  | "CATEGORY"
  | "PRODUCT"
  | "MODIFIER_GROUP"
  | "MODIFIER_OPTION"
  | "PRODUCT_CATEGORY_LINK"
  | "PRODUCT_MODIFIER_GROUP_LINK";

export type PublishTriggerSource = "MANUAL_UI" | "BULK_UI" | "API" | "SYSTEM";

// ─── Publish job ──────────────────────────────────────────────────────────────

export interface CatalogPublishJobRow {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;

  internalEntityType: CatalogEntityType | null;
  internalEntityId: string | null;

  scope: CatalogPublishScope;
  action: CatalogPublishAction;
  status: CatalogPublishStatus;

  requestedByUserId: string | null;
  triggerSource: string | null;

  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  errorMessage: string | null;
  errorCode: string | null;

  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Service input types ──────────────────────────────────────────────────────

export interface PublishEntityInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  action: CatalogPublishAction;
  requestedByUserId?: string;
  triggerSource?: PublishTriggerSource;
  /** If true and hash matches lastPublishHash, the job is SKIPPED. Does not apply to ARCHIVE/UNARCHIVE. */
  onlyChanged?: boolean;
}

export interface BulkPublishItem {
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  action: CatalogPublishAction;
}

export interface PublishBulkInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  items: BulkPublishItem[];
  requestedByUserId?: string;
  triggerSource?: PublishTriggerSource;
  onlyChanged?: boolean;
}

export interface PublishConnectionInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  /** Limit to specific entity types. If omitted, all types are included. */
  entityTypes?: CatalogEntityType[];
  requestedByUserId?: string;
  triggerSource?: PublishTriggerSource;
  /** If true, entities whose hash matches lastPublishHash are SKIPPED. */
  onlyChanged?: boolean;
}

export interface GetPublishJobsOptions {
  connectionId: string;
  status?: CatalogPublishStatus;
  internalEntityType?: CatalogEntityType;
  internalEntityId?: string;
  limit?: number;
  offset?: number;
}

// ─── Publish result ───────────────────────────────────────────────────────────

export interface PublishEntityResult {
  jobId: string;
  status: CatalogPublishStatus;
  action: CatalogPublishAction;
  externalId?: string;
  errorMessage?: string;
  skippedReason?: string;
}

export interface PublishBulkResult {
  total: number;
  succeeded: number;
  failed: number;
  skipped: number;
  jobs: PublishEntityResult[];
}

// ─── Provider adapter interface ───────────────────────────────────────────────

export interface ProviderPublishResult {
  success: boolean;
  externalId?: string;
  responsePayload?: Record<string, unknown>;
  warningMessage?: string;
  /** Minimal mirror of the entity as reflected back by the provider after publish. */
  normalizedExternalEntity?: Record<string, unknown>;
  rawPayload?: Record<string, unknown>;
}

/**
 * Interface every provider outbound publish adapter must implement.
 *
 * Methods are optional because not every provider supports every operation.
 * The prerequisite validator checks adapter capability before calling.
 *
 * Adapter contract:
 *   - adapter is responsible for HTTP calls and raw error capture
 *   - adapter does NOT write to the DB
 *   - service layer owns orchestration, job management, and mapping updates
 */
export interface ProviderCatalogPublishAdapter {
  readonly provider: string;

  createCategory?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  updateCategory?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  archiveCategory?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  unarchiveCategory?(input: ProviderPublishInput): Promise<ProviderPublishResult>;

  createProduct?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  updateProduct?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  archiveProduct?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  unarchiveProduct?(input: ProviderPublishInput): Promise<ProviderPublishResult>;

  createModifierGroup?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  updateModifierGroup?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  archiveModifierGroup?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  unarchiveModifierGroup?(input: ProviderPublishInput): Promise<ProviderPublishResult>;

  createModifierOption?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  updateModifierOption?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  archiveModifierOption?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
  unarchiveModifierOption?(input: ProviderPublishInput): Promise<ProviderPublishResult>;
}

/** Common input structure passed to every provider adapter method. */
export interface ProviderPublishInput {
  connectionId: string;
  credentials: Record<string, string>;
  /** External entity id — present for UPDATE/ARCHIVE/UNARCHIVE (from mapping). Absent for CREATE. */
  externalEntityId?: string;
  /** Provider-formatted payload produced by the payload builder. */
  payload: Record<string, unknown>;
  /** The internal entity id for reference/logging. */
  internalEntityId: string;
}
