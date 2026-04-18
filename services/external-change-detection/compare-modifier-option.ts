/**
 * services/external-change-detection/compare-modifier-option.ts
 *
 * Field-level diff for ExternalCatalogModifierOption entities.
 */

import type { ExternalCatalogChangeFieldDto, ExternalChangeFieldChangeType } from "@/types/catalog-external-changes";

export interface ModifierOptionSnapshot {
  normalizedName: string | null;
  normalizedPriceAmount: number | null;
  externalParentId: string | null; // groupExternalId
  rawPayload: Record<string, unknown>;
}

function extractIsSoldOut(raw: Record<string, unknown>): boolean | null {
  if (typeof raw["is_sold_out"] === "boolean") return raw["is_sold_out"] as boolean;
  if (typeof raw["isSoldOut"] === "boolean") return raw["isSoldOut"] as boolean;
  if (typeof raw["out_of_stock"] === "boolean") return raw["out_of_stock"] as boolean;
  return null;
}

export function compareModifierOptionFields(
  prev: ModifierOptionSnapshot,
  curr: ModifierOptionSnapshot
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  const diffs: Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] = [];

  const fields: Array<{ path: string; prevVal: unknown; currVal: unknown; overrideType?: ExternalChangeFieldChangeType }> = [
    { path: "name", prevVal: prev.normalizedName ?? null, currVal: curr.normalizedName ?? null },
    { path: "priceAmount", prevVal: prev.normalizedPriceAmount ?? null, currVal: curr.normalizedPriceAmount ?? null },
    { path: "isSoldOut", prevVal: extractIsSoldOut(prev.rawPayload), currVal: extractIsSoldOut(curr.rawPayload) },
    {
      path: "groupExternalId",
      prevVal: prev.externalParentId ?? null,
      currVal: curr.externalParentId ?? null,
      overrideType: "PARENT_CHANGED",
    },
  ];

  for (const f of fields) {
    if (JSON.stringify(f.prevVal) !== JSON.stringify(f.currVal)) {
      const changeType: ExternalChangeFieldChangeType =
        f.overrideType ?? (f.prevVal === null ? "ADDED" : f.currVal === null ? "REMOVED" : "VALUE_CHANGED");
      diffs.push({ fieldPath: f.path, previousValue: f.prevVal, currentValue: f.currVal, changeType });
    }
  }

  return diffs;
}
