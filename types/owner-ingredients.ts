export type IngredientUnit =
  | "GRAM"
  | "KG"
  | "ML"
  | "LITER"
  | "EACH"
  | "TSP"
  | "TBSP"
  | "OZ"
  | "LB"
  | "CUP"
  | "PIECE";

export const INGREDIENT_UNIT_LABELS: Record<IngredientUnit, string> = {
  GRAM: "g",
  KG: "kg",
  ML: "ml",
  LITER: "L",
  EACH: "ea",
  TSP: "tsp",
  TBSP: "tbsp",
  OZ: "oz",
  LB: "lb",
  CUP: "cup",
  PIECE: "pcs",
};

/**
 * Returns how many `to` units are contained in 1 `from` unit.
 * Returns `undefined` when the units are incompatible (e.g. KG → ML).
 * Returns `1` when `from === to`.
 */
export function getUnitConversionFactor(
  from: IngredientUnit,
  to: IngredientUnit
): number | undefined {
  if (from === to) return 1;

  const table: Partial<Record<IngredientUnit, Partial<Record<IngredientUnit, number>>>> = {
    KG:    { GRAM: 1000,     OZ: 35.274,   LB: 2.20462 },
    GRAM:  { KG: 0.001,      OZ: 0.035274, LB: 0.00220462 },
    LITER: { ML: 1000,       CUP: 4.22675, TBSP: 67.628, TSP: 202.884 },
    ML:    { LITER: 0.001,   CUP: 0.00422675, TBSP: 0.067628, TSP: 0.202884 },
    OZ:    { GRAM: 28.3495,  KG: 0.0283495, LB: 0.0625 },
    LB:    { GRAM: 453.592,  KG: 0.453592,  OZ: 16 },
    TBSP:  { ML: 14.7868,    TSP: 3,        LITER: 0.0147868, CUP: 0.0625 },
    TSP:   { ML: 4.92892,    TBSP: 0.33333, LITER: 0.00492892 },
    CUP:   { ML: 236.588,    TBSP: 16,      TSP: 48,    LITER: 0.236588 },
    EACH:  { PIECE: 1 },
    PIECE: { EACH: 1 },
  };

  return table[from]?.[to];
}

/** Scope distinguishes platform-global ingredients from store-specific ones. */
export type IngredientScope = "PLATFORM" | "STORE";

export interface Ingredient {
  id: string;
  scope: IngredientScope;
  /** null for PLATFORM scope */
  tenantId: string | null;
  /** null for PLATFORM scope */
  storeId: string | null;
  name: string;
  description: string | null;
  /** Category classification, primarily used for PLATFORM scope */
  category: string | null;
  /** Unit used when purchasing, e.g. KG */
  purchaseUnit: IngredientUnit;
  /** Number of purchaseUnits in the recorded purchase, e.g. 20 for a 20 kg bag */
  purchaseQty: number;
  /** Unit used when adding to recipes, e.g. GRAM */
  unit: IngredientUnit;
  /** Cost per recipe unit (unit) in minor currency units */
  unitCost: number;
  currency: string;
  /** Inactive ingredients are hidden from selection UIs */
  isActive: boolean;
  /** Set for PLATFORM scope — the admin/moderator who created it */
  createdByUserId: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngredientListResult {
  items: Ingredient[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateIngredientInput {
  /** Required for STORE scope; omit for PLATFORM scope */
  storeId?: string;
  name: string;
  description?: string;
  category?: string;
  /** Unit used when purchasing */
  purchaseUnit: IngredientUnit;
  /** Number of purchaseUnits in the recorded purchase, e.g. 20 for a 20 kg bag */
  purchaseQty?: number;
  /** Unit used in recipes */
  unit: IngredientUnit;
  /** Cost per recipe unit in minor currency units */
  unitCost: number;
  currency?: string;
  notes?: string;
}

export interface UpdateIngredientInput {
  name?: string;
  description?: string;
  category?: string;
  /** Unit used when purchasing */
  purchaseUnit?: IngredientUnit;
  /** Number of purchaseUnits in the recorded purchase, e.g. 20 for a 20 kg bag */
  purchaseQty?: number;
  /** Unit used in recipes */
  unit?: IngredientUnit;
  /** Cost per recipe unit in minor currency units */
  unitCost?: number;
  currency?: string;
  isActive?: boolean;
  notes?: string;
}

export interface IngredientFilters {
  scope?: IngredientScope;
  storeId?: string;
  category?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}
