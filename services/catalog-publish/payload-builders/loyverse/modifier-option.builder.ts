/**
 * Loyverse modifier option payload builder — Phase 4.
 *
 * In Loyverse, modifier options ("modifiers") live inside modifier groups.
 * To publish an option, the parent modifier group's external id is required.
 *
 * Rules:
 *   - `parentExternalGroupId` MUST come from an ACTIVE mapping — never inferred.
 *   - If parentExternalGroupId is absent, throw an error (prerequisite violated).
 */

export interface LoyverseModifierOptionPayload {
  name: string;
  price_money?: { amount: number; currency_code: string };
  /** The external modifier group (set) this option belongs to. */
  modifier_set_id: string;
}

interface InternalModifierOption {
  name: string | null;
  price?: number | null;
  isActive?: boolean | null;
  sortOrder?: number | null;
  groupId?: string | null;
  [key: string]: unknown;
}

export function buildLoyverseModifierOptionCreate(
  entity: InternalModifierOption,
  parentExternalGroupId: string,
  currencyCode: string = "USD"
): LoyverseModifierOptionPayload {
  if (!entity.name) {
    throw new Error("Loyverse modifier option payload: name is required.");
  }
  if (!parentExternalGroupId) {
    throw new Error(
      "Loyverse modifier option payload: parentExternalGroupId is required. " +
        "Ensure the parent modifier group has an ACTIVE mapping before publishing its options."
    );
  }
  return {
    name: entity.name,
    modifier_set_id: parentExternalGroupId,
    price_money:
      entity.price != null
        ? { amount: Math.round(entity.price * 100), currency_code: currencyCode }
        : undefined,
  };
}

export function buildLoyverseModifierOptionUpdate(
  entity: InternalModifierOption,
  _externalEntityId: string,
  parentExternalGroupId: string,
  currencyCode: string = "USD"
): LoyverseModifierOptionPayload {
  return buildLoyverseModifierOptionCreate(entity, parentExternalGroupId, currencyCode);
}
