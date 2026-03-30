// Parsing helpers: convert raw Loyverse data into normalized forms used by the
// raw mirror persistence and internal catalog upsert layers.

import type { LoyverseCategory, LoyverseModifierGroup, LoyverseItem, LoyverseModifier } from "./types";

// ─── Money helpers ────────────────────────────────────────────────────────────

/**
 * Convert a Loyverse float price (e.g. 12.50) to integer minor units (1250).
 * Always round to avoid floating-point drift.
 */
export function toMinorUnits(amount: number): number {
  return Math.round(amount * 100);
}

// ─── Category parsing ────────────────────────────────────────────────────────

export interface ParsedExternalCategory {
  externalId: string;
  normalizedName: string;
  externalUpdatedAt: Date | null;
  rawPayload: LoyverseCategory;
}

export function parseLoyverseCategory(raw: LoyverseCategory): ParsedExternalCategory {
  return {
    externalId: raw.id,
    normalizedName: raw.name.trim(),
    externalUpdatedAt: raw.updated_at ? new Date(raw.updated_at) : null,
    rawPayload: raw,
  };
}

// ─── Modifier group parsing ───────────────────────────────────────────────────

export interface ParsedExternalModifierOption {
  externalId: string;
  normalizedName: string;
  normalizedPriceAmount: number;
  rawPayload: LoyverseModifier;
}

export interface ParsedExternalModifierGroup {
  externalId: string;
  normalizedName: string;
  externalUpdatedAt: Date | null;
  rawPayload: LoyverseModifierGroup;
  options: ParsedExternalModifierOption[];
}

export function parseLoyverseModifierGroup(raw: LoyverseModifierGroup): ParsedExternalModifierGroup {
  return {
    externalId: raw.id,
    normalizedName: raw.name.trim(),
    externalUpdatedAt: raw.updated_at ? new Date(raw.updated_at) : null,
    rawPayload: raw,
    options: (raw.modifiers ?? []).map((m) => ({
      externalId: m.id,
      normalizedName: m.name.trim(),
      normalizedPriceAmount: toMinorUnits(m.price ?? 0),
      rawPayload: m,
    })),
  };
}

// ─── Item (product) parsing ───────────────────────────────────────────────────

export interface ParsedExternalProduct {
  externalId: string;
  externalParentId: string | null; // category_id
  normalizedName: string;
  normalizedPriceAmount: number; // from first variant
  externalUpdatedAt: Date | null;
  rawPayload: LoyverseItem;
  modifierGroupIds: string[];
}

export function parseLoyverseItem(raw: LoyverseItem): ParsedExternalProduct {
  const firstVariant = raw.variants?.[0];
  return {
    externalId: raw.id,
    externalParentId: raw.category_id ?? null,
    normalizedName: raw.item_name.trim(),
    normalizedPriceAmount: toMinorUnits(firstVariant?.price ?? 0),
    externalUpdatedAt: raw.updated_at ? new Date(raw.updated_at) : null,
    rawPayload: raw,
    modifierGroupIds: raw.modifier_ids ?? [],
  };
}
