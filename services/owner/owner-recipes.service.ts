/**
 * Owner Recipes Service — Cost Management Phase 2 (revised).
 *
 * Manage product recipes and calculate ingredient costs. All functions scoped to tenantId.
 *
 * Cost resolution for each recipe ingredient (4-step priority):
 *   1. Owner's active contract price (SupplierContractPrice, effectiveTo IS NULL)
 *   2. Owner's latest price record (SupplierPriceRecord, most recent)
 *   3. Platform-wide referencePrice on SupplierProduct (maintained by scraper)
 *   4. 0 — unresolved (displayed as "unknown cost" in the UI)
 */
import { prisma } from "@/lib/prisma";
import { resolveEffectiveCostsBulk } from "./owner-supplier-prices.service";
import type {
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeListResult,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeFilters,
  RecipeYieldUnit,
  CopyMarketplaceRecipeInput,
} from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawRecipe = {
  id: string;
  tenantId: string | null;
  storeId: string | null;
  catalogProductId: string | null;
  tenantCatalogProductId: string | null;
  categoryId: string | null;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  notes: string | null;
  instructions: string | null;
  marketplaceSourceId: string | null;
  createdAt: Date;
  updatedAt: Date;
  catalogProduct?: {
    name: string;
    basePriceAmount: number;
  } | null;
  category?: {
    name: string;
  } | null;
};

