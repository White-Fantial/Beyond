/**
 * Loyverse category payload builder — Phase 4.
 *
 * Converts an internal CatalogCategory row into a Loyverse API request payload.
 *
 * Loyverse category API:
 *   POST /categories    → { name: string, color?: string }
 *   PUT  /categories/:id → { name: string, color?: string }
 *
 * Rules:
 *   - Never derives external id from internal id.
 *   - External id always comes from the mapping row (for UPDATE/ARCHIVE).
 *   - CREATE payload never includes an external id.
 */

export interface LoyverseCategoryPayload {
  name: string;
  color?: string;
  // Loyverse does not support a native "archive" state on categories.
  // Archiving must be handled by the adapter as a soft-delete or no-op.
}

interface InternalCategory {
  name: string | null;
  description?: string | null;
  isActive?: boolean | null;
  [key: string]: unknown;
}

export function buildLoyverseCategoryCreate(entity: InternalCategory): LoyverseCategoryPayload {
  if (!entity.name) {
    throw new Error("Loyverse category payload: name is required.");
  }
  return { name: entity.name };
}

export function buildLoyverseCategoryUpdate(
  entity: InternalCategory,
  _externalEntityId: string
): LoyverseCategoryPayload {
  if (!entity.name) {
    throw new Error("Loyverse category payload: name is required.");
  }
  return { name: entity.name };
}
