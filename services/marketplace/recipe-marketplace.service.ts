/**
 * Recipe Marketplace Service — core CRUD + cost calculation.
 *
 * Handles listing, creating, updating, and deleting marketplace recipes.
 * Also recomputes estimatedCostPrice whenever ingredients change.
 */
import { prisma } from "@/lib/prisma";
import type {
  MarketplaceRecipe,
  MarketplaceRecipeDetail,
  MarketplaceRecipeListResult,
  MarketplaceRecipeIngredientItem,
  CreateMarketplaceRecipeInput,
  UpdateMarketplaceRecipeInput,
  MarketplaceRecipeFilters,
  MarketplaceRecipeType,
  MarketplaceRecipeStatus,
  RecipeDifficulty,
} from "@/types/marketplace";
import type { IngredientUnit } from "@/types/owner-ingredients";
import type { RecipeYieldUnit } from "@/types/owner-recipes";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawRecipe = {
  id: string;
  type: string;
  status: string;
  title: string;
  description: string | null;
  thumbnailUrl: string | null;
  providerId: string | null;
  createdByUserId: string;
  yieldQty: number;
  yieldUnit: string;
  servings: number | null;
  cuisineTag: string | null;
  difficulty: string | null;
  prepTimeMinutes: number | null;
  cookTimeMinutes: number | null;
  instructions: string | null;
  currency: string;
  estimatedCostPrice: number;
  recommendedPrice: number;
  salePrice: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  provider?: { name: string } | null;
};
type RawIngredient = {
  id: string;
  recipeId: string;
  ingredientId: string;
  quantity: { toNumber: () => number } | number;
  unit: string;
  notes: string | null;
  unitCostSnapshot: number;
  ingredient: { name: string };
};

