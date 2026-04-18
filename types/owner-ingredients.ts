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

export interface Ingredient {
  id: string;
  tenantId: string;
  storeId: string;
  name: string;
  description: string | null;
  unit: IngredientUnit;
  unitCost: number; // minor currency units
  currency: string;
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
  storeId: string;
  name: string;
  description?: string;
  unit: IngredientUnit;
  unitCost: number;
  currency?: string;
  notes?: string;
}

export interface UpdateIngredientInput {
  name?: string;
  description?: string;
  unit?: IngredientUnit;
  unitCost?: number;
  currency?: string;
  notes?: string;
}

export interface IngredientFilters {
  storeId?: string;
  page?: number;
  pageSize?: number;
}
