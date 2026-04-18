/**
 * services/catalog-merge/resolve-values.ts
 *
 * Resolves the final value for a field or structure choice based on the
 * selected choice strategy.
 */

import type { CatalogMergeDraftFieldDto, CatalogMergeDraftStructureDto } from "@/types/catalog-merge";

/**
 * Compute the resolvedValue for a field choice row.
 * - TAKE_INTERNAL  → internalValue
 * - TAKE_EXTERNAL  → externalValue
 * - CUSTOM_VALUE   → customValue
 */
export function resolveFieldValue(
  field: Pick<
    CatalogMergeDraftFieldDto,
    "choice" | "internalValue" | "externalValue" | "customValue"
  >
): unknown {
  switch (field.choice) {
    case "TAKE_INTERNAL":
      return field.internalValue;
    case "TAKE_EXTERNAL":
      return field.externalValue;
    case "CUSTOM_VALUE":
      return field.customValue;
    default:
      return field.internalValue;
  }
}

/**
 * Compute the resolvedValue for a structure choice row.
 * - KEEP_INTERNAL_SET  → internalValue
 * - TAKE_EXTERNAL_SET  → externalValue
 * - MERGE_SELECTED     → customValue (caller sets explicit merged array)
 * - CUSTOM_STRUCTURE   → customValue
 */
export function resolveStructureValue(
  structure: Pick<
    CatalogMergeDraftStructureDto,
    "choice" | "internalValue" | "externalValue" | "customValue"
  >
): unknown {
  switch (structure.choice) {
    case "KEEP_INTERNAL_SET":
      return structure.internalValue;
    case "TAKE_EXTERNAL_SET":
      return structure.externalValue;
    case "MERGE_SELECTED":
    case "CUSTOM_STRUCTURE":
      return structure.customValue;
    default:
      return structure.internalValue;
  }
}
