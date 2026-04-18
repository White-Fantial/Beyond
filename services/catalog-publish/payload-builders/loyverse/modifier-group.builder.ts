/**
 * Loyverse modifier group payload builder — Phase 4.
 *
 * Loyverse modifier groups (modifier sets) contain modifiers (options).
 * API: POST/PUT /modifier_groups  (or embedded in item payload)
 *
 * For the purpose of this builder we produce the modifier-group-level payload.
 * The Loyverse adapter will determine the correct endpoint.
 */

export interface LoyverseModifierGroupPayload {
  name: string;
  modifiers?: Array<{ name: string; price_money?: { amount: number; currency_code: string } }>;
}

interface InternalModifierGroup {
  name: string | null;
  isActive?: boolean | null;
  minSelections?: number | null;
  maxSelections?: number | null;
  [key: string]: unknown;
}

export function buildLoyverseModifierGroupCreate(entity: InternalModifierGroup): LoyverseModifierGroupPayload {
  if (!entity.name) {
    throw new Error("Loyverse modifier group payload: name is required.");
  }
  return { name: entity.name };
}

export function buildLoyverseModifierGroupUpdate(
  entity: InternalModifierGroup,
  _externalEntityId: string
): LoyverseModifierGroupPayload {
  return buildLoyverseModifierGroupCreate(entity);
}
