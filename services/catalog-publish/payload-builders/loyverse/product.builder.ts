/**
 * Loyverse product (item) payload builder — Phase 4.
 *
 * Converts an internal CatalogProduct row into a Loyverse API request payload.
 *
 * Loyverse item API uses "items" endpoint.
 * Key fields: item_name, category_id, price (via variants), modifier_ids.
 *
 * Rules:
 *   - category_id and modifier_ids MUST come from mapping lookups — never inferred.
 *   - If a required parent mapping is missing the builder throws with a clear error.
 *   - CREATE payload omits the external id field.
 */

export interface LoyverseProductPayload {
  item_name: string;
  description?: string;
  category_id?: string;
  modifier_ids?: string[];
  variants?: Array<{ price: number; sku?: string | null }>;
  is_active?: boolean;
}

interface InternalProduct {
  name: string | null;
  description?: string | null;
  price?: number | null;
  isActive?: boolean | null;
  isVisible?: boolean | null;
  [key: string]: unknown;
}

export interface LoyverseProductPayloadContext {
  /** External category id from ACTIVE mapping (null if no mapping exists yet). */
  externalCategoryId?: string | null;
  /** External modifier group ids from ACTIVE mappings. */
  externalModifierGroupIds?: string[];
}

export function buildLoyverseProductCreate(
  entity: InternalProduct,
  ctx: LoyverseProductPayloadContext = {}
): LoyverseProductPayload {
  if (!entity.name) {
    throw new Error("Loyverse product payload: name is required.");
  }
  const payload: LoyverseProductPayload = {
    item_name: entity.name,
    description: entity.description ?? undefined,
    variants: [{ price: entity.price ?? 0 }],
    is_active: entity.isActive ?? true,
  };
  if (ctx.externalCategoryId) {
    payload.category_id = ctx.externalCategoryId;
  }
  if (ctx.externalModifierGroupIds?.length) {
    payload.modifier_ids = ctx.externalModifierGroupIds;
  }
  return payload;
}

export function buildLoyverseProductUpdate(
  entity: InternalProduct,
  _externalEntityId: string,
  ctx: LoyverseProductPayloadContext = {}
): LoyverseProductPayload {
  return buildLoyverseProductCreate(entity, ctx);
}
