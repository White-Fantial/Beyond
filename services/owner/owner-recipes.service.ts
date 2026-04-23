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
 *
 * Product components (RecipeProductComponent) allow a TenantCatalogProduct to be
 * used as a sub-component in another product's recipe (e.g. "Bulgogi" used as
 * filling in "Bulgogi Sandwich").  Their cost is derived from the sub-product's
 * own recipe costPerUnit.  Circular references (A → B → A) are detected and
 * rejected with a clear error.
 */
import { prisma } from "@/lib/prisma";
import { resolveEffectiveCostsBulk } from "./owner-supplier-prices.service";
import type {
  Recipe,
  RecipeDetail,
  RecipeIngredient,
  RecipeProductComponent,
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

type RawRecipeProductComponent = {
  id: string;
  recipeId: string;
  tenantProductId: string;
  quantity: { toNumber: () => number } | number;
  unit: string;
  tenantProduct: {
    id: string;
    name: string;
    tenantId: string;
    recipes: Array<{
      tenantCatalogProductId: string | null;
      yieldQty: number;
      yieldUnit: string;
      ingredients: RawRecipeIngredient[];
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

/**
 * Map a raw product component row to RecipeProductComponent.
 * costPerUnit comes from the sub-product's own recipe (pre-computed).
 */
function toRecipeProductComponent(
  row: RawRecipeProductComponent,
  costPerUnitMap: Map<string, number>
): RecipeProductComponent {
  const qty =
    typeof row.quantity === "object" ? row.quantity.toNumber() : row.quantity;
  const costPerUnit = costPerUnitMap.get(row.tenantProductId) ?? 0;
  const lineCost = Math.round(qty * costPerUnit);

  return {
    id: row.id,
    recipeId: row.recipeId,
    tenantProductId: row.tenantProductId,
    tenantProductName: row.tenantProduct.name,
    tenantProductCostPerUnit: costPerUnit,
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

/** Include shape for product components — brings in enough data to resolve cost. */
const productComponentInclude = {
  tenantProduct: {
    select: {
      id: true,
      name: true,
      tenantId: true,
      recipes: {
        where: { deletedAt: null },
        select: {
          tenantCatalogProductId: true,
          yieldQty: true,
          yieldUnit: true,
          ingredients: {
            include: ingredientInclude,
          },
        },
        orderBy: { createdAt: "asc" as const },
        take: 1,
      },
    },
  },
} as const;

/**
 * Resolve costs for all ingredients in a set of raw recipe ingredient rows.
 */
async function resolveCosts(
  tenantId: string | null,
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

/**
 * For each product component, compute the sub-product's costPerUnit by resolving
 * its own recipe's ingredient costs.
 * Returns a map: tenantProductId → costPerUnit (minor units / yield unit).
 */
async function resolveProductComponentCosts(
  tenantId: string | null,
  components: RawRecipeProductComponent[]
): Promise<Map<string, number>> {
  const result = new Map<string, number>();
  if (components.length === 0) return result;

  // Gather all ingredient rows from all sub-product recipes in one bulk call
  const allIngredients: RawRecipeIngredient[] = [];
  for (const comp of components) {
    for (const recipe of comp.tenantProduct.recipes ?? []) {
      allIngredients.push(...(recipe.ingredients as RawRecipeIngredient[]));
    }
  }

  const ingredientCostMap = await resolveCosts(tenantId, allIngredients);

  for (const comp of components) {
    const recipes = comp.tenantProduct.recipes ?? [];
    if (recipes.length === 0) {
      result.set(comp.tenantProductId, 0);
      continue;
    }
    const recipe = recipes[0];
    const rawIngs = recipe.ingredients as RawRecipeIngredient[];
    const totalCost = rawIngs.reduce((sum, ri) => {
      const mapped = toRecipeIngredientWithCost(ri, ingredientCostMap);
      return sum + mapped.lineCost;
    }, 0);
    const subProductCostPerUnit =
      recipe.yieldQty > 0 ? Math.round(totalCost / recipe.yieldQty) : 0;
    result.set(comp.tenantProductId, subProductCostPerUnit);
  }

  return result;
}

function computeCosts(
  recipe: Recipe,
  ingredients: RecipeIngredient[],
  productComponents: RecipeProductComponent[]
): RecipeDetail {
  const totalCost =
    ingredients.reduce((sum, i) => sum + i.lineCost, 0) +
    productComponents.reduce((sum, c) => sum + c.lineCost, 0);
  const costPerUnit =
    recipe.yieldQty > 0 ? Math.round(totalCost / recipe.yieldQty) : 0;

  let marginAmount: number | null = null;
  let marginPercent: number | null = null;
  if (recipe.catalogProductPrice !== null && recipe.catalogProductPrice > 0) {
    marginAmount = recipe.catalogProductPrice - costPerUnit;
    marginPercent =
      Math.round((marginAmount / recipe.catalogProductPrice) * 10000) / 100;
  }

  return { ...recipe, ingredients, productComponents, totalCost, costPerUnit, marginAmount, marginPercent };
}

// ─── Circular-reference detection ────────────────────────────────────────────

/**
 * Detect if adding `newComponentProductIds` to the recipe for `ownerProductId`
 * would create a circular dependency.
 *
 * DFS through each new component's product recipe tree.
 * If `ownerProductId` appears anywhere in the tree, it is circular.
 *
 * @param ownerProductId  The tenantProductId that owns the recipe being saved.
 * @param newComponentProductIds  The tenantProductIds being added as components.
 * @param maxDepth  Guard against extremely deep nesting (default 10).
 */
async function detectCircularComponents(
  ownerProductId: string,
  newComponentProductIds: string[],
  maxDepth = 10
): Promise<void> {
  const visited = new Set<string>();

  async function dfs(productId: string, depth: number): Promise<void> {
    if (depth > maxDepth) {
      throw new Error(
        `Product component nesting exceeds the maximum depth of ${maxDepth} levels`
      );
    }
    if (productId === ownerProductId) {
      throw new Error(
        "Circular reference detected: a product cannot be a component of itself (directly or indirectly)"
      );
    }
    if (visited.has(productId)) return;
    visited.add(productId);

    const recipes = await prisma.recipe.findMany({
      where: { tenantCatalogProductId: productId, deletedAt: null },
      select: {
        productComponents: {
          select: { tenantProductId: true },
        },
      },
    });

    for (const recipe of recipes) {
      for (const comp of recipe.productComponents) {
        await dfs(comp.tenantProductId, depth + 1);
      }
    }
  }

  for (const componentId of newComponentProductIds) {
    await dfs(componentId, 0);
  }
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listRecipes(
  tenantId: string,
  filters: RecipeFilters = {}
): Promise<RecipeListResult> {
  const { page = 1, pageSize = 20 } = filters;

  const where = {
    tenantId,
    deletedAt: null,
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
  tenantId: string | null,
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
      productComponents: {
        include: productComponentInclude,
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) throw new Error(`Recipe ${recipeId} not found`);

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];

  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, rawIngredients),
    resolveProductComponentCosts(tenantId, rawComponents),
  ]);

  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  const productComponents = rawComponents.map((c) =>
    toRecipeProductComponent(c, componentCostMap)
  );
  return computeCosts(recipe, ingredients, productComponents);
}

export async function createRecipe(
  tenantId: string,
  input: CreateRecipeInput
): Promise<RecipeDetail> {
  // Circular-reference check (only relevant when the recipe is for a specific product)
  if (input.tenantCatalogProductId && input.productComponents?.length) {
    await detectCircularComponents(
      input.tenantCatalogProductId,
      input.productComponents.map((c) => c.tenantProductId)
    );
  }

  const row = await prisma.recipe.create({
    data: {
      tenantId,
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
      productComponents: input.productComponents?.length
        ? {
            create: input.productComponents.map((c) => ({
              tenantProductId: c.tenantProductId,
              quantity: c.quantity,
              unit: c.unit,
            })),
          }
        : undefined,
    },
    include: {
      catalogProduct: { select: { name: true, basePriceAmount: true } },
      ingredients: {
        include: ingredientInclude,
      },
      productComponents: {
        include: productComponentInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];

  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, rawIngredients),
    resolveProductComponentCosts(tenantId, rawComponents),
  ]);

  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  const productComponents = rawComponents.map((c) =>
    toRecipeProductComponent(c, componentCostMap)
  );
  return computeCosts(recipe, ingredients, productComponents);
}

export async function updateRecipe(
  tenantId: string | null,
  recipeId: string,
  input: UpdateRecipeInput
): Promise<RecipeDetail> {
  const existing = await prisma.recipe.findFirst({
    where: { id: recipeId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Recipe ${recipeId} not found`);

  // Circular-reference check when updating product components
  if (existing.tenantCatalogProductId && input.productComponents?.length) {
    await detectCircularComponents(
      existing.tenantCatalogProductId,
      input.productComponents.map((c) => c.tenantProductId)
    );
  }

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
      ...(input.productComponents !== undefined
        ? {
            productComponents: {
              deleteMany: {},
              create: input.productComponents.map((c) => ({
                tenantProductId: c.tenantProductId,
                quantity: c.quantity,
                unit: c.unit,
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
      productComponents: {
        include: productComponentInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];

  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, rawIngredients),
    resolveProductComponentCosts(tenantId, rawComponents),
  ]);

  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  const productComponents = rawComponents.map((c) =>
    toRecipeProductComponent(c, componentCostMap)
  );
  return computeCosts(recipe, ingredients, productComponents);
}

export async function deleteRecipe(
  tenantId: string | null,
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
      productComponents: {
        include: productComponentInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];
  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, rawIngredients),
    resolveProductComponentCosts(tenantId, rawComponents),
  ]);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  const productComponents = rawComponents.map((c) =>
    toRecipeProductComponent(c, componentCostMap)
  );
  return computeCosts(recipe, ingredients, productComponents);
}

/**
 * Copy a platform-level Recipe (tenantId=null) into the owner's store.
 * Platform recipes are free admin-curated templates visible in the marketplace search.
 */
export async function copyPlatformRecipeToOwner(
  tenantId: string,
  platformRecipeId: string,
  input: CopyMarketplaceRecipeInput
): Promise<RecipeDetail> {
  const source = await prisma.recipe.findFirst({
    where: { id: platformRecipeId, tenantId: null, storeId: null, deletedAt: null },
    include: {
      ingredients: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!source) throw new Error(`Platform recipe ${platformRecipeId} not found`);

  type RawPlatformIngredient = {
    ingredientId: string;
    quantity: { toNumber: () => number } | number;
    unit: string;
  };
  const ingredientsToCreate = (source.ingredients as RawPlatformIngredient[]).map(
    (i) => ({
      ingredientId: i.ingredientId,
      quantity: typeof i.quantity === "object" ? i.quantity.toNumber() : i.quantity,
      unit: i.unit as IngredientUnit,
    })
  );

  const row = await prisma.recipe.create({
    data: {
      tenantId,
      name: input.name?.trim() || source.name,
      yieldQty: source.yieldQty,
      yieldUnit: source.yieldUnit as RecipeYieldUnit,
      notes: source.notes ?? null,
      instructions: source.instructions ?? null,
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
      productComponents: {
        include: productComponentInclude,
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const rawIngredients = row.ingredients as RawRecipeIngredient[];
  const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];
  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, rawIngredients),
    resolveProductComponentCosts(tenantId, rawComponents),
  ]);
  const ingredients = rawIngredients.map((ri) =>
    toRecipeIngredientWithCost(ri, costMap)
  );
  const productComponents = rawComponents.map((c) =>
    toRecipeProductComponent(c, componentCostMap)
  );
  return computeCosts(recipe, ingredients, productComponents);
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
      productComponents: {
        include: productComponentInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  if (rows.length === 0) return [];

  const effectiveTenantId = tenantId ?? rows[0].tenantId;
  if (!effectiveTenantId) {
    throw new Error(`Cannot resolve costs: recipes in store ${storeId} have no tenantId`);
  }

  const allRawIngredients = rows.flatMap(
    (row) => row.ingredients as RawRecipeIngredient[]
  );
  const allRawComponents = rows.flatMap(
    (row) => row.productComponents as unknown as RawRecipeProductComponent[]
  );

  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(effectiveTenantId, allRawIngredients),
    resolveProductComponentCosts(effectiveTenantId, allRawComponents),
  ]);

  return rows.map((row) => {
    const recipe = toRecipe(row as RawRecipe);
    const rawIngredients = row.ingredients as RawRecipeIngredient[];
    const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];
    const ingredients = rawIngredients.map((ri) =>
      toRecipeIngredientWithCost(ri, costMap)
    );
    const productComponents = rawComponents.map((c) =>
      toRecipeProductComponent(c, componentCostMap)
    );
    return computeCosts(recipe, ingredients, productComponents);
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
      productComponents: {
        include: productComponentInclude,
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ name: "asc" }],
  });

  if (rows.length === 0) return [];

  const allRawIngredients = rows.flatMap(
    (row) => row.ingredients as RawRecipeIngredient[]
  );
  const allRawComponents = rows.flatMap(
    (row) => row.productComponents as unknown as RawRecipeProductComponent[]
  );

  const [costMap, componentCostMap] = await Promise.all([
    resolveCosts(tenantId, allRawIngredients),
    resolveProductComponentCosts(tenantId, allRawComponents),
  ]);

  return rows.map((row) => {
    const recipe = toRecipe(row as RawRecipe);
    const rawIngredients = row.ingredients as RawRecipeIngredient[];
    const rawComponents = row.productComponents as unknown as RawRecipeProductComponent[];
    const ingredients = rawIngredients.map((ri) =>
      toRecipeIngredientWithCost(ri, costMap)
    );
    const productComponents = rawComponents.map((c) =>
      toRecipeProductComponent(c, componentCostMap)
    );
    return computeCosts(recipe, ingredients, productComponents);
  });
}