function toRecipe(row: RawRecipe): Recipe {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    catalogProductId: row.catalogProductId,
    catalogProductName: row.catalogProduct?.name ?? null,
    catalogProductPrice: row.catalogProduct?.basePriceAmount ?? null,
    tenantCatalogProductId: row.tenantCatalogProductId ?? null,
    categoryId: row.categoryId ?? null,
    categoryName: row.category?.name ?? null,
    name: row.name,
    yieldQty: row.yieldQty,
    yieldUnit: row.yieldUnit as RecipeYieldUnit,
    notes: row.notes,
    instructions: row.instructions ?? null,
    marketplaceSourceId: row.marketplaceSourceId ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

type RawRecipeIngredient = {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: { toNumber: () => number } | number;
  unit: string;
  ingredient: {
    name: string;
    unit: string;
    supplierLinks?: Array<{
      isPreferred: boolean;
      supplierProduct: {
        id: string;
        referencePrice: number;
      };
    }>;
  };
};

/**
 * Build a RecipeIngredient using pre-resolved cost data.
 * costMap: supplierProductId → effectiveCost (millicents per recipe unit).
 * Uses preferred link first; falls back to cheapest by referencePrice.
 */
function toRecipeIngredientWithCost(
  row: RawRecipeIngredient,
  costMap: Map<string, { price: number; resolved: boolean }>
): RecipeIngredient {
  const qty =
    typeof row.quantity === "object" ? row.quantity.toNumber() : row.quantity;

  const links = row.ingredient.supplierLinks ?? [];
  const preferredLink = links.find((l) => l.isPreferred);

  // Cheapest fallback: pick the link whose resolved cost is lowest (or referencePrice if unresolved)
  let effectiveCost = 0;
  if (preferredLink) {
    effectiveCost = costMap.get(preferredLink.supplierProduct.id)?.price ?? 0;
  } else if (links.length > 0) {
    let cheapestPrice = Infinity;
    for (const link of links) {
      const resolved = costMap.get(link.supplierProduct.id);
      const price = resolved?.price ?? link.supplierProduct.referencePrice;
      if (price > 0 && price < cheapestPrice) {
        cheapestPrice = price;
      }
    }
    effectiveCost = cheapestPrice === Infinity ? 0 : cheapestPrice;
  }

  const lineCost = Math.round((qty * effectiveCost) / 1000);

  return {
    id: row.id,
    recipeId: row.recipeId,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    ingredientUnit: row.ingredient.unit as IngredientUnit,
    ingredientUnitCost: effectiveCost,
    quantity: qty,
    unit: row.unit as IngredientUnit,
    lineCost,
  };
}

const ingredientInclude = {
  ingredient: {
    select: {
      name: true,
      unit: true,
      // Fetch ALL links (not just preferred) so we can compute cheapest fallback
      supplierLinks: {
        select: {
          isPreferred: true,
          supplierProduct: {
            select: { id: true, referencePrice: true },
          },
        },
      },
    },
  },
} as const;

/**
 * Resolve costs for all ingredients in a set of raw recipe ingredient rows.
 */
async function resolveCosts(
  tenantId: string,
  ingredients: RawRecipeIngredient[]
): Promise<Map<string, { price: number; resolved: boolean }>> {
  // Collect ALL supplier product IDs (not just preferred) so cheapest fallback works
  const productIds: string[] = [];
  for (const ri of ingredients) {
    for (const link of ri.ingredient.supplierLinks ?? []) {
      productIds.push(link.supplierProduct.id);
    }
  }
  return resolveEffectiveCostsBulk(tenantId, [...new Set(productIds)]);
}

function computeCosts(
  recipe: Recipe,
  ingredients: RecipeIngredient[]
): RecipeDetail {
  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  const costPerUnit =
    recipe.yieldQty > 0 ? Math.round(totalCost / recipe.yieldQty) : 0;

  let marginAmount: number | null = null;
  let marginPercent: number | null = null;
  if (recipe.catalogProductPrice !== null && recipe.catalogProductPrice > 0) {
    marginAmount = recipe.catalogProductPrice - costPerUnit;
    marginPercent =
      Math.round((marginAmount / recipe.catalogProductPrice) * 10000) / 100;
  }

  return { ...recipe, ingredients, totalCost, costPerUnit, marginAmount, marginPercent };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listRecipes(
  tenantId: string,
  filters: RecipeFilters = {}
): Promise<RecipeListResult> {
  const { storeId, page = 1, pageSize = 20 } = filters;

  const where = {
    tenantId,
    deletedAt: null,
    ...(storeId ? { storeId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.recipe.findMany({
      where,
      include: {
        catalogProduct: { select: { name: true, basePriceAmount: true } },
      },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.recipe.count({ where }),
  ]);

  return {
    items: rows.map((r) => toRecipe(r as RawRecipe)),
    total,
    page,
    pageSize,
  };
}

export async function getRecipe(
  tenantId: string,
  recipeId: string
): Promise<RecipeDetail> {
  const row = await prisma.recipe.findFirst({
    where: { id: recipeId, tenantId, deletedAt: null },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) throw new Error(`Recipe ${recipeId} not found`);

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const costMap = await resolveCosts(tenantId, rawIngredients);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  return computeCosts(recipe, ingredients);
}

export async function createRecipe(
  tenantId: string,
  input: CreateRecipeInput
): Promise<RecipeDetail> {
  if (!input.storeId) throw new Error("storeId is required");
  const row = await prisma.recipe.create({
    data: {
      tenantId,
      storeId: input.storeId,
      catalogProductId: input.catalogProductId ?? null,
      tenantCatalogProductId: input.tenantCatalogProductId ?? null,
      name: input.name,
      yieldQty: input.yieldQty,
      yieldUnit: input.yieldUnit,
      notes: input.notes ?? null,
      instructions: input.instructions ?? null,
      ingredients: {
        create: input.ingredients.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
        })),
      },
    },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const costMap = await resolveCosts(tenantId, rawIngredients);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  return computeCosts(recipe, ingredients);
}

export async function updateRecipe(
  tenantId: string,
  recipeId: string,
  input: UpdateRecipeInput
): Promise<RecipeDetail> {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Recipe ${recipeId} not found`);

  const row = await prisma.recipe.update({
    where: { id: recipeId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.catalogProductId !== undefined
        ? { catalogProductId: input.catalogProductId }
        : {}),
      ...(input.yieldQty !== undefined ? { yieldQty: input.yieldQty } : {}),
      ...(input.yieldUnit !== undefined ? { yieldUnit: input.yieldUnit } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
      ...(input.instructions !== undefined ? { instructions: input.instructions } : {}),
      ...(input.ingredients !== undefined
        ? {
            ingredients: {
              deleteMany: {},
              create: input.ingredients.map((i) => ({
                ingredientId: i.ingredientId,
                quantity: i.quantity,
                unit: i.unit,
              })),
            },
          }
        : {}),
    },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const costMap = await resolveCosts(tenantId, rawIngredients);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  return computeCosts(recipe, ingredients);
}

export async function deleteRecipe(
  tenantId: string,
  recipeId: string
): Promise<void> {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Recipe ${recipeId} not found`);

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Copy a marketplace recipe into an owner's recipe list.
 *
 * Access rules:
 *   - BASIC marketplace recipe: any authenticated tenant user may copy.
 *   - PREMIUM marketplace recipe: user must have a valid purchase record.
 */
export async function copyMarketplaceRecipeToOwner(
  tenantId: string,
  userId: string,
  marketplaceRecipeId: string,
  input: CopyMarketplaceRecipeInput
): Promise<RecipeDetail> {
  // 1. Fetch the marketplace recipe with its ingredients
  const source = await prisma.marketplaceRecipe.findFirst({
    where: { id: marketplaceRecipeId, deletedAt: null },
    include: {
      ingredients: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!source) throw new Error(`MarketplaceRecipe ${marketplaceRecipeId} not found`);

  // 2. Verify access
  if (source.type === "PREMIUM") {
    const purchase = await prisma.marketplaceRecipePurchase.findFirst({
      where: { recipeId: marketplaceRecipeId, buyerUserId: userId, refundedAt: null },
    });
    if (!purchase) {
      throw new Error("Recipe not purchased — purchase the recipe before copying it");
    }
  }

  // 3. Create the owner recipe
  type RawMarketplaceIngredient = {
    ingredientId: string;
    quantity: { toNumber: () => number } | number;
    unit: string;
  };
  const ingredientsToCreate = (source.ingredients as RawMarketplaceIngredient[]).map(
    (i) => ({
      ingredientId: i.ingredientId,
      quantity: typeof i.quantity === "object" ? i.quantity.toNumber() : i.quantity,
      unit: i.unit as IngredientUnit,
    })
  );

  const row = await prisma.recipe.create({
    data: {
      tenantId,
      storeId: input.storeId,
      name: input.name?.trim() || source.title,
      yieldQty: source.yieldQty,
      yieldUnit: source.yieldUnit as RecipeYieldUnit,
      notes: source.description ?? null,
      instructions: source.instructions ?? null,
      marketplaceSourceId: source.id,
      catalogProductId: input.catalogProductId ?? null,
      tenantCatalogProductId: input.tenantCatalogProductId ?? null,
      ingredients: {
        create: ingredientsToCreate,
      },
    },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const costMap = await resolveCosts(tenantId, rawIngredients);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  return computeCosts(recipe, ingredients);
}

/**
 * List all recipes linked to a specific CatalogProduct within a store.
 */
export async function getProductRecipes(
  storeId: string,
  catalogProductId: string,
  tenantId?: string
): Promise<RecipeDetail[]> {
  const rows = await prisma.recipe.findMany({
    where: { storeId, catalogProductId, deletedAt: null },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (rows.length === 0) return [];

  // Resolve costs in one bulk call instead of one per recipe (N+1 fix)
  const effectiveTenantId = tenantId ?? rows[0].tenantId;
  if (!effectiveTenantId) {
    throw new Error(`Cannot resolve costs: recipes in store ${storeId} have no tenantId`);
  }
  const allRawIngredients = rows.flatMap(
    (row) => row.ingredients as RawRecipeIngredient[]
  );
  const costMap = await resolveCosts(effectiveTenantId, allRawIngredients);

  return rows.map((row) => {
    const recipe = toRecipe(row as RawRecipe);
    const rawIngredients = row.ingredients as RawRecipeIngredient[];
    const ingredients = rawIngredients.map((ri) =>
      toRecipeIngredientWithCost(ri, costMap)
    );
    return computeCosts(recipe, ingredients);
  });
}

/**
 * List all recipes linked to a TenantCatalogProduct, across all stores.
 */
export async function getTenantProductRecipes(
  tenantId: string,
  tenantCatalogProductId: string
): Promise<RecipeDetail[]> {
  const rows = await prisma.recipe.findMany({
    where: { tenantId, tenantCatalogProductId, deletedAt: null },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ storeId: "asc" }, { name: "asc" }],
  });

  if (rows.length === 0) return [];

  // Resolve costs in one bulk call instead of one per recipe (N+1 fix)
  const allRawIngredients = rows.flatMap(
    (row) => row.ingredients as RawRecipeIngredient[]
  );
  const costMap = await resolveCosts(tenantId, allRawIngredients);

  return rows.map((row) => {
    const recipe = toRecipe(row as RawRecipe);
    const rawIngredients = row.ingredients as RawRecipeIngredient[];
    const ingredients = rawIngredients.map((ri) =>
      toRecipeIngredientWithCost(ri, costMap)
    );
    return computeCosts(recipe, ingredients);
  });
}
