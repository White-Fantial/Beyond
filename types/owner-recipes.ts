import type { IngredientUnit } from "./owner-ingredients";

export type RecipeYieldUnit =
  | "EACH"
  | "BATCH"
  | "SERVING"
  | "GRAM"
  | "KG"
  | "ML"
  | "LITER";

export const RECIPE_YIELD_UNIT_LABELS: Record<RecipeYieldUnit, string> = {
  EACH: "each",
  BATCH: "batch",
  SERVING: "serving",
  GRAM: "g",
  KG: "kg",
  ML: "ml",
  LITER: "L",
};

export interface RecipeIngredient {
  id: string;
  recipeId: string;
  ingredientId: string;
  ingredientName: string;
  ingredientUnit: IngredientUnit;
  ingredientUnitCost: number; // minor currency units per ingredient unit
  quantity: number; // stored as Decimal, serialised as number
  unit: IngredientUnit;
  lineCost: number; // computed: quantity × ingredientUnitCost (minor units)
}

export interface Recipe {
  id: string;
  tenantId: string;
  storeId: string;
  catalogProductId: string | null;
  catalogProductName: string | null;
  catalogProductPrice: number | null; // basePriceAmount (minor units)
  name: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  notes: string | null;
  marketplaceSourceId: string | null; // links to the original MarketplaceRecipe if copied
  createdAt: string;
  updatedAt: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredient[];
  totalCost: number;       // Σ lineCost (minor units)
  costPerUnit: number;     // totalCost / yieldQty (minor units)
  marginAmount: number | null;  // catalogProductPrice - costPerUnit (minor units)
  marginPercent: number | null; // marginAmount / catalogProductPrice × 100
}

export interface RecipeListResult {
  items: Recipe[];
  total: number;
  page: number;
  pageSize: number;
}

export interface RecipeIngredientInput {
  ingredientId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface CreateRecipeInput {
  storeId: string;
  catalogProductId?: string;
  name: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  notes?: string;
  ingredients: RecipeIngredientInput[];
}

export interface UpdateRecipeInput {
  catalogProductId?: string | null;
  name?: string;
  yieldQty?: number;
  yieldUnit?: RecipeYieldUnit;
  notes?: string;
  ingredients?: RecipeIngredientInput[];
}

export interface RecipeFilters {
  storeId?: string;
  page?: number;
  pageSize?: number;
}

export interface CopyMarketplaceRecipeInput {
  /** The store this copied recipe belongs to. */
  storeId: string;
  /** Optional override for the recipe name; defaults to the marketplace recipe's title. */
  name?: string;
  /** If provided, the copied recipe is immediately linked to this catalog product. */
  catalogProductId?: string;
}
