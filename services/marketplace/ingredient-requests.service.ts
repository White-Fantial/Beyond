/**
 * Ingredient Request Service — Marketplace Phase 6.
 *
 * Handles user-submitted requests to add new ingredients to the platform
 * catalogue (hybrid Option B + background-request approach).
 *
 * Any authenticated user can submit a request.
 * PLATFORM_ADMIN and PLATFORM_MODERATOR can list all requests and review them.
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
  name: string;
  description: string | null;
  category: string | null;
  unit: string;
  notes: string | null;
  status: string;
  resolvedPlatformIngredientId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { name: string } | null;
};

function toRequest(row: RawRequest): IngredientRequest {
  return {
    id: row.id,
    requestedByUserId: row.requestedByUserId,
    requestedByName: row.requestedBy?.name ?? "",
    name: row.name,
    description: row.description,
    category: row.category,
    unit: row.unit,
    notes: row.notes,
    status: row.status as IngredientRequestStatus,
    resolvedPlatformIngredientId: row.resolvedPlatformIngredientId,
    reviewedByUserId: row.reviewedByUserId,
    reviewNotes: row.reviewNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/** Submit a new ingredient request. Any authenticated user may call this. */
export async function createIngredientRequest(
  requestedByUserId: string,
  input: CreateIngredientRequestInput
): Promise<IngredientRequest> {
  const row = await prisma.ingredientRequest.create({
    data: {
      requestedByUserId,
      name: input.name.trim(),
      description: input.description?.trim() ?? null,
      category: input.category?.trim() ?? null,
      unit: (input.unit ?? "GRAM") as IngredientUnit,
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
      include: { requestedBy: { select: { name: true } } },
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

/** Get the ingredient requests submitted by a specific user. */
export async function getUserIngredientRequests(
  requestedByUserId: string,
  page = 1,
  pageSize = 50
): Promise<IngredientRequestListResult> {
  const where = { requestedByUserId };

  const [rows, total] = await Promise.all([
    prisma.ingredientRequest.findMany({
      where,
      include: { requestedBy: { select: { name: true } } },
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
    include: { requestedBy: { select: { name: true } } },
  });
  if (!row) throw new Error(`IngredientRequest ${id} not found`);
  return toRequest(row as RawRequest);
}

/**
 * Review an ingredient request (moderator / admin action).
 *
 * - APPROVED: resolvedPlatformIngredientId must point to the newly created
 *   (or existing) PlatformIngredient that satisfies the request.
 * - DUPLICATE: resolvedPlatformIngredientId must point to the existing ingredient.
 * - REJECTED: no resolvedPlatformIngredientId required.
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

  if (
    (input.status === "APPROVED" || input.status === "DUPLICATE") &&
    !input.resolvedPlatformIngredientId
  ) {
    throw new Error(
      "resolvedPlatformIngredientId is required when approving or marking as duplicate"
    );
  }

  const row = await prisma.ingredientRequest.update({
    where: { id },
    data: {
      status: input.status,
      resolvedPlatformIngredientId: input.resolvedPlatformIngredientId ?? null,
      reviewedByUserId,
      reviewNotes: input.reviewNotes?.trim() ?? null,
    },
    include: { requestedBy: { select: { name: true } } },
  });

  return toRequest(row as RawRequest);
}