function toRecipe(row: RawRecipe): MarketplaceRecipe {
  return {
    id: row.id,
    type: row.type as MarketplaceRecipeType,
    status: row.status as MarketplaceRecipeStatus,
    title: row.title,
    description: row.description,
    thumbnailUrl: row.thumbnailUrl,
    providerId: row.providerId,
    providerName: row.provider?.name ?? null,
    createdByUserId: row.createdByUserId,
    yieldQty: row.yieldQty,
    yieldUnit: row.yieldUnit as RecipeYieldUnit,
    servings: row.servings,
    cuisineTag: row.cuisineTag,
    difficulty: row.difficulty as RecipeDifficulty | null,
    prepTimeMinutes: row.prepTimeMinutes,
    cookTimeMinutes: row.cookTimeMinutes,
    currency: row.currency,
    estimatedCostPrice: row.estimatedCostPrice,
    recommendedPrice: row.recommendedPrice,
    salePrice: row.salePrice,
    instructions: row.instructions,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toIngredientItem(row: RawIngredient): MarketplaceRecipeIngredientItem {
  const qty =
    typeof row.quantity === "object" ? row.quantity.toNumber() : row.quantity;
  return {
    id: row.id,
    recipeId: row.recipeId,
    ingredientId: row.ingredientId,
    ingredientName: row.ingredient.name,
    quantity: qty,
    unit: row.unit as IngredientUnit,
    notes: row.notes,
    unitCostSnapshot: row.unitCostSnapshot,
    lineCost: Math.round(qty * row.unitCostSnapshot / 1000),
  };
}

/** Recompute estimatedCostPrice from ingredient line costs and persist it. */
async function recomputeCostPrice(
  recipeId: string,
  ingredientItems: MarketplaceRecipeIngredientItem[]
): Promise<void> {
  const totalCost = ingredientItems.reduce((sum, i) => sum + i.lineCost, 0);
  await prisma.marketplaceRecipe.update({
    where: { id: recipeId },
    data: { estimatedCostPrice: totalCost },
  });
}

/**
 * Fetch the referencePrice for a set of ingredient IDs from their supplier products.
 * Returns a Map<ingredientId, referencePrice>.
 */
async function fetchIngredientReferencePrices(
  ingredientIds: string[]
): Promise<Map<string, number>> {
  if (ingredientIds.length === 0) return new Map();

  const links = await prisma.ingredientSupplierLink.findMany({
    where: {
      ingredientId: { in: ingredientIds },
      isPreferred: true,
    },
    select: {
      ingredientId: true,
      supplierProduct: { select: { referencePrice: true } },
    },
  });

  const map = new Map<string, number>();
  for (const link of links) {
    if (!map.has(link.ingredientId)) {
      map.set(link.ingredientId, link.supplierProduct.referencePrice);
    }
  }
  return map;
}

const ingredientInclude = {
  ingredients: {
    include: { ingredient: { select: { name: true } } },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listMarketplaceRecipes(
  filters: MarketplaceRecipeFilters = {}
): Promise<MarketplaceRecipeListResult> {
  const {
    q,
    type,
    status,
    cuisineTag,
    difficulty,
    providerId,
    page = 1,
    pageSize = 20,
  } = filters;

  const where = {
    deletedAt: null,
    ...(type !== undefined ? { type } : {}),
    ...(status !== undefined ? { status } : {}),
    ...(cuisineTag !== undefined ? { cuisineTag } : {}),
    ...(difficulty !== undefined ? { difficulty } : {}),
    ...(providerId !== undefined ? { providerId } : {}),
    ...(q?.trim()
      ? {
          OR: [
            { title: { contains: q.trim(), mode: "insensitive" as const } },
            { description: { contains: q.trim(), mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  // Platform recipes (admin-created, tenantId=null) are included unless a
  // type or filter that doesn't apply to them is set (i.e. PREMIUM-only
  // request, or a cuisineTag / difficulty / providerId filter).
  // Platform recipes are only included on the first page to avoid duplicates
  // across paginated results (they are prepended before marketplace items).
  const includePlatform =
    page === 1 &&
    (type === undefined || type === "BASIC") &&
    cuisineTag === undefined &&
    difficulty === undefined &&
    providerId === undefined;

  const [rows, total] = await Promise.all([
    prisma.marketplaceRecipe.findMany({
      where,
      include: { provider: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.marketplaceRecipe.count({ where }),
  ]);

  const marketplaceItems = rows.map((r) => ({
    ...toRecipe(r as RawRecipe),
    sourceType: "MARKETPLACE" as const,
  }));

  if (!includePlatform) {
    return { items: marketplaceItems, total, page, pageSize };
  }

  // Also query platform-level Recipe records (tenantId=null) as free recipes.
  // Platform recipe IDs are stored as "platform:{uuid}" so they cannot collide
  // with MarketplaceRecipe IDs (which are plain UUIDs).
  const platformWhere = {
    tenantId: null,
    deletedAt: null,
    ...(q?.trim()
      ? { name: { contains: q.trim(), mode: "insensitive" as const } }
      : {}),
  };
  const platformRows = await prisma.recipe.findMany({
    where: platformWhere,
    orderBy: { createdAt: "desc" },
  });

  const platformItems: MarketplaceRecipe[] = platformRows.map((r) => ({
    // "platform:{uuid}" prefix guarantees no collision with plain-UUID marketplace IDs
    id: `platform:${r.id}`,
    type: "BASIC" as MarketplaceRecipeType,
    status: "PUBLISHED" as MarketplaceRecipeStatus,
    title: r.name,
    description: r.notes,
    thumbnailUrl: null,
    providerId: null,
    providerName: null,
    createdByUserId: null,
    yieldQty: r.yieldQty,
    yieldUnit: r.yieldUnit as RecipeYieldUnit,
    servings: null,
    cuisineTag: null,
    difficulty: null,
    prepTimeMinutes: null,
    cookTimeMinutes: null,
    currency: "USD",
    estimatedCostPrice: 0,
    recommendedPrice: 0,
    salePrice: 0,
    instructions: r.instructions ?? null,
    publishedAt: r.createdAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    sourceType: "PLATFORM" as const,
  }));

  // Platform recipes are prepended so they appear prominently.
  // Total reflects all available items across both sources.
  const allItems = [...platformItems, ...marketplaceItems];

  return {
    items: allItems,
    total: total + platformItems.length,
    page,
    pageSize,
  };
}

export async function getMarketplaceRecipe(
  id: string
): Promise<MarketplaceRecipeDetail> {
  const row = await prisma.marketplaceRecipe.findFirst({
    where: { id, deletedAt: null },
    include: {
      provider: { select: { name: true } },
      ...ingredientInclude,
    },
  });
  if (!row) throw new Error(`MarketplaceRecipe ${id} not found`);

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawIngredient[]).map(
    toIngredientItem
  );

  const liveTotal = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  if (liveTotal !== recipe.estimatedCostPrice) {
    await recomputeCostPrice(recipe.id, ingredients);
    recipe.estimatedCostPrice = liveTotal;
  }

  return {
    ...recipe,
    instructions: (row as RawRecipe).instructions ?? null,
    ingredients,
    ingredientCount: ingredients.length,
  };
}

export async function createMarketplaceRecipe(
  createdByUserId: string,
  providerId: string | null,
  input: CreateMarketplaceRecipeInput
): Promise<MarketplaceRecipeDetail> {
  // For BASIC recipes, status starts as PUBLISHED; PREMIUM starts as DRAFT
  const initialStatus: MarketplaceRecipeStatus =
    input.type === "BASIC" ? "PUBLISHED" : "DRAFT";

  // Snapshot ingredient costs at creation time using referencePrice
  const ingredientInputs = input.ingredients ?? [];
  const ingredientIds = ingredientInputs.map((i) => i.ingredientId);

  const [validIngredients, referencePriceMap] = await Promise.all([
    ingredientIds.length > 0
      ? prisma.ingredient.findMany({
          where: { id: { in: ingredientIds }, scope: "PLATFORM", deletedAt: null },
          select: { id: true },
        })
      : Promise.resolve([]),
    fetchIngredientReferencePrices(ingredientIds),
  ]);

  const validIds = new Set(validIngredients.map((pi) => pi.id));

  const row = await prisma.marketplaceRecipe.create({
    data: {
      type: input.type,
      status: initialStatus,
      title: input.title,
      description: input.description ?? null,
      thumbnailUrl: input.thumbnailUrl ?? null,
      providerId,
      createdByUserId,
      yieldQty: input.yieldQty,
      yieldUnit: input.yieldUnit,
      servings: input.servings ?? null,
      cuisineTag: input.cuisineTag ?? null,
      difficulty: input.difficulty ?? null,
      prepTimeMinutes: input.prepTimeMinutes ?? null,
      cookTimeMinutes: input.cookTimeMinutes ?? null,
      instructions: input.instructions ?? null,
      currency: input.currency ?? "USD",
      recommendedPrice: input.recommendedPrice ?? 0,
      salePrice: input.type === "BASIC" ? 0 : (input.salePrice ?? 0),
      publishedAt: initialStatus === "PUBLISHED" ? new Date() : null,
      ingredients: {
        create: ingredientInputs
          .filter((i) => validIds.has(i.ingredientId))
          .map((i) => ({
            ingredientId: i.ingredientId,
            quantity: i.quantity,
            unit: i.unit,
            notes: i.notes ?? null,
            unitCostSnapshot: referencePriceMap.get(i.ingredientId) ?? 0,
          })),
      },
    },
    include: {
      provider: { select: { name: true } },
      ...ingredientInclude,
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawIngredient[]).map(
    toIngredientItem
  );

  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  if (totalCost !== recipe.estimatedCostPrice) {
    await recomputeCostPrice(recipe.id, ingredients);
    recipe.estimatedCostPrice = totalCost;
  }

  return {
    ...recipe,
    instructions: input.instructions ?? null,
    ingredients,
    ingredientCount: ingredients.length,
  };
}

export async function updateMarketplaceRecipe(
  id: string,
  input: UpdateMarketplaceRecipeInput
): Promise<MarketplaceRecipeDetail> {
  const existing = await prisma.marketplaceRecipe.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error(`MarketplaceRecipe ${id} not found`);

  // Snapshot ingredient costs using referencePrice
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ingredientCreate: any[] | undefined;

  if (input.ingredients !== undefined) {
    const ingredientIds = input.ingredients.map((i) => i.ingredientId);
    const [validIngredients, referencePriceMap] = await Promise.all([
      ingredientIds.length > 0
        ? prisma.ingredient.findMany({
            where: { id: { in: ingredientIds }, scope: "PLATFORM", deletedAt: null },
            select: { id: true },
          })
        : Promise.resolve([]),
      fetchIngredientReferencePrices(ingredientIds),
    ]);
    const validIds = new Set(validIngredients.map((pi) => pi.id));
    ingredientCreate = input.ingredients
      .filter((i) => validIds.has(i.ingredientId))
      .map((i) => ({
        ingredient: { connect: { id: i.ingredientId } },
        quantity: i.quantity,
        unit: i.unit,
        notes: i.notes ?? null,
        unitCostSnapshot: referencePriceMap.get(i.ingredientId) ?? 0,
      }));
  }

  const row = await prisma.marketplaceRecipe.update({
    where: { id },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.thumbnailUrl !== undefined
        ? { thumbnailUrl: input.thumbnailUrl }
        : {}),
      ...(input.yieldQty !== undefined ? { yieldQty: input.yieldQty } : {}),
      ...(input.yieldUnit !== undefined ? { yieldUnit: input.yieldUnit } : {}),
      ...(input.servings !== undefined ? { servings: input.servings } : {}),
      ...(input.cuisineTag !== undefined
        ? { cuisineTag: input.cuisineTag }
        : {}),
      ...(input.difficulty !== undefined
        ? { difficulty: input.difficulty }
        : {}),
      ...(input.prepTimeMinutes !== undefined
        ? { prepTimeMinutes: input.prepTimeMinutes }
        : {}),
      ...(input.cookTimeMinutes !== undefined
        ? { cookTimeMinutes: input.cookTimeMinutes }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.recommendedPrice !== undefined
        ? { recommendedPrice: input.recommendedPrice }
        : {}),
      ...(input.salePrice !== undefined ? { salePrice: input.salePrice } : {}),
      ...(input.instructions !== undefined
        ? { instructions: input.instructions }
        : {}),
      ...(ingredientCreate !== undefined
        ? {
            ingredients: {
              deleteMany: {},
              create: ingredientCreate,
            },
          }
        : {}),
    },
    include: {
      provider: { select: { name: true } },
      ...ingredientInclude,
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const ingredients = (row.ingredients as RawIngredient[]).map(
    toIngredientItem
  );

  if (input.ingredients !== undefined) {
    await recomputeCostPrice(id, ingredients);
    recipe.estimatedCostPrice = ingredients.reduce(
      (sum, i) => sum + i.lineCost,
      0
    );
  }

  return {
    ...recipe,
    instructions: (row as RawRecipe).instructions ?? null,
    ingredients,
    ingredientCount: ingredients.length,
  };
}

export async function deleteMarketplaceRecipe(id: string): Promise<void> {
  const existing = await prisma.marketplaceRecipe.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error(`MarketplaceRecipe ${id} not found`);
  await prisma.marketplaceRecipe.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}

