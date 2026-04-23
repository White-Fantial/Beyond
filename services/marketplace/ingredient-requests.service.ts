/**
 * Ingredient Request Service — Platform Ingredient Management.
 *
 * Handles owner-submitted requests to add new ingredients to the platform catalogue.
 * When an owner submits a request, a temporary STORE-scope Ingredient is created
 * immediately so the owner can use it in recipes right away.
 *
 * PLATFORM_ADMIN and PLATFORM_MODERATOR can review requests and:
 *  - APPROVE: auto-create a PLATFORM ingredient, migrating all refs from the temp ingredient.
 *  - DUPLICATE: link to an existing PLATFORM ingredient, migrating temp ingredient refs.
 *  - REJECTED: deactivate the temp ingredient and notify the owner via reviewNotes.
 */
import { prisma } from "@/lib/prisma";
import type {
  IngredientRequest,
  IngredientRequestListResult,
  CreateIngredientRequestInput,
  ReviewIngredientRequestInput,
  IngredientRequestFilters,
  IngredientRequestStatus,
} from "@/types/marketplace";
import type { IngredientUnit } from "@/types/owner-ingredients";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawRequest = {
  id: string;
  requestedByUserId: string;
  tenantId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  notes: string | null;
  status: string;
  resolvedIngredientId: string | null;
  tempIngredientId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  ownerSeenAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { name: string } | null;
  resolvedIngredient?: { name: string } | null;
};

const requestInclude = {
  requestedBy: { select: { name: true } },
  resolvedIngredient: { select: { name: true } },
};

