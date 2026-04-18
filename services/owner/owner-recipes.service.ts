/**
 * Owner Recipes Service — Cost Management Phase 2.
 *
 * Manage product recipes and calculate ingredient costs. All functions scoped to tenantId.
 */
import { prisma } from "@/lib/prisma";
import type {
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeListResult,
  CreateRecipeInput,
  UpdateRecipeInput,
  RecipeFilters,
  RecipeYieldUnit,
} from "@/types/owner-recipes";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawRecipe = {
  id: string;
  tenantId: string;
  storeId: string;
  catalogProductId: string | null;
  name: string;
  yieldQty: number;
  yieldUnit: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  catalogProduct?: {
    name: string;
    basePriceAmount: number;
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
    name: row.name,
    yieldQty: row.yieldQty,
    yieldUnit: row.yieldUnit as RecipeYieldUnit,
    notes: row.notes,
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
    unitCost: number;
  };
};

function toRecipeIngredient(row: RawRecipeIngredient): RecipeIngredient {
  const qty =
    typeof row.quantity === "object" ? row.quantity.toNumber() : row.quantity;
  const lineCost = Math.round(qty * row.ingredient.unitCost);
  return {
    id: row.id,
    recipeId: row.recipeId,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    ingredientUnit: row.ingredient.unit as IngredientUnit,
    ingredientUnitCost: row.ingredient.unitCost,
    quantity: qty,
    unit: row.unit as IngredientUnit,
    lineCost,
  };
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
        include: {
          ingredient: { select: { name: true, unit: true, unitCost: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) throw new Error(`Recipe ${recipeId} not found`);

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawRecipeIngredient[]).map(
    toRecipeIngredient
  );
  return computeCosts(recipe, ingredients);
}

export async function createRecipe(
  tenantId: string,
  input: CreateRecipeInput
): Promise<RecipeDetail> {
  const row = await prisma.recipe.create({
    data: {
      tenantId,
      storeId: input.storeId,
      catalogProductId: input.catalogProductId ?? null,
      name: input.name,
      yieldQty: input.yieldQty,
      yieldUnit: input.yieldUnit,
      notes: input.notes ?? null,
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
        include: {
          ingredient: { select: { name: true, unit: true, unitCost: true } },
        },
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawRecipeIngredient[]).map(
    toRecipeIngredient
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
        include: {
          ingredient: { select: { name: true, unit: true, unitCost: true } },
        },
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawRecipeIngredient[]).map(
    toRecipeIngredient
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
 * Get a recipe with cost calculation personalised for a specific user.
 *
 * Unit-cost priority per ingredient:
 *   1. User's own observed price (from SupplierPriceObservation) — most accurate
 *   2. Global base price (max across all users) — conservative safe default
 *   3. Ingredient's stored unitCost — legacy fallback
 */
export async function getRecipeForUser(
  tenantId: string,
  recipeId: string,
  userId: string
): Promise<RecipeDetail> {
  const row = await prisma.recipe.findFirst({
    where: { id: recipeId, tenantId, deletedAt: null },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: {
          ingredient: {
            select: {
              name: true,
              unit: true,
              unitCost: true,
              supplierLinks: {
                where: { isPreferred: true },
                take: 1,
                include: {
                  supplierProduct: {
                    select: {
                      id: true,
                      basePrice: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) throw new Error(`Recipe ${recipeId} not found`);

  // Collect supplier product IDs to fetch per-user observations in bulk
  const productIds: string[] = [];
  for (const ri of row.ingredients) {
    const ing = ri.ingredient as {
      supplierLinks: { supplierProduct: { id: string } }[];
    };
    if (ing.supplierLinks.length > 0) {
      productIds.push(ing.supplierLinks[0].supplierProduct.id);
    }
  }

  // Fetch user's observations for these products
  const observations = await prisma.supplierPriceObservation.findMany({
    where: { supplierProductId: { in: productIds }, userId },
    select: { supplierProductId: true, observedPrice: true },
  });
  const obsByProductId = new Map(observations.map((o) => [o.supplierProductId, o.observedPrice]));

  const recipe = toRecipe(row as RawRecipe);

  // Build personalised ingredients list
  const ingredients: RecipeIngredient[] = (
    row.ingredients as (RawRecipeIngredient & {
      ingredient: {
        supplierLinks: {
          supplierProduct: { id: string; basePrice: number };
        }[];
      };
    })[]
  ).map((ri) => {
    const qty = typeof ri.quantity === "object" ? ri.quantity.toNumber() : ri.quantity;

    // Determine effective unit cost using priority order
    let effectiveCost = ri.ingredient.unitCost; // fallback

    const preferredLink = ri.ingredient.supplierLinks?.[0];
    if (preferredLink) {
      const productId = preferredLink.supplierProduct.id;
      const basePrice = preferredLink.supplierProduct.basePrice;

      const userObserved = obsByProductId.get(productId);
      if (userObserved !== undefined) {
        effectiveCost = userObserved; // priority 1: user's own price (even if 0)
      } else if (basePrice > 0) {
        effectiveCost = basePrice; // priority 2: global base price
      }
    }

    const lineCost = Math.round(qty * effectiveCost);

    return {
      id: ri.id,
      recipeId: ri.recipeId,
      ingredientId: ri.ingredientId,
      ingredientName: ri.ingredient.name,
      ingredientUnit: ri.ingredient.unit as IngredientUnit,
      ingredientUnitCost: effectiveCost,
      quantity: qty,
      unit: ri.unit as IngredientUnit,
      lineCost,
    };
  });

  return computeCosts(recipe, ingredients);
}
