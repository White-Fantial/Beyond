/**
 * Catalog publish hash computation — Phase 4.
 *
 * Computes a deterministic hash over the "publish-relevant" fields of an
 * internal catalog entity.  The hash is stored in mapping.lastPublishHash
 * after a successful publish.  On subsequent publishes, if the current hash
 * matches the stored one, the job can be SKIPPED (onlyChanged mode).
 *
 * Rules:
 *   - ARCHIVE / UNARCHIVE ignore hashes — they always run.
 *   - CREATE without a mapping always runs.
 *   - UPDATE / CREATE with onlyChanged=true compare hashes.
 */

import crypto from "crypto";

// ─── Field selectors per entity type ─────────────────────────────────────────

interface HashableCategory {
  name: string | null;
  description?: string | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

interface HashableProduct {
  name: string | null;
  description?: string | null;
  price?: number | null;
  isVisible?: boolean | null;
  isActive?: boolean | null;
}

interface HashableModifierGroup {
  name: string | null;
  isActive?: boolean | null;
  minSelections?: number | null;
  maxSelections?: number | null;
}

interface HashableModifierOption {
  name: string | null;
  price?: number | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
}

// ─── Hash helpers ─────────────────────────────────────────────────────────────

function stableHash(obj: unknown): string {
  const json = JSON.stringify(obj, (_key, val) =>
    val === undefined ? null : val
  );
  return crypto.createHash("sha256").update(json).digest("hex").slice(0, 32);
}

// ─── Per-entity hash functions ────────────────────────────────────────────────

export function hashCategory(entity: HashableCategory): string {
  return stableHash({
    name: entity.name,
    description: entity.description ?? null,
    isActive: entity.isActive ?? null,
    sortOrder: entity.sortOrder ?? null,
  });
}

export function hashProduct(
  entity: HashableProduct,
  linkedCategoryIds: string[] = [],
  linkedModifierGroupIds: string[] = []
): string {
  return stableHash({
    name: entity.name,
    description: entity.description ?? null,
    price: entity.price ?? null,
    isVisible: entity.isVisible ?? null,
    isActive: entity.isActive ?? null,
    categoryIds: [...linkedCategoryIds].sort(),
    modifierGroupIds: [...linkedModifierGroupIds].sort(),
  });
}

export function hashModifierGroup(entity: HashableModifierGroup): string {
  return stableHash({
    name: entity.name,
    isActive: entity.isActive ?? null,
    minSelections: entity.minSelections ?? null,
    maxSelections: entity.maxSelections ?? null,
  });
}

export function hashModifierOption(entity: HashableModifierOption): string {
  return stableHash({
    name: entity.name,
    price: entity.price ?? null,
    isActive: entity.isActive ?? null,
    sortOrder: entity.sortOrder ?? null,
  });
}

/**
 * Compute publish hash for any internal catalog entity.
 *
 * `entity` must be the raw DB row from the appropriate catalog_* table.
 * `linkedIds` provides category/modifier-group ids for PRODUCT hashing.
 */
export function computePublishHash(
  entityType: string,
  entity: Record<string, unknown>,
  linkedIds?: { categoryIds?: string[]; modifierGroupIds?: string[] }
): string {
  switch (entityType) {
    case "CATEGORY":
      return hashCategory(entity as unknown as HashableCategory);
    case "PRODUCT":
      return hashProduct(
        entity as unknown as HashableProduct,
        linkedIds?.categoryIds ?? [],
        linkedIds?.modifierGroupIds ?? []
      );
    case "MODIFIER_GROUP":
      return hashModifierGroup(entity as unknown as HashableModifierGroup);
    case "MODIFIER_OPTION":
      return hashModifierOption(entity as unknown as HashableModifierOption);
    default:
      return stableHash(entity);
  }
}
