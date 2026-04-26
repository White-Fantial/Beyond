/**
 * Uber Eats payload builders — menu v2 payload fragments.
 *
 * Uber Eats catalog writes are menu-level (`PUT /v2/eats/stores/{store_id}/menus`).
 * These builders shape internal entities into normalized fragments that can be
 * merged into a full menu payload by the adapter layer.
 *
 * References:
 * - https://developer.uber.com/docs/eats/references/api/v2/put-eats-stores-storeid-menus
 * - https://developer.uber.com/docs/eats/guides/menu-integration
 */

import { normalizeAvailability } from "@/services/catalog-publish/payload-builders/common/availability";

interface InternalCategory {
  name?: string | null;
  description?: string | null;
  isActive?: boolean | null;
  isVisible?: boolean | null;
  [key: string]: unknown;
}

interface InternalProduct {
  name?: string | null;
  description?: string | null;
  price?: number | null;
  isActive?: boolean | null;
  isVisible?: boolean | null;
  [key: string]: unknown;
}

function requireName(entity: { name?: string | null }, label: string): string {
  const name = entity.name?.trim();
  if (!name) {
    throw new Error(`Uber Eats ${label} payload: name is required.`);
  }
  return name;
}

export function buildUberEatsCategoryCreate(entity: InternalCategory): Record<string, unknown> {
  const name = requireName(entity, "category");
  const availability = normalizeAvailability(entity);

  return {
    id: (entity.id as string | undefined) ?? undefined,
    title: { translations: { en_us: name } },
    subtitle: entity.description ? { translations: { en_us: entity.description } } : undefined,
    service_availability: availability.windows.map((window) => ({
      day_of_week: window.dayOfWeek,
      time_periods: [{ start_time: window.startTime, end_time: window.endTime }],
    })),
    active: availability.isAvailable,
  };
}

export function buildUberEatsCategoryUpdate(
  entity: InternalCategory,
  externalEntityId: string
): Record<string, unknown> {
  return {
    ...buildUberEatsCategoryCreate(entity),
    id: externalEntityId,
  };
}

export function buildUberEatsProductCreate(entity: InternalProduct): Record<string, unknown> {
  const name = requireName(entity, "item");
  const availability = normalizeAvailability(entity);

  return {
    id: (entity.id as string | undefined) ?? undefined,
    title: { translations: { en_us: name } },
    description: entity.description ? { translations: { en_us: entity.description } } : undefined,
    price_info: {
      price: Number(entity.price ?? 0),
    },
    suspended: !availability.isAvailable,
    service_availability: availability.windows.map((window) => ({
      day_of_week: window.dayOfWeek,
      time_periods: [{ start_time: window.startTime, end_time: window.endTime }],
    })),
  };
}

export function buildUberEatsProductUpdate(
  entity: InternalProduct,
  externalEntityId: string
): Record<string, unknown> {
  return {
    ...buildUberEatsProductCreate(entity),
    id: externalEntityId,
  };
}
