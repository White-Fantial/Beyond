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
  unit: IngredientUnit;
  unitCost: number; // minor currency units
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
  unit: IngredientUnit;
  unitCost: number;
  currency?: string;
  notes?: string;
}

export interface UpdateIngredientInput {
  name?: string;
  description?: string;
  category?: string;
  unit?: IngredientUnit;
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
