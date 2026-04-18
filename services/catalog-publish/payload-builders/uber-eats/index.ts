/**
 * Uber Eats payload builders — Phase 4 (stub).
 *
 * TODO: Implement when Uber Eats catalog write API is integrated.
 * Uber Eats uses a menu-level PUT operation to update full catalog sections.
 *
 * Reference: https://developer.uber.com/docs/eats/api/v2/post-eats-stores-storeid-menus
 */

export function buildUberEatsCategoryCreate(_entity: Record<string, unknown>): Record<string, unknown> {
  throw new Error("Uber Eats publish adapter: not yet implemented. (Phase 4 stub)");
}

export function buildUberEatsCategoryUpdate(_entity: Record<string, unknown>, _externalEntityId: string): Record<string, unknown> {
  throw new Error("Uber Eats publish adapter: not yet implemented. (Phase 4 stub)");
}

export function buildUberEatsProductCreate(_entity: Record<string, unknown>): Record<string, unknown> {
  throw new Error("Uber Eats publish adapter: not yet implemented. (Phase 4 stub)");
}

export function buildUberEatsProductUpdate(_entity: Record<string, unknown>, _externalEntityId: string): Record<string, unknown> {
  throw new Error("Uber Eats publish adapter: not yet implemented. (Phase 4 stub)");
}
