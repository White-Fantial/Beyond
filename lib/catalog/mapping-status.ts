/**
 * Catalog mapping status helpers — Phase 3.
 *
 * Centralises status labels, badge colours, and guard helpers so that no
 * business-logic layer needs to hard-code these strings independently.
 */

export type CatalogMappingStatus =
  | "ACTIVE"
  | "NEEDS_REVIEW"
  | "UNMATCHED"
  | "BROKEN"
  | "ARCHIVED";

export type CatalogMappingSource = "AUTO" | "MANUAL" | "IMPORT_SEEDED";

// ─── Labels ───────────────────────────────────────────────────────────────────

export const MAPPING_STATUS_LABELS: Record<CatalogMappingStatus, string> = {
  ACTIVE: "Active",
  NEEDS_REVIEW: "Needs Review",
  UNMATCHED: "Unmatched",
  BROKEN: "Broken",
  ARCHIVED: "Archived",
};

export const MAPPING_SOURCE_LABELS: Record<CatalogMappingSource, string> = {
  AUTO: "Auto",
  MANUAL: "Manual",
  IMPORT_SEEDED: "Import Seeded",
};

// ─── Badge colours (Tailwind class names) ─────────────────────────────────────

export const MAPPING_STATUS_BADGE: Record<CatalogMappingStatus, string> = {
  ACTIVE: "bg-green-100 text-green-700",
  NEEDS_REVIEW: "bg-yellow-100 text-yellow-700",
  UNMATCHED: "bg-orange-100 text-orange-700",
  BROKEN: "bg-red-100 text-red-700",
  ARCHIVED: "bg-gray-100 text-gray-400",
};

// ─── Guards ───────────────────────────────────────────────────────────────────

/** Returns true when the mapping is considered "operational" (not historical). */
export function isActiveMapping(status: CatalogMappingStatus): boolean {
  return status === "ACTIVE";
}

/** Returns true when the mapping requires human attention. */
export function requiresReview(status: CatalogMappingStatus): boolean {
  return status === "NEEDS_REVIEW" || status === "BROKEN" || status === "UNMATCHED";
}

/** Statuses that are exempt from the partial unique index on internalEntityId / externalEntityId. */
export const STATUSES_EXEMPT_FROM_UNIQUE: CatalogMappingStatus[] = ["ARCHIVED", "UNMATCHED"];

export function isExemptFromUnique(status: CatalogMappingStatus): boolean {
  return STATUSES_EXEMPT_FROM_UNIQUE.includes(status);
}

/**
 * Sentinel value used as `internalEntityId` for UNMATCHED mapping rows.
 *
 * UNMATCHED rows have no internal entity to link to, but the DB column is
 * non-nullable.  This empty string distinguishes them from real entity IDs
 * (which are always non-empty UUIDs).  The partial unique index excludes
 * UNMATCHED rows so this sentinel never violates uniqueness constraints.
 */
export const UNMATCHED_INTERNAL_ENTITY_ID = "" as const;
