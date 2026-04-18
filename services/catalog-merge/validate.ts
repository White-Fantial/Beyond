/**
 * services/catalog-merge/validate.ts
 *
 * Validation rules for a CatalogMergeDraft before it can advance to
 * VALIDATED status and have a sync plan generated.
 */

import type {
  CatalogMergeDraftDto,
  MergeValidationError,
  MergeValidationResult,
} from "@/types/catalog-merge";

// ─── Individual rule helpers ──────────────────────────────────────────────────

function validateApplyTarget(
  draft: CatalogMergeDraftDto,
  errors: MergeValidationError[]
): void {
  const valid: string[] = ["INTERNAL_ONLY", "EXTERNAL_ONLY", "INTERNAL_THEN_EXTERNAL"];
  if (!valid.includes(draft.applyTarget)) {
    errors.push({ fieldPath: "applyTarget", message: `Invalid applyTarget: ${draft.applyTarget}` });
  }
}

function validateFieldChoices(
  draft: CatalogMergeDraftDto,
  errors: MergeValidationError[]
): void {
  for (const field of draft.fieldChoices ?? []) {
    const { fieldPath, choice, customValue, internalValue, externalValue } = field;

    // CUSTOM_VALUE must have a non-null customValue
    if (choice === "CUSTOM_VALUE" && (customValue === null || customValue === undefined)) {
      errors.push({ fieldPath, message: "CUSTOM_VALUE choice requires a non-null customValue" });
    }

    // name must be non-empty string, 1–255 chars
    if (fieldPath === "name") {
      const resolved = choice === "TAKE_INTERNAL" ? internalValue
        : choice === "TAKE_EXTERNAL" ? externalValue
        : customValue;
      if (typeof resolved !== "string" || resolved.trim().length === 0 || resolved.length > 255) {
        errors.push({ fieldPath, message: "name must be a non-empty string with at most 255 characters" });
      }
    }

    // priceAmount must be numeric >= 0
    if (fieldPath === "priceAmount") {
      const resolved = choice === "TAKE_INTERNAL" ? internalValue
        : choice === "TAKE_EXTERNAL" ? externalValue
        : customValue;
      if (typeof resolved !== "number" || resolved < 0) {
        errors.push({ fieldPath, message: "priceAmount must be a non-negative number" });
      }
    }

    // Boolean fields
    if (["isActive", "isSoldOut", "isRequired", "isDefault"].includes(fieldPath)) {
      const resolved = choice === "TAKE_INTERNAL" ? internalValue
        : choice === "TAKE_EXTERNAL" ? externalValue
        : customValue;
      if (typeof resolved !== "boolean") {
        errors.push({ fieldPath, message: `${fieldPath} must be a boolean` });
      }
    }
  }

  // Cross-field: minSelect <= maxSelect
  const minField = draft.fieldChoices?.find((f) => f.fieldPath === "minSelect");
  const maxField = draft.fieldChoices?.find((f) => f.fieldPath === "maxSelect");
  if (minField && maxField) {
    const minResolved = minField.choice === "TAKE_INTERNAL" ? minField.internalValue
      : minField.choice === "TAKE_EXTERNAL" ? minField.externalValue
      : minField.customValue;
    const maxResolved = maxField.choice === "TAKE_INTERNAL" ? maxField.internalValue
      : maxField.choice === "TAKE_EXTERNAL" ? maxField.externalValue
      : maxField.customValue;
    if (
      typeof minResolved === "number" &&
      typeof maxResolved === "number" &&
      minResolved > maxResolved
    ) {
      errors.push({ fieldPath: "minSelect", message: "minSelect must be <= maxSelect" });
    }
  }
}

function validateStructureChoices(
  draft: CatalogMergeDraftDto,
  errors: MergeValidationError[]
): void {
  const validChoices = new Set([
    "KEEP_INTERNAL_SET",
    "TAKE_EXTERNAL_SET",
    "MERGE_SELECTED",
    "CUSTOM_STRUCTURE",
  ]);

  for (const structure of draft.structureChoices ?? []) {
    if (!validChoices.has(structure.choice)) {
      errors.push({
        fieldPath: structure.fieldPath,
        message: `Invalid structure choice: ${structure.choice}`,
      });
    }

    // MERGE_SELECTED and CUSTOM_STRUCTURE require a customValue
    if (
      (structure.choice === "MERGE_SELECTED" || structure.choice === "CUSTOM_STRUCTURE") &&
      (structure.customValue === null || structure.customValue === undefined)
    ) {
      errors.push({
        fieldPath: structure.fieldPath,
        message: `${structure.choice} requires a non-null customValue`,
      });
    }
  }
}

// ─── Main validation function ─────────────────────────────────────────────────

export function validateMergeDraftData(draft: CatalogMergeDraftDto): MergeValidationResult {
  const errors: MergeValidationError[] = [];

  validateApplyTarget(draft, errors);
  validateFieldChoices(draft, errors);
  validateStructureChoices(draft, errors);

  return { valid: errors.length === 0, errors };
}
