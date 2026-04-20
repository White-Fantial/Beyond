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
  MarketplaceRecipeStep,
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
  currency: string;
  estimatedCostPrice: number;
  recommendedPrice: number;
  salePrice: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  provider?: { name: string } | null;
};

type RawStep = {
  id: string;
  recipeId: string;
  stepNumber: number;
  instruction: string;
  imageUrl: string | null;
  durationMinutes: number | null;
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
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toStep(row: RawStep): MarketplaceRecipeStep {
  return {
    id: row.id,
    recipeId: row.recipeId,
    stepNumber: row.stepNumber,
    instruction: row.instruction,
    imageUrl: row.imageUrl,
    durationMinutes: row.durationMinutes,
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
    lineCost: Math.round(qty * row.unitCostSnapshot),
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

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listMarketplaceRecipes(
  filters: MarketplaceRecipeFilters = {}
): Promise<MarketplaceRecipeListResult> {
  const {
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
  };

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

  return {
    items: rows.map((r) => toRecipe(r as RawRecipe)),
    total,
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
      steps: { orderBy: { stepNumber: "asc" } },
      ingredients: {
        include: {
          ingredient: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!row) throw new Error(`MarketplaceRecipe ${id} not found`);

  const recipe = toRecipe(row as RawRecipe);
  const steps = (row.steps as RawStep[]).map(toStep);
  const ingredients = (row.ingredients as RawIngredient[]).map(
    toIngredientItem
  );

  return {
    ...recipe,
    steps,
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

  // Snapshot ingredient costs at creation time
  const ingredientInputs = input.ingredients ?? [];
  const ingredientIds = ingredientInputs.map((i) => i.ingredientId);

  const ingredientCosts =
    ingredientIds.length > 0
      ? await prisma.ingredient.findMany({
          where: { id: { in: ingredientIds }, scope: "PLATFORM", deletedAt: null },
          select: { id: true, unitCost: true },
        })
      : [];

  const costMap = new Map(
    ingredientCosts.map((pi) => [pi.id, pi.unitCost])
  );

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
      currency: input.currency ?? "USD",
      recommendedPrice: input.recommendedPrice ?? 0,
      salePrice: input.type === "BASIC" ? 0 : (input.salePrice ?? 0),
      publishedAt: initialStatus === "PUBLISHED" ? new Date() : null,
      steps: {
        create: (input.steps ?? []).map((s) => ({
          stepNumber: s.stepNumber,
          instruction: s.instruction,
          imageUrl: s.imageUrl ?? null,
          durationMinutes: s.durationMinutes ?? null,
        })),
      },
      ingredients: {
        create: ingredientInputs.map((i) => ({
          ingredientId: i.ingredientId,
          quantity: i.quantity,
          unit: i.unit,
          notes: i.notes ?? null,
          unitCostSnapshot: costMap.get(i.ingredientId) ?? 0,
        })),
      },
    },
    include: {
      provider: { select: { name: true } },
      steps: { orderBy: { stepNumber: "asc" } },
      ingredients: {
        include: { ingredient: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const steps = (row.steps as RawStep[]).map(toStep);
  const ingredients = (row.ingredients as RawIngredient[]).map(
    toIngredientItem
  );

  const totalCost = ingredients.reduce((sum, i) => sum + i.lineCost, 0);
  if (totalCost !== recipe.estimatedCostPrice) {
    await recomputeCostPrice(recipe.id, ingredients);
    recipe.estimatedCostPrice = totalCost;
  }

  return { ...recipe, steps, ingredients, ingredientCount: ingredients.length };
}

export async function updateMarketplaceRecipe(
  id: string,
  input: UpdateMarketplaceRecipeInput
): Promise<MarketplaceRecipeDetail> {
  const existing = await prisma.marketplaceRecipe.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error(`MarketplaceRecipe ${id} not found`);

  // Snapshot ingredient costs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let ingredientCreate: any[] | undefined;

  if (input.ingredients !== undefined) {
    const ingredientIds = input.ingredients.map((i) => i.ingredientId);
    const ingredients =
      ingredientIds.length > 0
        ? await prisma.ingredient.findMany({
            where: { id: { in: ingredientIds }, scope: "PLATFORM", deletedAt: null },
            select: { id: true, unitCost: true },
          })
        : [];
    const costMap = new Map(
      ingredients.map((pi) => [pi.id, pi.unitCost])
    );
    ingredientCreate = input.ingredients.map((i) => ({
      ingredient: { connect: { id: i.ingredientId } },
      quantity: i.quantity,
      unit: i.unit,
      notes: i.notes ?? null,
      unitCostSnapshot: costMap.get(i.ingredientId) ?? 0,
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
      ...(input.steps !== undefined
        ? {
            steps: {
              deleteMany: {},
              create: input.steps.map((s) => ({
                stepNumber: s.stepNumber,
                instruction: s.instruction,
                imageUrl: s.imageUrl ?? null,
                durationMinutes: s.durationMinutes ?? null,
              })),
            },
          }
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
      steps: { orderBy: { stepNumber: "asc" } },
      ingredients: {
        include: { ingredient: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  const recipe = toRecipe(row as RawRecipe);
  const steps = (row.steps as RawStep[]).map(toStep);
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

  return { ...recipe, steps, ingredients, ingredientCount: ingredients.length };
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
