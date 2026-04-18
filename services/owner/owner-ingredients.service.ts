/**
 * Owner Ingredients Service — Cost Management Phase 1.
 *
 * Manage ingredient master data. All functions scoped to tenantId.
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
  tenantId: string;
  storeId: string;
  name: string;
  description: string | null;
  unit: string;
  unitCost: number;
  currency: string;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}): Ingredient {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    name: row.name,
    description: row.description,
    unit: row.unit as IngredientUnit,
    unitCost: row.unitCost,
    currency: row.currency,
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
    where: { id: ingredientId, tenantId, deletedAt: null },
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
      tenantId,
      storeId: input.storeId,
      name: input.name,
      description: input.description ?? null,
      unit: input.unit,
      unitCost: input.unitCost,
      currency: input.currency ?? "NZD",
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
    where: { id: ingredientId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Ingredient ${ingredientId} not found`);

  const row = await prisma.ingredient.update({
    where: { id: ingredientId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.unitCost !== undefined ? { unitCost: input.unitCost } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
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
    where: { id: ingredientId, tenantId, deletedAt: null },
  });
  if (!existing) throw new Error(`Ingredient ${ingredientId} not found`);

  await prisma.ingredient.update({
    where: { id: ingredientId },
    data: { deletedAt: new Date() },
  });
}
