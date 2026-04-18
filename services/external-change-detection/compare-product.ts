/**
 * services/external-change-detection/compare-product.ts
 *
 * Field-level diff for ExternalCatalogProduct entities.
 */

import type { ExternalCatalogChangeFieldDto, ExternalChangeFieldChangeType } from "@/types/catalog-external-changes";

export interface ProductSnapshot {
  normalizedName: string | null;
  normalizedPriceAmount: number | null;
  rawPayload: Record<string, unknown>;
}

function extractIsActive(raw: Record<string, unknown>): boolean | null {
  if (typeof raw["is_active"] === "boolean") return raw["is_active"] as boolean;
  if (typeof raw["isActive"] === "boolean") return raw["isActive"] as boolean;
  if (typeof raw["deleted"] === "boolean") return !(raw["deleted"] as boolean);
  return null;
}

function extractIsSoldOut(raw: Record<string, unknown>): boolean | null {
  if (typeof raw["is_sold_out"] === "boolean") return raw["is_sold_out"] as boolean;
  if (typeof raw["isSoldOut"] === "boolean") return raw["isSoldOut"] as boolean;
  // Loyverse: check variants for sold_by_weight / track_stock info (simplified)
  if (typeof raw["out_of_stock"] === "boolean") return raw["out_of_stock"] as boolean;
  return null;
}

function extractImageUrl(raw: Record<string, unknown>): string | null {
  if (typeof raw["image_url"] === "string") return raw["image_url"] as string;
  if (typeof raw["imageUrl"] === "string") return raw["imageUrl"] as string;
  return null;
}

export function compareProductFields(
  prev: ProductSnapshot,
  curr: ProductSnapshot
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  const diffs: Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] = [];

  const fields: Array<{ path: string; prevVal: unknown; currVal: unknown }> = [
    { path: "name", prevVal: prev.normalizedName ?? null, currVal: curr.normalizedName ?? null },
    { path: "priceAmount", prevVal: prev.normalizedPriceAmount ?? null, currVal: curr.normalizedPriceAmount ?? null },
    { path: "isActive", prevVal: extractIsActive(prev.rawPayload), currVal: extractIsActive(curr.rawPayload) },
    { path: "isSoldOut", prevVal: extractIsSoldOut(prev.rawPayload), currVal: extractIsSoldOut(curr.rawPayload) },
    { path: "imageUrl", prevVal: extractImageUrl(prev.rawPayload), currVal: extractImageUrl(curr.rawPayload) },
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
