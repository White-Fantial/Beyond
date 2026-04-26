/**
 * DoorDash payload builders.
 *
 * These builders generate menu fragment payloads used by the DoorDash publish
 * adapter to mutate a menu document.
 */

import { normalizeAvailability } from "@/services/catalog-publish/payload-builders/common/availability";

interface InternalEntity {
  id?: string | null;
  name?: string | null;
  description?: string | null;
  price?: number | null;
  isActive?: boolean | null;
  isVisible?: boolean | null;
  [key: string]: unknown;
}

function requireName(entity: InternalEntity, label: string): string {
  const name = entity.name?.trim();
  if (!name) {
    throw new Error(`DoorDash ${label} payload: name is required.`);
  }
  return name;
}

function buildAvailability(entity: InternalEntity): Array<{ day_of_week: string; start_time: string; end_time: string }> {
  const availability = normalizeAvailability(entity);
  return availability.windows.map((window) => ({
    day_of_week: window.dayOfWeek,
    start_time: window.startTime,
    end_time: window.endTime,
  }));
}

export function buildDoorDashCategoryCreate(entity: InternalEntity): Record<string, unknown> {
  const name = requireName(entity, "category");
  return {
    id: entity.id ?? undefined,
    name,
    description: entity.description ?? undefined,
    active: entity.isActive ?? entity.isVisible ?? true,
    availability: buildAvailability(entity),
  };
}

export function buildDoorDashCategoryUpdate(
  entity: InternalEntity,
  externalEntityId: string
): Record<string, unknown> {
  return {
    ...buildDoorDashCategoryCreate(entity),
    id: externalEntityId,
  };
}

export function buildDoorDashProductCreate(entity: InternalEntity): Record<string, unknown> {
  const name = requireName(entity, "item");
  return {
    id: entity.id ?? undefined,
    name,
    description: entity.description ?? undefined,
    price: Number(entity.price ?? 0),
    active: entity.isActive ?? entity.isVisible ?? true,
    availability: buildAvailability(entity),
  };
}

export function buildDoorDashProductUpdate(
  entity: InternalEntity,
  externalEntityId: string
): Record<string, unknown> {
  return {
    ...buildDoorDashProductCreate(entity),
    id: externalEntityId,
  };
}
