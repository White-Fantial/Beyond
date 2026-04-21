/**
 * Supplier Request Service — Platform Supplier Management.
 *
 * Handles owner-submitted requests to add new suppliers to the platform catalogue.
 * Any authenticated owner (tenant-scoped) can submit a request.
 * PLATFORM_ADMIN and PLATFORM_MODERATOR can list all requests and review them.
 */
import { prisma } from "@/lib/prisma";
import type {
  SupplierRequest,
  SupplierRequestListResult,
  CreateSupplierRequestInput,
  ReviewSupplierRequestInput,
  SupplierRequestFilters,
  SupplierRequestStatus,
} from "@/types/owner-suppliers";

// ─── Helpers ──────────────────────────────────────────────────────────────────

type RawRequest = {
  id: string;
  requestedByUserId: string;
  tenantId: string;
  name: string;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  notes: string | null;
  status: string;
  resolvedSupplierId: string | null;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
  requestedBy?: { name: string } | null;
};

function toRequest(row: RawRequest): SupplierRequest {
  return {
    id: row.id,
    requestedByUserId: row.requestedByUserId,
    requestedByName: row.requestedBy?.name ?? "",
    tenantId: row.tenantId,
    name: row.name,
    websiteUrl: row.websiteUrl,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    notes: row.notes,
    status: row.status as SupplierRequestStatus,
    resolvedSupplierId: row.resolvedSupplierId,
    reviewedByUserId: row.reviewedByUserId,
    reviewNotes: row.reviewNotes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

/** Submit a new supplier request. Any authenticated owner may call this. */
export async function createSupplierRequest(
  requestedByUserId: string,
  tenantId: string,
  input: CreateSupplierRequestInput
): Promise<SupplierRequest> {
  const row = await prisma.supplierRequest.create({
    data: {
      requestedByUserId,
      tenantId,
      name: input.name.trim(),
      websiteUrl: input.websiteUrl?.trim() ?? null,
      contactEmail: input.contactEmail?.trim() ?? null,
      contactPhone: input.contactPhone?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      status: "PENDING",
    },
    include: { requestedBy: { select: { name: true } } },
  });

  return toRequest(row as RawRequest);
}

/** List all supplier requests (moderator / admin view). Optionally filter by tenant. */
export async function listSupplierRequests(
  filters: SupplierRequestFilters = {}
): Promise<SupplierRequestListResult> {
  const { status, tenantId, page = 1, pageSize = 50 } = filters;

  const where = {
    ...(status !== undefined ? { status } : {}),
    ...(tenantId !== undefined ? { tenantId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.supplierRequest.findMany({
      where,
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplierRequest.count({ where }),
  ]);

  return {
    items: (rows as unknown as RawRequest[]).map(toRequest),
    total,
    page,
    pageSize,
  };
}

/** Get the supplier requests submitted by owners within a specific tenant. */
export async function getTenantSupplierRequests(
  tenantId: string,
  page = 1,
  pageSize = 50
): Promise<SupplierRequestListResult> {
  const where = { tenantId };

  const [rows, total] = await Promise.all([
    prisma.supplierRequest.findMany({
      where,
      include: { requestedBy: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.supplierRequest.count({ where }),
  ]);

  return {
    items: (rows as unknown as RawRequest[]).map(toRequest),
    total,
    page,
    pageSize,
  };
}

/** Get a single supplier request by id. */
export async function getSupplierRequest(id: string): Promise<SupplierRequest> {
  const row = await prisma.supplierRequest.findUnique({
    where: { id },
    include: { requestedBy: { select: { name: true } } },
  });
  if (!row) throw new Error(`SupplierRequest ${id} not found`);
  return toRequest(row as RawRequest);
}

/**
 * Review a supplier request (moderator / admin action).
 *
 * - APPROVED: resolvedSupplierId must point to the PLATFORM supplier that satisfies the request.
 * - DUPLICATE: resolvedSupplierId must point to the existing PLATFORM supplier.
 * - REJECTED: no resolvedSupplierId required.
 */
export async function reviewSupplierRequest(
  id: string,
  reviewedByUserId: string,
  input: ReviewSupplierRequestInput
): Promise<SupplierRequest> {
  const existing = await prisma.supplierRequest.findUnique({ where: { id } });
  if (!existing) throw new Error(`SupplierRequest ${id} not found`);
  if (existing.status !== "PENDING") {
    throw new Error(
      `SupplierRequest ${id} has already been reviewed (status: ${existing.status})`
    );
  }

  if (
    (input.status === "APPROVED" || input.status === "DUPLICATE") &&
    !input.resolvedSupplierId
  ) {
    throw new Error(
      "resolvedSupplierId is required when approving or marking as duplicate"
    );
  }

  const row = await prisma.supplierRequest.update({
    where: { id },
    data: {
      status: input.status,
      resolvedSupplierId: input.resolvedSupplierId ?? null,
      reviewedByUserId,
      reviewNotes: input.reviewNotes?.trim() ?? null,
    },
    include: { requestedBy: { select: { name: true } } },
  });

  return toRequest(row as RawRequest);
}
