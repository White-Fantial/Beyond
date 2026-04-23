/**
 * Ingredient Request Service — Platform Ingredient Management.
 *
 * Handles owner-submitted requests to add new ingredients to the platform catalogue.
 *
 * PLATFORM_ADMIN and PLATFORM_MODERATOR can review requests and:
 *  - APPROVE: auto-create a platform ingredient (or link to an existing one).
 *  - DUPLICATE: link to an existing platform ingredient.
 *  - REJECTED: reject with optional suggestion and reviewNotes.
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

async function assertIngredientExists(ingredientId: string): Promise<void> {
  const ingredient = await prisma.ingredient.findFirst({
    where: { id: ingredientId, deletedAt: null, isActive: true },
    select: { id: true },
  });
  if (!ingredient) {
    throw new Error(`Ingredient ${ingredientId} not found`);
  }
}

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
 */
export async function createIngredientRequest(
  requestedByUserId: string,
  input: CreateIngredientRequestInput
): Promise<IngredientRequest> {
  const unit = (input.unit ?? "GRAM") as IngredientUnit;
  const tenantId = input.tenantId ?? null;

  // Create request record
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
 *   Creates a new platform ingredient from the request data unless a
 *   resolvedIngredientId is explicitly provided.
 *
 * DUPLICATE:
 *   resolvedIngredientId must point to an existing platform ingredient.
 *
 * REJECTED:
 *   Marks request rejected with optional suggestedIngredientId for owner guidance.
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

  if (input.resolvedIngredientId) {
    await assertIngredientExists(input.resolvedIngredientId);
  }

  if (input.suggestedIngredientId) {
    await assertIngredientExists(input.suggestedIngredientId);
  }

  if (input.status === "APPROVED") {
    let resolvedId: string;

    if (input.resolvedIngredientId) {
      // Approve & Edit flow: admin already created the ingredient externally
      resolvedId = input.resolvedIngredientId;
    } else {
      // Auto-create a platform ingredient from request data
      const platformIngredient = await prisma.ingredient.create({
        data: {
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

  const row = await prisma.ingredientRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      resolvedIngredientId: input.suggestedIngredientId ?? null,
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
