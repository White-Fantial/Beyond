/**
 * services/external-change-detection/compare-category.ts
 *
 * Field-level diff for ExternalCatalogCategory entities.
 */

import type { ExternalCatalogChangeFieldDto, ExternalChangeFieldChangeType } from "@/types/catalog-external-changes";

export interface CategorySnapshot {
  normalizedName: string | null;
  rawPayload: Record<string, unknown>;
}

function extractSortOrder(raw: Record<string, unknown>): number | null {
  if (typeof raw["sort_order"] === "number") return raw["sort_order"] as number;
  if (typeof raw["sortOrder"] === "number") return raw["sortOrder"] as number;
  return null;
}

function extractIsActive(raw: Record<string, unknown>): boolean | null {
  if (typeof raw["is_active"] === "boolean") return raw["is_active"] as boolean;
  if (typeof raw["isActive"] === "boolean") return raw["isActive"] as boolean;
  if (typeof raw["deleted"] === "boolean") return !(raw["deleted"] as boolean);
  return null;
}

export function compareCategoryFields(
  prev: CategorySnapshot,
  curr: CategorySnapshot
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  const diffs: Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] = [];

  const fields: Array<{
    path: string;
    prevVal: unknown;
    currVal: unknown;
  }> = [
    {
      path: "name",
      prevVal: prev.normalizedName ?? null,
      currVal: curr.normalizedName ?? null,
    },
    {
      path: "sortOrder",
      prevVal: extractSortOrder(prev.rawPayload),
      currVal: extractSortOrder(curr.rawPayload),
    },
    {
      path: "isActive",
      prevVal: extractIsActive(prev.rawPayload),
      currVal: extractIsActive(curr.rawPayload),
    },
  ];

  for (const f of fields) {
    if (JSON.stringify(f.prevVal) !== JSON.stringify(f.currVal)) {
      const changeType: ExternalChangeFieldChangeType =
        f.prevVal === null ? "ADDED" : f.currVal === null ? "REMOVED" : "VALUE_CHANGED";
      diffs.push({
        fieldPath: f.path,
        previousValue: f.prevVal,
        currentValue: f.currVal,
        changeType,
      });
    }
  }

  return diffs;
}
