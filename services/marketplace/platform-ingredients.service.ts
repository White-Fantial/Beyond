/**
 * Platform Ingredients Service — Marketplace.
 *
 * Manages the platform-global ingredient catalogue (scope = PLATFORM).
 * Thin wrapper around the unified Ingredient model — all reads filter on scope=PLATFORM.
 * Only PLATFORM_ADMIN and PLATFORM_MODERATOR may write; RECIPE_PROVIDER reads only.
 */
import { prisma } from "@/lib/prisma";
import type {
  Ingredient,
  IngredientListResult,
  CreateIngredientInput,
  UpdateIngredientInput,
  IngredientFilters,
} from "@/types/owner-ingredients";

// Re-export convenience types used by callers that previously imported from marketplace types.
export type { Ingredient as PlatformIngredient };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIngredient(row: {
  id: string;
  scope: string;
  tenantId: string | null;
  storeId: string | null;
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
    scope: row.scope as "PLATFORM" | "STORE",
    tenantId: row.tenantId,
    storeId: row.storeId,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit as Ingredient["unit"],
    isActive: row.isActive,
    createdByUserId: row.createdByUserId,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listPlatformIngredients(
  filters: Pick<IngredientFilters, "category" | "isActive" | "page" | "pageSize"> = {}
): Promise<IngredientListResult> {
  const { category, isActive, page = 1, pageSize = 50 } = filters;

  const where = {
    scope: "PLATFORM" as const,
    deletedAt: null,
    ...(category !== undefined ? { category } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
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

  return {
    items: rows.map(toIngredient),
    total,
    page,
    pageSize,
  };
}

export async function getPlatformIngredient(id: string): Promise<Ingredient> {
  const row = await prisma.ingredient.findFirst({
    where: { id, scope: "PLATFORM", deletedAt: null },
  });
  if (!row) throw new Error(`PlatformIngredient ${id} not found`);
  return toIngredient(row);
}

export async function createPlatformIngredient(
  createdByUserId: string,
  input: Pick<CreateIngredientInput, "name" | "description" | "category" | "unit">
): Promise<Ingredient> {
  const row = await prisma.ingredient.create({
    data: {
      scope: "PLATFORM",
      tenantId: null,
      storeId: null,
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      unit: input.unit,
      isActive: true,
      createdByUserId,
    },
  });
  return toIngredient(row);
}

export async function updatePlatformIngredient(
  id: string,
  input: UpdateIngredientInput
): Promise<Ingredient> {
  const existing = await prisma.ingredient.findFirst({
    where: { id, scope: "PLATFORM", deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformIngredient ${id} not found`);

  const row = await prisma.ingredient.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return toIngredient(row);
}

export async function deletePlatformIngredient(id: string): Promise<void> {
  const existing = await prisma.ingredient.findFirst({
    where: { id, scope: "PLATFORM", deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformIngredient ${id} not found`);
  await prisma.ingredient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
