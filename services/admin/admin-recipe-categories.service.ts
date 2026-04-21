/**
 * Admin Recipe Categories Service — Platform-level recipe category management.
 *
 * Recipe categories are created and managed by platform admins. They are
 * platform-wide (no tenantId) and can be optionally assigned to any recipe.
 * Deleting a category sets recipe.categoryId to null (SetNull).
 */
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export interface RecipeCategoryRow {
  id: string;
  name: string;
  displayOrder: number;
  recipeCount: number;
}

// ─── List ─────────────────────────────────────────────────────────────────────

export async function listRecipeCategories(): Promise<RecipeCategoryRow[]> {
  const rows = await prisma.recipeCategory.findMany({
    orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
    include: { _count: { select: { recipes: { where: { deletedAt: null } } } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    displayOrder: r.displayOrder,
    recipeCount: r._count.recipes,
  }));
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createRecipeCategory(
  actorUserId: string,
  name: string,
  displayOrder = 0
): Promise<RecipeCategoryRow> {
  const existing = await prisma.recipeCategory.findUnique({ where: { name: name.trim() } });
  if (existing) throw new Error("A category with this name already exists");

  const row = await prisma.recipeCategory.create({
    data: { name: name.trim(), displayOrder },
  });
  await logAuditEvent({
    tenantId: null,
    actorUserId,
    action: "RECIPE_CATEGORY_CREATED",
    targetType: "RecipeCategory",
    targetId: row.id,
    metadata: { name: row.name },
  });
  return { id: row.id, name: row.name, displayOrder: row.displayOrder, recipeCount: 0 };
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateRecipeCategory(
  categoryId: string,
  actorUserId: string,
  data: { name?: string; displayOrder?: number }
): Promise<RecipeCategoryRow> {
  const existing = await prisma.recipeCategory.findUnique({ where: { id: categoryId } });
  if (!existing) throw new Error("Recipe category not found");

  if (data.name) {
    const conflict = await prisma.recipeCategory.findFirst({
      where: { name: data.name.trim(), id: { not: categoryId } },
    });
    if (conflict) throw new Error("A category with this name already exists");
  }

  const row = await prisma.recipeCategory.update({
    where: { id: categoryId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() } : {}),
      ...(data.displayOrder !== undefined ? { displayOrder: data.displayOrder } : {}),
    },
    include: { _count: { select: { recipes: { where: { deletedAt: null } } } } },
  });
  await logAuditEvent({
    tenantId: null,
    actorUserId,
    action: "RECIPE_CATEGORY_UPDATED",
    targetType: "RecipeCategory",
    targetId: row.id,
    metadata: { name: row.name },
  });
  return {
    id: row.id,
    name: row.name,
    displayOrder: row.displayOrder,
    recipeCount: row._count.recipes,
  };
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteRecipeCategory(
  categoryId: string,
  actorUserId: string
): Promise<void> {
  const existing = await prisma.recipeCategory.findUnique({ where: { id: categoryId } });
  if (!existing) throw new Error("Recipe category not found");

  // Prisma cascades SetNull to recipes.categoryId automatically
  await prisma.recipeCategory.delete({ where: { id: categoryId } });
  await logAuditEvent({
    tenantId: null,
    actorUserId,
    action: "RECIPE_CATEGORY_DELETED",
    targetType: "RecipeCategory",
    targetId: categoryId,
    metadata: { name: existing.name },
  });
}
