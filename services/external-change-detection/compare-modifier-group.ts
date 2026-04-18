/**
 * services/external-change-detection/compare-modifier-group.ts
 *
 * Field-level diff for ExternalCatalogModifierGroup entities.
 */

import type { ExternalCatalogChangeFieldDto, ExternalChangeFieldChangeType } from "@/types/catalog-external-changes";

export interface ModifierGroupSnapshot {
  normalizedName: string | null;
  rawPayload: Record<string, unknown>;
}

function extractMinSelect(raw: Record<string, unknown>): number | null {
  if (typeof raw["min_select"] === "number") return raw["min_select"] as number;
  if (typeof raw["minSelect"] === "number") return raw["minSelect"] as number;
  if (typeof raw["min_quantity"] === "number") return raw["min_quantity"] as number;
  return null;
}

function extractMaxSelect(raw: Record<string, unknown>): number | null {
  if (typeof raw["max_select"] === "number") return raw["max_select"] as number;
  if (typeof raw["maxSelect"] === "number") return raw["maxSelect"] as number;
  if (typeof raw["max_quantity"] === "number") return raw["max_quantity"] as number;
  return null;
}

export function compareModifierGroupFields(
  prev: ModifierGroupSnapshot,
  curr: ModifierGroupSnapshot
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  const diffs: Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] = [];

  const fields: Array<{ path: string; prevVal: unknown; currVal: unknown }> = [
    { path: "name", prevVal: prev.normalizedName ?? null, currVal: curr.normalizedName ?? null },
    { path: "minSelect", prevVal: extractMinSelect(prev.rawPayload), currVal: extractMinSelect(curr.rawPayload) },
    { path: "maxSelect", prevVal: extractMaxSelect(prev.rawPayload), currVal: extractMaxSelect(curr.rawPayload) },
  ];

  for (const f of fields) {
    if (JSON.stringify(f.prevVal) !== JSON.stringify(f.currVal)) {
      const changeType: ExternalChangeFieldChangeType =
        f.prevVal === null ? "ADDED" : f.currVal === null ? "REMOVED" : "VALUE_CHANGED";
      diffs.push({ fieldPath: f.path, previousValue: f.prevVal, currentValue: f.currVal, changeType });
    }
  }

  return diffs;
}
