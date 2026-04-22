/**
 * Owner Tenant Ingredients Service.
 *
 * Manages TenantIngredient registrations — tracks which PLATFORM-scope
 * ingredients a tenant has opted into. Once registered, owners can set
 * per-tenant preferred supplier-product links on that ingredient.
 */
import { prisma } from "@/lib/prisma";
import type { Ingredient } from "@/types/owner-ingredients";

export interface TenantIngredientRegistration {
  id: string;
  tenantId: string;
  ingredientId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  ingredient: Ingredient;
}

function toIngredient(row: {
  id: string;
  name: string;
  scope: string;
  tenantId: string | null;
  storeId: string | null;
  category: string | null;
  unit: string;
  isActive: boolean;
  notes: string | null;
  description: string | null;
  createdByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}): Ingredient {
  return {
    id: row.id,
    name: row.name,
    scope: row.scope as Ingredient["scope"],
    tenantId: row.tenantId,
    storeId: row.storeId,
    category: row.category,
    unit: row.unit as Ingredient["unit"],
    isActive: row.isActive,
    notes: row.notes,
    description: row.description,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * List all PLATFORM ingredients a tenant has registered.
 */
export async function listTenantIngredients(
  tenantId: string
): Promise<TenantIngredientRegistration[]> {
  const rows = await prisma.tenantIngredient.findMany({
    where: { tenantId, isActive: true },
    include: {
      ingredient: true,
    },
    orderBy: { createdAt: "asc" },
  });

  return rows.map((r) => ({
    id: r.id,
    tenantId: r.tenantId,
    ingredientId: r.ingredientId,
    isActive: r.isActive,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    ingredient: toIngredient(r.ingredient),
  }));
}

/**
 * Register a PLATFORM ingredient for use within a tenant.
 * Idempotent — if the registration already exists it is re-activated.
 */
export async function registerTenantIngredient(
  tenantId: string,
  platformIngredientId: string
): Promise<TenantIngredientRegistration> {
  // Verify the ingredient is PLATFORM-scope
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: platformIngredientId, scope: "PLATFORM", deletedAt: null },
  });
  if (!ingredient) {
    throw new Error(`Platform ingredient ${platformIngredientId} not found`);
  }

  // Upsert: create or re-activate
  const existing = await prisma.tenantIngredient.findFirst({
    where: { tenantId, ingredientId: platformIngredientId },
  });

  let row;
  if (existing) {
    row = await prisma.tenantIngredient.update({
      where: { id: existing.id },
      data: { isActive: true },
      include: { ingredient: true },
    });
  } else {
    row = await prisma.tenantIngredient.create({
      data: { tenantId, ingredientId: platformIngredientId, isActive: true },
      include: { ingredient: true },
    });
  }

  return {
    id: row.id,
    tenantId: row.tenantId,
    ingredientId: row.ingredientId,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    ingredient: toIngredient(row.ingredient),
  };
}

/**
 * De-register (soft-deactivate) a PLATFORM ingredient from a tenant.
 */
export async function deregisterTenantIngredient(
  tenantId: string,
  platformIngredientId: string
): Promise<void> {
  const registration = await prisma.tenantIngredient.findFirst({
    where: { tenantId, ingredientId: platformIngredientId },
  });
  if (!registration) {
    throw new Error(`Tenant ingredient registration for ${platformIngredientId} not found`);
  }

  await prisma.tenantIngredient.update({
    where: { id: registration.id },
    data: { isActive: false },
  });
}
