/**
 * services/catalog-conflict/conflict-policy.ts
 *
 * Phase 6: Conflict Detection Policy — determines which fields are tracked for
 * conflict detection and which structural areas trigger conflict checks.
 *
 * This is a deterministic, rule-based baseline. Phase 7 will migrate this into
 * a configurable policy table to support per-tenant / per-channel overrides.
 *
 * TODO Phase 7:
 *   - Move policy into a DB-backed table (CatalogConflictPolicy) per connection
 *   - Support field ownership assignments (INTERNAL_WINS, EXTERNAL_WINS, MANUAL)
 *   - Support per-field auto-resolve strategies
 */

export type FieldPriority = "HIGH" | "LOW" | "SKIP";

/** Determines whether a field path participates in conflict detection. */
export interface FieldPolicy {
  /** Whether this field is tracked as a potential conflict field. */
  tracked: boolean;
  /**
   * Priority of this field.
   * HIGH → definite conflict candidate; LOW → low-priority (may skip in strict mode).
   */
  priority: FieldPriority;
}

/**
 * Per-entity field conflict policy.
 * Fields not listed default to { tracked: false, priority: "SKIP" }.
 */
const PRODUCT_FIELD_POLICY: Record<string, FieldPolicy> = {
  name:         { tracked: true,  priority: "HIGH" },
  description:  { tracked: true,  priority: "HIGH" },
  priceAmount:  { tracked: true,  priority: "HIGH" },
  isActive:     { tracked: true,  priority: "HIGH" },
  isSoldOut:    { tracked: true,  priority: "HIGH" },
  imageUrl:     { tracked: true,  priority: "LOW"  },
  displayOrder: { tracked: false, priority: "SKIP" }, // low signal, skip
};

const CATEGORY_FIELD_POLICY: Record<string, FieldPolicy> = {
  name:         { tracked: true,  priority: "HIGH" },
  isActive:     { tracked: true,  priority: "HIGH" },
  sortOrder:    { tracked: false, priority: "SKIP" },
  imageUrl:     { tracked: true,  priority: "LOW"  },
};

const MODIFIER_GROUP_FIELD_POLICY: Record<string, FieldPolicy> = {
  name:         { tracked: true,  priority: "HIGH" },
  isActive:     { tracked: true,  priority: "HIGH" },
  selectionMin: { tracked: true,  priority: "HIGH" },
  selectionMax: { tracked: true,  priority: "HIGH" },
  isRequired:   { tracked: true,  priority: "HIGH" },
  minSelect:    { tracked: true,  priority: "HIGH" },
  maxSelect:    { tracked: true,  priority: "HIGH" },
};

const MODIFIER_OPTION_FIELD_POLICY: Record<string, FieldPolicy> = {
  name:         { tracked: true,  priority: "HIGH" },
  priceAmount:  { tracked: true,  priority: "HIGH" },
  isActive:     { tracked: true,  priority: "HIGH" },
  isSoldOut:    { tracked: true,  priority: "HIGH" },
  isDefault:    { tracked: true,  priority: "LOW"  },
};

const ENTITY_POLICY_MAP = {
  PRODUCT:         PRODUCT_FIELD_POLICY,
  CATEGORY:        CATEGORY_FIELD_POLICY,
  MODIFIER_GROUP:  MODIFIER_GROUP_FIELD_POLICY,
  MODIFIER_OPTION: MODIFIER_OPTION_FIELD_POLICY,
} as const;

type EntityPolicyKey = keyof typeof ENTITY_POLICY_MAP;

/** Returns the policy for a field within a given entity type. */
export function getFieldPolicy(
  entityType: string,
  fieldPath: string
): FieldPolicy {
  const entityPolicy = ENTITY_POLICY_MAP[entityType as EntityPolicyKey];
  if (!entityPolicy) return { tracked: false, priority: "SKIP" };
  return entityPolicy[fieldPath] ?? { tracked: false, priority: "SKIP" };
}

/** Returns whether a field should be checked for conflict given the entity type. */
export function isFieldConflictTracked(entityType: string, fieldPath: string): boolean {
  return getFieldPolicy(entityType, fieldPath).tracked;
}

/**
 * Structure-level conflict policy.
 * Both categoryLinks and modifierGroupLinks are tracked as structure conflict candidates.
 */
export const STRUCTURE_CONFLICT_TRACKED_AREAS = [
  "categoryLinks",
  "modifierGroupLinks",
  "modifierOptionParent",
] as const;

export type StructureConflictArea = (typeof STRUCTURE_CONFLICT_TRACKED_AREAS)[number];

export function isStructureConflictTracked(area: string): boolean {
  return (STRUCTURE_CONFLICT_TRACKED_AREAS as readonly string[]).includes(area);
}
