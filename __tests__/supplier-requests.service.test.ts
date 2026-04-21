import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createSupplierRequest,
  listSupplierRequests,
  getTenantSupplierRequests,
  getSupplierRequest,
  reviewSupplierRequest,
} from "@/services/marketplace/supplier-requests.service";

const mockPrisma = prisma as unknown as {
  supplierRequest: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const MODERATOR_ID = "mod-1";
const REQUEST_ID = "req-1";
const SUPPLIER_ID = "sup-1";

const mockRow = {
  id: REQUEST_ID,
  requestedByUserId: USER_ID,
  tenantId: TENANT_ID,
  name: "Premium Foods Ltd",
  websiteUrl: "https://premiumfoods.com",
  contactEmail: "orders@premiumfoods.com",
  contactPhone: null,
  notes: "Main flour supplier",
  status: "PENDING",
  resolvedSupplierId: null,
  reviewedByUserId: null,
  reviewNotes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  requestedBy: { name: "John Owner" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createSupplierRequest ────────────────────────────────────────────────────

describe("createSupplierRequest", () => {
  it("creates a PENDING request with trimmed fields", async () => {
    mockPrisma.supplierRequest.create.mockResolvedValue(mockRow);

    const result = await createSupplierRequest(USER_ID, TENANT_ID, {
      name: "  Premium Foods Ltd  ",
      websiteUrl: "https://premiumfoods.com",
      contactEmail: "orders@premiumfoods.com",
      notes: "Main flour supplier",
    });

    expect(result.name).toBe("Premium Foods Ltd");
    expect(result.status).toBe("PENDING");
    expect(result.requestedByName).toBe("John Owner");
    expect(result.tenantId).toBe(TENANT_ID);
    expect(mockPrisma.supplierRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedByUserId: USER_ID,
          tenantId: TENANT_ID,
          name: "Premium Foods Ltd",
          status: "PENDING",
        }),
      })
    );
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.supplierRequest.create.mockResolvedValue(mockRow);

    const result = await createSupplierRequest(USER_ID, TENANT_ID, {
      name: "Some Supplier",
    });

    expect(typeof result.createdAt).toBe("string");
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── listSupplierRequests ─────────────────────────────────────────────────────

describe("listSupplierRequests", () => {
  it("returns paginated results", async () => {
    mockPrisma.supplierRequest.findMany.mockResolvedValue([mockRow]);
    mockPrisma.supplierRequest.count.mockResolvedValue(1);

    const result = await listSupplierRequests();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Premium Foods Ltd");
  });

  it("filters by status", async () => {
    mockPrisma.supplierRequest.findMany.mockResolvedValue([]);
    mockPrisma.supplierRequest.count.mockResolvedValue(0);

    await listSupplierRequests({ status: "PENDING" });

    expect(mockPrisma.supplierRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("filters by tenantId", async () => {
    mockPrisma.supplierRequest.findMany.mockResolvedValue([]);
    mockPrisma.supplierRequest.count.mockResolvedValue(0);

    await listSupplierRequests({ tenantId: TENANT_ID });

    expect(mockPrisma.supplierRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT_ID }),
      })
    );
  });
});

// ─── getTenantSupplierRequests ────────────────────────────────────────────────

describe("getTenantSupplierRequests", () => {
  it("returns only requests for the given tenant", async () => {
    mockPrisma.supplierRequest.findMany.mockResolvedValue([mockRow]);
    mockPrisma.supplierRequest.count.mockResolvedValue(1);

    const result = await getTenantSupplierRequests(TENANT_ID);

    expect(result.items).toHaveLength(1);
    expect(mockPrisma.supplierRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
      })
    );
  });
});

// ─── getSupplierRequest ───────────────────────────────────────────────────────

describe("getSupplierRequest", () => {
  it("returns the request", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);

    const result = await getSupplierRequest(REQUEST_ID);

    expect(result.id).toBe(REQUEST_ID);
    expect(result.name).toBe("Premium Foods Ltd");
  });

  it("throws when not found", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(null);

    await expect(getSupplierRequest("nonexistent")).rejects.toThrow(
      "SupplierRequest nonexistent not found"
    );
  });
});

// ─── reviewSupplierRequest ────────────────────────────────────────────────────

describe("reviewSupplierRequest", () => {
  it("approves a PENDING request with resolvedSupplierId", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.supplierRequest.update.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
      resolvedSupplierId: SUPPLIER_ID,
      reviewedByUserId: MODERATOR_ID,
      reviewNotes: "Created platform supplier",
    });

    const result = await reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, {
      status: "APPROVED",
      resolvedSupplierId: SUPPLIER_ID,
      reviewNotes: "Created platform supplier",
    });

    expect(result.status).toBe("APPROVED");
    expect(result.resolvedSupplierId).toBe(SUPPLIER_ID);
    expect(mockPrisma.supplierRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          resolvedSupplierId: SUPPLIER_ID,
          reviewedByUserId: MODERATOR_ID,
        }),
      })
    );
  });

  it("rejects a PENDING request without resolvedSupplierId", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.supplierRequest.update.mockResolvedValue({
      ...mockRow,
      status: "REJECTED",
      reviewedByUserId: MODERATOR_ID,
      reviewNotes: "Already covered by Sysco",
    });

    const result = await reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, {
      status: "REJECTED",
      reviewNotes: "Already covered by Sysco",
    });

    expect(result.status).toBe("REJECTED");
  });

  it("marks as DUPLICATE with resolvedSupplierId", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.supplierRequest.update.mockResolvedValue({
      ...mockRow,
      status: "DUPLICATE",
      resolvedSupplierId: SUPPLIER_ID,
      reviewedByUserId: MODERATOR_ID,
    });

    const result = await reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, {
      status: "DUPLICATE",
      resolvedSupplierId: SUPPLIER_ID,
    });

    expect(result.status).toBe("DUPLICATE");
    expect(result.resolvedSupplierId).toBe(SUPPLIER_ID);
  });

  it("throws when request not found", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(null);

    await expect(
      reviewSupplierRequest("nonexistent", MODERATOR_ID, { status: "REJECTED" })
    ).rejects.toThrow("SupplierRequest nonexistent not found");
  });

  it("throws when request already reviewed", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
    });

    await expect(
      reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, { status: "REJECTED" })
    ).rejects.toThrow("has already been reviewed");
  });

  it("throws when APPROVED without resolvedSupplierId", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);

    await expect(
      reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, { status: "APPROVED" })
    ).rejects.toThrow("resolvedSupplierId is required");
  });

  it("throws when DUPLICATE without resolvedSupplierId", async () => {
    mockPrisma.supplierRequest.findUnique.mockResolvedValue(mockRow);

    await expect(
      reviewSupplierRequest(REQUEST_ID, MODERATOR_ID, { status: "DUPLICATE" })
    ).rejects.toThrow("resolvedSupplierId is required");
  });
});