function toRequest(row: RawRequest): IngredientRequest {
  return {
    id: row.id,
    requestedByUserId: row.requestedByUserId,
    requestedByName: row.requestedBy?.name ?? "",
    tenantId: row.tenantId,
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit,
    notes: row.notes,
    status: row.status as IngredientRequestStatus,
    resolvedIngredientId: row.resolvedIngredientId,
    resolvedIngredientName: row.resolvedIngredient?.name ?? null,
    tempIngredientId: row.tempIngredientId,
    reviewedByUserId: row.reviewedByUserId,
    reviewNotes: row.reviewNotes,
    ownerSeenAt: row.ownerSeenAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/**
 * Submit a new ingredient request.
 *
 * When a tenantId is provided (owner context), a temporary STORE-scope Ingredient
 * is auto-created so the owner can use it in recipes immediately while the request
 * is under review.
 */
export async function createIngredientRequest(
  requestedByUserId: string,
  input: CreateIngredientRequestInput
): Promise<IngredientRequest> {
  const unit = (input.unit ?? "GRAM") as IngredientUnit;
  const tenantId = input.tenantId ?? null;

  // Create the request record first
  const row = await prisma.ingredientRequest.create({
    data: {
      requestedByUserId,
      tenantId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      category: input.category?.trim() ?? null,
      unit,
      notes: input.notes?.trim() ?? null,
      status: "PENDING",
    },
    include: { requestedBy: { select: { name: true } } },
  });

  // If the request comes from an owner, auto-create a temporary STORE-scope ingredient
  if (tenantId) {
    const tempIngredient = await prisma.ingredient.create({
      data: {
        scope: "STORE",
        tenantId,
        storeId: null,
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        category: input.category?.trim() ?? null,
        unit,
        notes: input.notes?.trim() ?? null,
        isActive: true,
      },
    });

    const updated = await prisma.ingredientRequest.update({
      where: { id: row.id },
      data: { tempIngredientId: tempIngredient.id },
      include: requestInclude,
    });

    return toRequest(updated as RawRequest);
  }

  return toRequest(row as RawRequest);
}

/** List all ingredient requests (moderator / admin view). */
export async function listIngredientRequests(
  filters: IngredientRequestFilters = {}
): Promise<IngredientRequestListResult> {
  const { status, requestedByUserId, page = 1, pageSize = 50 } = filters;

  const where = {
    ...(status !== undefined ? { status } : {}),
    ...(requestedByUserId !== undefined ? { requestedByUserId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.ingredientRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ingredientRequest.count({ where }),
  ]);

  return {
    items: (rows as unknown as RawRequest[]).map(toRequest),
    total,
    page,
    pageSize,
  };
}

/** Get ingredient requests submitted by a specific user. */
export async function getUserIngredientRequests(
  requestedByUserId: string,
  page = 1,
  pageSize = 50
): Promise<IngredientRequestListResult> {
  const where = { requestedByUserId };

  const [rows, total] = await Promise.all([
    prisma.ingredientRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ingredientRequest.count({ where }),
  ]);

  return {
    items: (rows as unknown as RawRequest[]).map(toRequest),
    total,
    page,
    pageSize,
  };
}

/** Get ingredient requests submitted by owners within a specific tenant. */
export async function getTenantIngredientRequests(
  tenantId: string,
  page = 1,
  pageSize = 50
): Promise<IngredientRequestListResult> {
  const where = { tenantId };

  const [rows, total] = await Promise.all([
    prisma.ingredientRequest.findMany({
      where,
      include: requestInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.ingredientRequest.count({ where }),
  ]);

  return {
    items: (rows as unknown as RawRequest[]).map(toRequest),
    total,
    page,
    pageSize,
  };
}

/** Get a single ingredient request by id. */
export async function getIngredientRequest(
  id: string
): Promise<IngredientRequest> {
  const row = await prisma.ingredientRequest.findUnique({
    where: { id },
    include: requestInclude,
  });
  if (!row) throw new Error(`IngredientRequest ${id} not found`);
  return toRequest(row as RawRequest);
}

/**
 * Review an ingredient request (moderator / admin action).
 *
 * APPROVED (auto-create):
 *   Creates a new PLATFORM-scope Ingredient from the request data.
 *   Any RecipeIngredient or MarketplaceRecipeIngredient rows referencing
 *   the temp ingredient are migrated to the new PLATFORM ingredient.
 *   The temp ingredient is then soft-deleted.
 *
 * DUPLICATE:
 *   resolvedIngredientId must point to the existing PLATFORM ingredient.
 *   Migrates temp ingredient references to the existing ingredient, then soft-deletes
 *   the temp ingredient.
 *
 * REJECTED:
 *   Deactivates the temp ingredient (sets isActive=false) so owners know it is
 *   no longer usable. The reviewNotes reason is visible to the owner.
 */
export async function reviewIngredientRequest(
  id: string,
  reviewedByUserId: string,
  input: ReviewIngredientRequestInput
): Promise<IngredientRequest> {
  const existing = await prisma.ingredientRequest.findUnique({ where: { id } });
  if (!existing) throw new Error(`IngredientRequest ${id} not found`);
  if (existing.status !== "PENDING") {
    throw new Error(
      `IngredientRequest ${id} has already been reviewed (status: ${existing.status})`
    );
  }

  if (input.status === "DUPLICATE" && !input.resolvedIngredientId) {
    throw new Error(
      "resolvedIngredientId is required when marking as duplicate"
    );
  }

  const tempId = (existing as unknown as RawRequest).tempIngredientId;

  if (input.status === "APPROVED") {
    let resolvedId: string;

    if (input.resolvedIngredientId) {
      // Approve & Edit flow: admin already created the ingredient externally
      resolvedId = input.resolvedIngredientId;
    } else {
      // Auto-create the PLATFORM ingredient from request data
      const platformIngredient = await prisma.ingredient.create({
        data: {
          scope: "PLATFORM",
          tenantId: null,
          storeId: null,
          name: existing.name,
          description: existing.description ?? null,
          category: existing.category ?? null,
          unit: existing.unit as IngredientUnit,
          notes: existing.notes ?? null,
          createdByUserId: reviewedByUserId,
          isActive: true,
        },
      });
      resolvedId = platformIngredient.id;
    }

    // Migrate temp ingredient references if a temp ingredient exists
    if (tempId) {
      await prisma.recipeIngredient.updateMany({
        where: { ingredientId: tempId },
        data: { ingredientId: resolvedId },
      });
      await prisma.marketplaceRecipeIngredient.updateMany({
        where: { ingredientId: tempId },
        data: { ingredientId: resolvedId },
      });
      await prisma.ingredient.update({
        where: { id: tempId },
        data: { deletedAt: new Date(), isActive: false },
      });
    }

    const row = await prisma.ingredientRequest.update({
      where: { id },
      data: {
        status: "APPROVED",
        resolvedIngredientId: resolvedId,
        reviewedByUserId,
        reviewNotes: input.reviewNotes?.trim() ?? null,
      },
      include: requestInclude,
    });

    return toRequest(row as RawRequest);
  }

  if (input.status === "DUPLICATE") {
    const resolvedId = input.resolvedIngredientId!;

    // Migrate temp ingredient references to the existing PLATFORM ingredient
    if (tempId) {
      await prisma.recipeIngredient.updateMany({
        where: { ingredientId: tempId },
        data: { ingredientId: resolvedId },
      });
      await prisma.marketplaceRecipeIngredient.updateMany({
        where: { ingredientId: tempId },
        data: { ingredientId: resolvedId },
      });
      await prisma.ingredient.update({
        where: { id: tempId },
        data: { deletedAt: new Date(), isActive: false },
      });
    }

    const row = await prisma.ingredientRequest.update({
      where: { id },
      data: {
        status: "DUPLICATE",
        resolvedIngredientId: resolvedId,
        reviewedByUserId,
        reviewNotes: input.reviewNotes?.trim() ?? null,
      },
      include: requestInclude,
    });

    return toRequest(row as RawRequest);
  }

  // REJECTED: if a suggested replacement was provided, migrate refs and soft-delete the temp.
  // Otherwise just deactivate the temp ingredient so the owner knows to fix their recipes manually.
  if (input.suggestedIngredientId && tempId) {
    const replacementId = input.suggestedIngredientId;
    await prisma.recipeIngredient.updateMany({
      where: { ingredientId: tempId },
      data: { ingredientId: replacementId },
    });
    await prisma.marketplaceRecipeIngredient.updateMany({
      where: { ingredientId: tempId },
      data: { ingredientId: replacementId },
    });
    await prisma.ingredient.update({
      where: { id: tempId },
      data: { deletedAt: new Date(), isActive: false },
    });

    const row = await prisma.ingredientRequest.update({
      where: { id },
      data: {
        status: "REJECTED",
        resolvedIngredientId: replacementId,
        reviewedByUserId,
        reviewNotes: input.reviewNotes?.trim() ?? null,
      },
      include: requestInclude,
    });

    return toRequest(row as RawRequest);
  }

  // REJECTED without replacement: just deactivate the temp ingredient
  if (tempId) {
    await prisma.ingredient.update({
      where: { id: tempId },
      data: { isActive: false },
    });
  }

  const row = await prisma.ingredientRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      resolvedIngredientId: null,
      reviewedByUserId,
      reviewNotes: input.reviewNotes?.trim() ?? null,
    },
    include: requestInclude,
  });

  return toRequest(row as RawRequest);
}

/**
 * Mark all reviewed (non-PENDING) requests for a tenant as seen by the owner.
 * Called when the owner visits the ingredient requests page.
 */
export async function markRequestsSeen(tenantId: string): Promise<void> {
  await prisma.ingredientRequest.updateMany({
    where: {
      tenantId,
      status: { not: "PENDING" },
      ownerSeenAt: null,
    },
    data: { ownerSeenAt: new Date() },
  });
}

/**
 * Count ingredient requests for a tenant that have been reviewed but not yet seen by the owner.
 * Used to drive the navigation badge.
 */
export async function countUnseenRequests(tenantId: string): Promise<number> {
  return prisma.ingredientRequest.count({
    where: {
      tenantId,
      status: { not: "PENDING" },
      ownerSeenAt: null,
    },
  });
}

/**
 * Return the names of recipes (scoped to the given tenant) that reference a specific ingredient.
 * Used to help owners identify which recipes need manual updating after a rejected request.
 */
export async function getRecipesByIngredient(
  tenantId: string,
  ingredientId: string
): Promise<{ id: string; name: string }[]> {
  const rows = await prisma.recipeIngredient.findMany({
    where: {
      ingredientId,
      recipe: { tenantId, deletedAt: null },
    },
    include: { recipe: { select: { id: true, name: true } } },
  });
  // Deduplicate by recipe id
  const seen = new Set<string>();
  const results: { id: string; name: string }[] = [];
  for (const r of rows) {
    const recipe = r.recipe as { id: string; name: string };
    if (!seen.has(recipe.id)) {
      seen.add(recipe.id);
      results.push(recipe);
    }
  }
  return results;
}
