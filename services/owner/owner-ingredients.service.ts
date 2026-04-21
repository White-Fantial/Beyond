/**
 * Owner Ingredients Service — Cost Management Phase 1.
 *
 * Manage ingredient master data for a tenant's store (scope = STORE).
 * All functions scoped to tenantId.
 */
import { prisma } from "@/lib/prisma";
import type {
  Ingredient,
  IngredientListResult,
  CreateIngredientInput,
  UpdateIngredientInput,
  IngredientFilters,
} from "@/types/owner-ingredients";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIngredient(row: {
  id: string;
  scope: string;
  tenantId: string | null;
  storeId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  purchaseUnit: string;
  purchaseQty: number;
  unit: string;
  unitCost: number;
  currency: string;
  isActive: boolean;
  createdByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Ingredient {
  return {
    id: row.id,
    scope: row.scope as "PLATFORM" | "STORE",
    tenantId: row.tenantId,
    storeId: row.storeId,
    name: row.name,
    description: row.description,
    category: row.category,
    purchaseUnit: row.purchaseUnit as IngredientUnit,
    purchaseQty: row.purchaseQty,
    unit: row.unit as IngredientUnit,
    unitCost: row.unitCost,
    currency: row.currency,
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
  const { storeId, page = 1, pageSize = 50 } = filters;

  const where = {
    scope: "STORE" as const,
    tenantId,
    deletedAt: null,
    ...(storeId ? { storeId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.ingredient.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ingredient.count({ where }),
  ]);

  return { items: rows.map(toIngredient), total, page, pageSize };
}

export async function getIngredient(
  tenantId: string,
  ingredientId: string
): Promise<Ingredient> {
  const row = await prisma.ingredient.findFirst({
    where: { id: ingredientId, scope: "STORE", tenantId, deletedAt: null },
  });
  if (!row) throw new Error(`Ingredient ${ingredientId} not found`);
  return toIngredient(row);
}

export async function createIngredient(
  tenantId: string,
  input: CreateIngredientInput
): Promise<Ingredient> {
  const row = await prisma.ingredient.create({
    data: {
      scope: "STORE",
      tenantId,
      storeId: input.storeId ?? null,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      purchaseUnit: input.purchaseUnit,
      purchaseQty: input.purchaseQty ?? 1,
      unit: input.unit,
      unitCost: input.unitCost,
      currency: input.currency ?? "USD",
      notes: input.notes ?? null,
    },
  });
  return toIngredient(row);
}

export async function updateIngredient(
  tenantId: string,
  ingredientId: string,
  input: UpdateIngredientInput
): Promise<Ingredient> {
  const existing = await prisma.ingredient.findFirst({
    where: { id: ingredientId, scope: "STORE", tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Ingredient ${ingredientId} not found`);

  const row = await prisma.ingredient.update({
    where: { id: ingredientId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.purchaseUnit !== undefined ? { purchaseUnit: input.purchaseUnit } : {}),
      ...(input.purchaseQty !== undefined ? { purchaseQty: input.purchaseQty } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.notes !== undefined ? { notes: input.notes } : {}),
    },
  });
  return toIngredient(row);
}

export async function deleteIngredient(
  tenantId: string,
  ingredientId: string
): Promise<void> {
  const existing = await prisma.ingredient.findFirst({
    where: { id: ingredientId, scope: "STORE", tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Ingredient ${ingredientId} not found`);

  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { deletedAt: new Date() },
  });
}

/**
 * Import a PLATFORM-scope ingredient into a store's ingredient list.
 *
 * Creates a new STORE-scope Ingredient that mirrors the platform ingredient's
 * name, description, category, purchaseUnit, and unit — but uses the owner's
 * own unitCost (price), because each owner may pay a different price for the
 * same ingredient from the same supplier.
 */
export async function importPlatformIngredient(
  tenantId: string,
  storeId: string,
  platformIngredientId: string,
  unitCost: number,
  purchaseQty?: number
): Promise<Ingredient> {
  const platform = await prisma.ingredient.findFirst({
    where: { id: platformIngredientId, scope: "PLATFORM", deletedAt: null },
  });
  if (!platform) {
    throw new Error(`Platform ingredient ${platformIngredientId} not found`);
  }

  const row = await prisma.ingredient.create({
    data: {
      scope: "STORE",
      tenantId,
      storeId,
      name: platform.name,
      description: platform.description,
      category: platform.category,
      purchaseUnit: platform.purchaseUnit,
      unit: platform.unit,
      unitCost,
      purchaseQty: purchaseQty !== undefined ? purchaseQty : 1,
      currency: platform.currency,
      notes: platform.notes,
    },
  });
  return toIngredient(row);
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
    scope: "PLATFORM" as const,
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
