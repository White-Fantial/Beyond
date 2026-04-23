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

/** A TenantCatalogProduct used as a sub-component in a recipe. */
export interface RecipeProductComponent {
  id: string;
  recipeId: string;
  tenantProductId: string;
  tenantProductName: string;
  /** Cost per unit of the sub-product, resolved from its own recipe (millicents per yield unit). 0 if unresolved. */
  tenantProductCostPerUnit: number;
  quantity: number;
  unit: IngredientUnit;
  lineCost: number; // computed: quantity × tenantProductCostPerUnit (minor units)
}

export interface Recipe {
  id: string;
  tenantId: string | null;
  catalogProductId: string | null;
  catalogProductName: string | null;
  catalogProductPrice: number | null; // basePriceAmount (minor units)
  tenantCatalogProductId: string | null;
  categoryId: string | null;
  categoryName: string | null;
  name: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  notes: string | null;
  instructions: string | null;
  marketplaceSourceId: string | null; // links to the original MarketplaceRecipe if copied
  platformSourceId: string | null;    // links to the original platform Recipe if copied
  createdAt: string;
  updatedAt: string;
}

export interface RecipeDetail extends Recipe {
  ingredients: RecipeIngredient[];
  productComponents: RecipeProductComponent[];
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

export interface RecipeProductComponentInput {
  tenantProductId: string;
  quantity: number;
  unit: IngredientUnit;
}

export interface CreateRecipeInput {
  catalogProductId?: string;
  tenantCatalogProductId?: string;
  categoryId?: string | null;
  name: string;
  yieldQty: number;
  yieldUnit: RecipeYieldUnit;
  notes?: string;
  instructions?: string;
  ingredients: RecipeIngredientInput[];
  productComponents?: RecipeProductComponentInput[];
}

export interface UpdateRecipeInput {
  catalogProductId?: string | null;
  categoryId?: string | null;
  name?: string;
  yieldQty?: number;
  yieldUnit?: RecipeYieldUnit;
  notes?: string;
  instructions?: string;
  ingredients?: RecipeIngredientInput[];
  productComponents?: RecipeProductComponentInput[];
}

export interface RecipeFilters {
  page?: number;
  pageSize?: number;
}

export interface CopyMarketplaceRecipeInput {
  /** Optional override for the recipe name; defaults to the marketplace recipe's title. */
  name?: string;
  /** If provided, the copied recipe is immediately linked to this catalog product. */
  catalogProductId?: string;
  /** If provided, the copied recipe is immediately linked to this tenant catalog product. */
  tenantCatalogProductId?: string;
}
