/**
 * services/catalog-conflict/detect-structure-conflicts.ts
 *
 * Phase 6: Structure-level conflict detection.
 *
 * Structure conflicts arise when both internal and external sides have changed
 * the structural relationship of an entity (e.g., which modifier groups a product
 * has, or which category a product belongs to).
 */

import { hasInternalChangedAfterBaseline } from "./baseline";
import type { ConflictFieldCandidate } from "@/types/catalog-conflicts";

export interface DetectStructureConflictsArgs {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  baselineAt: Date | null;
  /** Area name: "categoryLinks" | "modifierGroupLinks" | "modifierOptionParent" */
  area: string;
  /** Internal link set at current time (sorted IDs) */
  internalLinks: string[];
  /** External link set at current time (sorted external IDs) */
  externalLinks: string[];
  /** Baseline link set (if known) */
  baselineLinks: string[];
}

/**
 * Evaluates whether a structural area change constitutes a true conflict.
 * Returns candidate field entries if a conflict is detected.
 */
export async function detectStructureConflicts(
  args: DetectStructureConflictsArgs
): Promise<ConflictFieldCandidate[]> {
  const {
    tenantId,
    storeId,
    internalEntityType,
    internalEntityId,
    baselineAt,
    area,
    internalLinks,
    externalLinks,
    baselineLinks,
  } = args;

  const sorted = (arr: string[]) => [...arr].sort();
  const internalSorted   = sorted(internalLinks);
  const externalSorted   = sorted(externalLinks);
  const baselineSorted   = sorted(baselineLinks);

  // Check if external changed from baseline
  const externalChanged = JSON.stringify(externalSorted) !== JSON.stringify(baselineSorted);
  if (!externalChanged) return []; // No external structure change — no conflict

  // Check if internal also changed from baseline in this structural area
  const internalChanged = await hasInternalChangedAfterBaseline(
    tenantId,
    storeId,
    internalEntityId,
    internalEntityType,
    area,
    baselineAt
  );

  if (!internalChanged) return []; // Only external changed — not a conflict

  // Both sides changed — check if they diverged
  if (JSON.stringify(internalSorted) === JSON.stringify(externalSorted)) {
    // Both converged to the same structure — not a conflict
    return [];
  }

  // Compute structural diff for field-level detail
  const internalSet  = new Set(internalLinks);
  const externalSet  = new Set(externalLinks);
  const baselineSet  = new Set(baselineLinks);

  const addedOnExternal   = externalLinks.filter((l) => !baselineSet.has(l));
  const removedOnExternal = baselineLinks.filter((l) => !externalSet.has(l));
  const addedOnInternal   = internalLinks.filter((l) => !baselineSet.has(l));
  const removedOnInternal = baselineLinks.filter((l) => !internalSet.has(l));

  const candidates: ConflictFieldCandidate[] = [];

  // Report items added on external but not on internal
  for (const link of addedOnExternal) {
    if (!internalSet.has(link)) {
      candidates.push({
        fieldPath: `${area}[${link}]`,
        fieldConflictType: "ADDED_ON_EXTERNAL",
        baselineValue: null,
        internalValue: null,
        externalValue: link,
      });
    }
  }

  // Report items removed on external but still present internally
  for (const link of removedOnExternal) {
    if (internalSet.has(link)) {
      candidates.push({
        fieldPath: `${area}[${link}]`,
        fieldConflictType: "REMOVED_ON_EXTERNAL",
        baselineValue: link,
        internalValue: link,
        externalValue: null,
      });
    }
  }

  // Report items added on internal but removed on external
  for (const link of addedOnInternal) {
    if (!externalSet.has(link)) {
      candidates.push({
        fieldPath: `${area}[${link}]`,
        fieldConflictType: "STRUCTURE_MISMATCH",
        baselineValue: null,
        internalValue: link,
        externalValue: null,
      });
    }
  }

  // Report items removed on internal but added on external
  for (const link of removedOnInternal) {
    if (externalSet.has(link)) {
      candidates.push({
        fieldPath: `${area}[${link}]`,
        fieldConflictType: "STRUCTURE_MISMATCH",
        baselineValue: link,
        internalValue: null,
        externalValue: link,
      });
    }
  }

  // Deduplicate by fieldPath (multiple conditions can produce same path)
  const seen = new Set<string>();
  return candidates.filter((c) => {
    if (seen.has(c.fieldPath)) return false;
    seen.add(c.fieldPath);
    return true;
  });
}
