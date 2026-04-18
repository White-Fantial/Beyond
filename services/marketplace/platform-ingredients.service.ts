/**
 * Platform Ingredients Service — Marketplace.
 *
 * Manages the platform-global ingredient catalogue used by marketplace recipes.
 * Only PLATFORM_ADMIN and PLATFORM_MODERATOR may write; RECIPE_PROVIDER reads only.
 */
import { prisma } from "@/lib/prisma";
import type {
  PlatformIngredient,
  PlatformIngredientListResult,
  CreatePlatformIngredientInput,
  UpdatePlatformIngredientInput,
  PlatformIngredientFilters,
} from "@/types/marketplace";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toIngredient(row: {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  referenceUnitCost: number;
  currency: string;
  isActive: boolean;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}): PlatformIngredient {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit as IngredientUnit,
    referenceUnitCost: row.referenceUnitCost,
    currency: row.currency,
    isActive: row.isActive,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listPlatformIngredients(
  filters: PlatformIngredientFilters = {}
): Promise<PlatformIngredientListResult> {
  const { category, isActive, page = 1, pageSize = 50 } = filters;

  const where = {
    deletedAt: null,
    ...(category !== undefined ? { category } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.platformIngredient.findMany({
      where,
      orderBy: [{ category: "asc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.platformIngredient.count({ where }),
  ]);

  return {
    items: rows.map(toIngredient),
    total,
    page,
    pageSize,
  };
}

export async function getPlatformIngredient(
  id: string
): Promise<PlatformIngredient> {
  const row = await prisma.platformIngredient.findFirst({
    where: { id, deletedAt: null },
  });
  if (!row) throw new Error(`PlatformIngredient ${id} not found`);
  return toIngredient(row);
}

export async function createPlatformIngredient(
  createdByUserId: string,
  input: CreatePlatformIngredientInput
): Promise<PlatformIngredient> {
  const row = await prisma.platformIngredient.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      category: input.category ?? null,
      unit: input.unit,
      referenceUnitCost: input.referenceUnitCost,
      currency: input.currency ?? "KRW",
      isActive: true,
      createdByUserId,
    },
  });
  return toIngredient(row);
}

export async function updatePlatformIngredient(
  id: string,
  input: UpdatePlatformIngredientInput
): Promise<PlatformIngredient> {
  const existing = await prisma.platformIngredient.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformIngredient ${id} not found`);

  const row = await prisma.platformIngredient.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined
        ? { description: input.description }
        : {}),
      ...(input.category !== undefined ? { category: input.category } : {}),
      ...(input.unit !== undefined ? { unit: input.unit } : {}),
      ...(input.referenceUnitCost !== undefined
        ? { referenceUnitCost: input.referenceUnitCost }
        : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
    },
  });
  return toIngredient(row);
}

export async function deletePlatformIngredient(id: string): Promise<void> {
  const existing = await prisma.platformIngredient.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error(`PlatformIngredient ${id} not found`);
  await prisma.platformIngredient.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
}
