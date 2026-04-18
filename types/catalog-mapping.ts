/**
 * TypeScript types for the Phase 3 catalog mapping layer.
 *
 * These types correspond to the channel_entity_mappings table and the API
 * responses served by /api/catalog/mappings/*.
 */

import type { CatalogMappingStatus, CatalogMappingSource } from "@/lib/catalog/mapping-status";

export type { CatalogMappingStatus, CatalogMappingSource };

export type CatalogEntityType = "CATEGORY" | "PRODUCT" | "MODIFIER_GROUP" | "MODIFIER_OPTION";

// ─── Core mapping row ─────────────────────────────────────────────────────────

export interface ChannelEntityMappingRow {
  id: string;
  tenantId: string;
  storeId: string;
  connectionId: string;

  internalEntityType: CatalogEntityType;
  internalEntityId: string;

  externalEntityType: CatalogEntityType;
  externalEntityId: string;

  status: CatalogMappingStatus;
  source: CatalogMappingSource;

  confidenceScore: number | null;
  matchReason: string | null;
  notes: string | null;

  lastValidatedAt: Date | null;
  linkedAt: Date;
  unlinkedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// ─── Enriched view (with resolved names) ─────────────────────────────────────

export interface MappingWithNames extends ChannelEntityMappingRow {
  internalEntityName: string | null;
  externalEntityName: string | null;
}

// ─── Review summary ───────────────────────────────────────────────────────────

export interface MappingEntityTypeSummary {
  entityType: CatalogEntityType;
  active: number;
  needsReview: number;
  unmatched: number;
  broken: number;
}

export interface MappingReviewSummary {
  connectionId: string;
  totals: {
    active: number;
    needsReview: number;
    unmatched: number;
    broken: number;
    archived: number;
  };
  byEntityType: MappingEntityTypeSummary[];
}

// ─── Unmatched external entity ────────────────────────────────────────────────

export interface MatchCandidate {
  internalEntityId: string;
  internalEntityName: string | null;
  confidence: number;
  reason: string;
}

export interface UnmatchedExternalEntity {
  externalEntityId: string;
  externalEntityName: string | null;
  entityType: CatalogEntityType;
  topCandidates: MatchCandidate[];
}

// ─── Service input types ──────────────────────────────────────────────────────

export interface LinkEntityInput {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: CatalogEntityType;
  internalEntityId: string;
  externalEntityType: CatalogEntityType;
  externalEntityId: string;
  notes?: string;
}

export interface RelinkEntityInput {
  mappingId: string;
  newInternalEntityId: string;
  notes?: string;
}

export interface UnlinkMappingInput {
  mappingId: string;
  reason?: string;
}

// ─── List query options ───────────────────────────────────────────────────────

export interface ListMappingsOptions {
  status?: CatalogMappingStatus;
  entityType?: CatalogEntityType;
  search?: string;
  page?: number;
  perPage?: number;
}
