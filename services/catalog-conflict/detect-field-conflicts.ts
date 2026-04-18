/**
 * services/catalog-conflict/detect-field-conflicts.ts
 *
 * Phase 6: Field-level conflict detection.
 *
 * A field conflict exists when:
 *   - External change detected a field diff on a mapped entity
 *   - Internal entity also changed the same field after the baseline
 *   - Internal value ≠ external current value
 */

import { isFieldConflictTracked } from "./conflict-policy";
import { hasInternalChangedAfterBaseline } from "./baseline";
import type { ConflictFieldCandidate } from "@/types/catalog-conflicts";

export interface DetectFieldConflictsArgs {
  tenantId: string;
  storeId: string;
  connectionId: string;
  internalEntityType: string;
  internalEntityId: string;
  baselineAt: Date | null;
  /** Field diffs from ExternalCatalogChangeField */
  externalFieldDiffs: Array<{
    fieldPath: string;
    previousValue: unknown;
    currentValue: unknown;
  }>;
  /** Current internal entity state as key/value map */
  internalCurrentValues: Record<string, unknown>;
}

/**
 * Evaluates which of the external field diffs constitute a true field conflict.
 * Returns candidates that should be stored as CatalogConflictField rows.
 */
export async function detectFieldConflicts(
  args: DetectFieldConflictsArgs
): Promise<ConflictFieldCandidate[]> {
  const {
    tenantId,
    storeId,
    internalEntityType,
    internalEntityId,
    baselineAt,
    externalFieldDiffs,
    internalCurrentValues,
  } = args;

  const candidates: ConflictFieldCandidate[] = [];

  for (const diff of externalFieldDiffs) {
    const { fieldPath, previousValue: baselineValue, currentValue: externalValue } = diff;

    // Check policy — skip fields not tracked
    if (!isFieldConflictTracked(internalEntityType, fieldPath)) continue;

    // Check if internal also changed this field after baseline
    const internalChanged = await hasInternalChangedAfterBaseline(
      tenantId,
      storeId,
      internalEntityId,
      internalEntityType,
      fieldPath,
      baselineAt
    );

    if (!internalChanged) continue;

    // Get current internal value for this field
    const internalValue = internalCurrentValues[fieldPath] ?? null;

    // Both sides changed — are they the same?
    if (JSON.stringify(internalValue) === JSON.stringify(externalValue)) {
      // Both converged to the same value — not a conflict
      continue;
    }

    candidates.push({
      fieldPath,
      fieldConflictType: "VALUE_MISMATCH",
      baselineValue,
      internalValue,
      externalValue,
    });
  }

  return candidates;
}

/**
 * Maps internal entity fields to a flat key/value record for comparison.
 * Normalises field naming across internal catalog models.
 */
export function extractInternalFieldValues(
  entityType: string,
  entity: Record<string, unknown>
): Record<string, unknown> {
  switch (entityType) {
    case "PRODUCT":
      return {
        name:         entity["name"] ?? null,
        description:  entity["description"] ?? null,
        priceAmount:  entity["basePriceAmount"] ?? null,
        isActive:     entity["isActive"] ?? null,
        isSoldOut:    entity["isSoldOut"] ?? null,
        imageUrl:     entity["imageUrl"] ?? null,
        displayOrder: entity["displayOrder"] ?? null,
      };
    case "CATEGORY":
      return {
        name:        entity["name"] ?? null,
        isActive:    entity["isActive"] ?? null,
        sortOrder:   entity["displayOrder"] ?? null,
        imageUrl:    entity["imageUrl"] ?? null,
      };
    case "MODIFIER_GROUP":
      return {
        name:         entity["name"] ?? null,
        isActive:     entity["isActive"] ?? null,
        selectionMin: entity["selectionMin"] ?? null,
        selectionMax: entity["selectionMax"] ?? null,
        isRequired:   entity["isRequired"] ?? null,
        minSelect:    entity["selectionMin"] ?? null,
        maxSelect:    entity["selectionMax"] ?? null,
      };
    case "MODIFIER_OPTION":
      return {
        name:        entity["name"] ?? null,
        priceAmount: entity["priceDeltaAmount"] ?? null,
        isActive:    entity["isActive"] ?? null,
        isSoldOut:   entity["isSoldOut"] ?? null,
        isDefault:   entity["isDefault"] ?? null,
      };
    default:
      return {};
  }
}
