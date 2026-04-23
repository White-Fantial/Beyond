/**
 * Owner Ingredients Service.
 *
 * Ingredients are platform-managed only. Owners can only select/unselect
 * which platform ingredients are active for their tenant.
 */
import { prisma } from "@/lib/prisma";
import type {
  Ingredient,
  IngredientListResult,
  IngredientFilters,
} from "@/types/owner-ingredients";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIngredient(row: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  isActive: boolean;
  createdByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Ingredient {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit as IngredientUnit,
    isActive: row.isActive,
    createdByUserId: row.createdByUserId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listIngredients(
  tenantId: string,
  filters: IngredientFilters = {}
): Promise<IngredientListResult> {
  const { category, isActive, page = 1, pageSize = 50 } = filters;

  const where = {
    tenantId,
    isActive: true,
    ingredient: {
      deletedAt: null,
      ...(category !== undefined ? { category } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
  };

  const [rows, total] = await Promise.all([
    prisma.tenantIngredientSelection.findMany({
      where,
      include: { ingredient: true },
      orderBy: { ingredient: { name: "asc" } },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.tenantIngredientSelection.count({ where }),
  ]);

  return {
    items: rows.map((row) => toIngredient(row.ingredient)),
    total,
    page,
    pageSize,
  };
}

export async function getIngredient(
  tenantId: string,
  ingredientId: string
): Promise<Ingredient> {
  const row = await prisma.tenantIngredientSelection.findFirst({
    where: {
      tenantId,
      ingredientId,
      isActive: true,
      ingredient: { deletedAt: null },
    },
    include: { ingredient: true },
  });
  if (!row) throw new Error(`Ingredient ${ingredientId} not found`);
  return toIngredient(row.ingredient);
}

export async function selectPlatformIngredient(
  tenantId: string,
  ingredientId: string
): Promise<Ingredient> {
  const platformIngredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, isActive: true, deletedAt: null },
  });
  if (!platformIngredient) {
    throw new Error(`Platform ingredient ${ingredientId} not found`);
  }

  await prisma.tenantIngredientSelection.upsert({
    where: {
      tenantId_ingredientId: {
        tenantId,
        ingredientId,
      },
    },
    create: {
      tenantId,
      ingredientId,
      isActive: true,
    },
    update: {
      isActive: true,
    },
  });

  return toIngredient(platformIngredient);
}

export async function unselectPlatformIngredient(
  tenantId: string,
  ingredientId: string
): Promise<void> {
  const selection = await prisma.tenantIngredientSelection.findFirst({
    where: { tenantId, ingredientId, isActive: true },
  });
  if (!selection) throw new Error(`Ingredient ${ingredientId} not found`);

  await prisma.tenantIngredientSelection.update({
    where: { id: selection.id },
    data: { isActive: false },
  });
}

/**
 * Search platform (PLATFORM-scope) ingredients by name keyword and/or category.
 * Returns paginated results so owners can browse and import platform ingredients.
 */
export async function searchPlatformIngredients(
  filters: { q?: string; category?: string; page?: number; pageSize?: number } = {}
): Promise<IngredientListResult> {
  const { q, category, page = 1, pageSize = 30 } = filters;

  const where = {
    isActive: true,
    deletedAt: null,
    ...(category ? { category } : {}),
    ...(q?.trim()
      ? { name: { contains: q.trim(), mode: "insensitive" as const } }
      : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ingredient.count({ where }),
  ]);

  return { items: rows.map(toIngredient), total, page, pageSize };
}
