/**
 * services/external-change-detection/compare-links.ts
 *
 * Structure-level diff for product-category and product-modifier-group links.
 */

import type { ExternalCatalogChangeFieldDto } from "@/types/catalog-external-changes";

export interface LinkDiff {
  fieldPath: string;
  previousValue: unknown;
  currentValue: unknown;
  changeType: "ADDED" | "REMOVED" | "ORDER_CHANGED";
}

/** Compare two sorted-string arrays and return added/removed entries. */
function arrayDiff(
  prev: string[],
  curr: string[]
): LinkDiff[] {
  const diffs: LinkDiff[] = [];
  const prevSet = new Set(prev);
  const currSet = new Set(curr);

  for (const id of currSet) {
    if (!prevSet.has(id)) {
      diffs.push({ fieldPath: "categoryLinks", previousValue: null, currentValue: id, changeType: "ADDED" });
    }
  }
  for (const id of prevSet) {
    if (!currSet.has(id)) {
      diffs.push({ fieldPath: "categoryLinks", previousValue: id, currentValue: null, changeType: "REMOVED" });
    }
  }
  return diffs;
}

function modGroupArrayDiff(prev: string[], curr: string[]): LinkDiff[] {
  const diffs: LinkDiff[] = [];
  const prevSet = new Set(prev);
  const currSet = new Set(curr);

  for (const id of currSet) {
    if (!prevSet.has(id)) {
      diffs.push({ fieldPath: "modifierGroupLinks", previousValue: null, currentValue: id, changeType: "ADDED" });
    }
  }
  for (const id of prevSet) {
    if (!currSet.has(id)) {
      diffs.push({ fieldPath: "modifierGroupLinks", previousValue: id, currentValue: null, changeType: "REMOVED" });
    }
  }
  return diffs;
}

/** Detect category-link changes for a single product. */
export function compareCategoryLinks(
  prevCategoryIds: string[],
  currCategoryIds: string[]
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  return arrayDiff(prevCategoryIds, currCategoryIds).map((d) => ({
    fieldPath: d.fieldPath,
    previousValue: d.previousValue,
    currentValue: d.currentValue,
    changeType: d.changeType,
  }));
}

/** Detect modifier-group-link changes for a single product. */
export function compareModifierGroupLinks(
  prevGroupIds: string[],
  currGroupIds: string[]
): Omit<ExternalCatalogChangeFieldDto, "id" | "changeId" | "createdAt">[] {
  return modGroupArrayDiff(prevGroupIds, currGroupIds).map((d) => ({
    fieldPath: d.fieldPath,
    previousValue: d.previousValue,
    currentValue: d.currentValue,
    changeType: d.changeType,
  }));
}
