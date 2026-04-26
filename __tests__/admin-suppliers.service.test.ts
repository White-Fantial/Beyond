import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplier: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    supplierProduct: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listPlatformSuppliers,
  getPlatformSupplierDetail,
  createPlatformSupplier,
  updatePlatformSupplier,
  deletePlatformSupplier,
  createPlatformSupplierProduct,
  updatePlatformSupplierProduct,
  deletePlatformSupplierProduct,
  importPlatformSupplierProducts,
  normalizeSupplierProductUrl,
} from "@/services/admin/admin-suppliers.service";

const mockPrisma = prisma as unknown as {
  supplier: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  supplierProduct: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const SUP_ID = "sup-1";
const PROD_ID = "prod-1";

const mockPlatformSupplier = {
  id: SUP_ID,
  scope: "PLATFORM",
  tenantId: null,
  storeId: null,
  name: "Sysco Foods",
  websiteUrl: "https://sysco.com",
  contactEmail: "orders@sysco.com",
  contactPhone: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { products: 3 },
};

const mockProduct = {
  id: PROD_ID,
  supplierId: SUP_ID,
  name: "All Purpose Flour 25kg",
  externalUrl: null,
  externalUrlNormalized: null,
  referencePrice: 3500000,
  purchaseQty: 25,
  unit: "KG",
  lastScrapedAt: null,
  metadata: {},
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listPlatformSuppliers ────────────────────────────────────────────────────

describe("listPlatformSuppliers", () => {
  it("returns paginated PLATFORM suppliers", async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([mockPlatformSupplier]);
    mockPrisma.supplier.count.mockResolvedValue(1);

    const result = await listPlatformSuppliers();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].scope).toBe("PLATFORM");
    expect(result.items[0].tenantId).toBeNull();
    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ scope: "PLATFORM", deletedAt: null }),
      })
    );
  });
});

// ─── getPlatformSupplierDetail ────────────────────────────────────────────────

describe("getPlatformSupplierDetail", () => {
  it("returns supplier with products", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      ...mockPlatformSupplier,
      products: [mockProduct],
    });

    const result = await getPlatformSupplierDetail(SUP_ID);

    expect(result.id).toBe(SUP_ID);
    expect(result.scope).toBe("PLATFORM");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].referencePrice).toBe(3500000);
  });

  it("throws when not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(getPlatformSupplierDetail("missing")).rejects.toThrow("not found");
  });
});

// ─── createPlatformSupplier ───────────────────────────────────────────────────

describe("createPlatformSupplier", () => {
  it("creates a PLATFORM supplier with no tenantId/storeId", async () => {
    mockPrisma.supplier.create.mockResolvedValue(mockPlatformSupplier);

    const result = await createPlatformSupplier({
      name: "Sysco Foods",
      websiteUrl: "https://sysco.com",
      contactEmail: "orders@sysco.com",
    });

    expect(result.scope).toBe("PLATFORM");
    expect(result.tenantId).toBeNull();
    expect(result.storeId).toBeNull();
    expect(mockPrisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: "PLATFORM",
          tenantId: null,
          storeId: null,
          name: "Sysco Foods",
        }),
      })
    );
  });

  it("trims whitespace from name", async () => {
    mockPrisma.supplier.create.mockResolvedValue(mockPlatformSupplier);

    await createPlatformSupplier({ name: "  Sysco Foods  " });

    expect(mockPrisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Sysco Foods" }),
      })
    );
  });
});

// ─── updatePlatformSupplier ───────────────────────────────────────────────────

describe("updatePlatformSupplier", () => {
  it("updates supplier name", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplier.update.mockResolvedValue({
      ...mockPlatformSupplier,
      name: "New Name",
    });

    const result = await updatePlatformSupplier(SUP_ID, { name: "New Name" });

    expect(result.name).toBe("New Name");
  });

  it("throws when supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(updatePlatformSupplier("missing", { name: "X" })).rejects.toThrow(
      "not found"
    );
  });
});

// ─── deletePlatformSupplier ───────────────────────────────────────────────────

describe("deletePlatformSupplier", () => {
  it("soft-deletes the supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplier.update.mockResolvedValue({});

    await deletePlatformSupplier(SUP_ID);

    expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: SUP_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(deletePlatformSupplier("missing")).rejects.toThrow("not found");
  });
});

// ─── createPlatformSupplierProduct ───────────────────────────────────────────

describe("createPlatformSupplierProduct", () => {
  it("creates a product for a PLATFORM supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.create.mockResolvedValue(mockProduct);

    const result = await createPlatformSupplierProduct(SUP_ID, {
      name: "All Purpose Flour 25kg",
      referencePrice: 3500000,
      purchaseQty: 25,
      unit: "KG",
    });

    expect(result.name).toBe("All Purpose Flour 25kg");
    expect(result.referencePrice).toBe(3500000);
    expect(result.purchaseQty).toBe(25);
    expect(result.unit).toBe("KG");
  });

  it("defaults purchaseQty to 1 when not provided", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.create.mockResolvedValue({ ...mockProduct, purchaseQty: 1 });

    const result = await createPlatformSupplierProduct(SUP_ID, {
      name: "Salt EACH",
      referencePrice: 500000,
      unit: "EACH",
    });

    expect(result.purchaseQty).toBe(1);
    expect(mockPrisma.supplierProduct.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ purchaseQty: 1 }),
      })
    );
  });

  it("throws when supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(
      createPlatformSupplierProduct("missing", {
        name: "X",
        referencePrice: 0,
        unit: "EACH",
      })
    ).rejects.toThrow("not found");
  });
});

// ─── updatePlatformSupplierProduct ───────────────────────────────────────────

describe("updatePlatformSupplierProduct", () => {
  it("updates product price", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4000000,
    });

    const result = await updatePlatformSupplierProduct(SUP_ID, PROD_ID, {
      referencePrice: 4000000,
    });

    expect(result.referencePrice).toBe(4000000);
  });

  it("updates purchaseQty", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      purchaseQty: 50,
    });

    const result = await updatePlatformSupplierProduct(SUP_ID, PROD_ID, {
      purchaseQty: 50,
    });

    expect(result.purchaseQty).toBe(50);
    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ purchaseQty: 50 }),
      })
    );
  });
});

// ─── deletePlatformSupplierProduct ───────────────────────────────────────────

describe("deletePlatformSupplierProduct", () => {
  it("soft-deletes the product", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({});

    await deletePlatformSupplierProduct(SUP_ID, PROD_ID);

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PROD_ID },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when product not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(deletePlatformSupplierProduct(SUP_ID, "missing")).rejects.toThrow(
      "not found"
    );
  });
});

describe("normalizeSupplierProductUrl", () => {
  it("normalizes protocol defaults, case, hash, and query order", () => {
    const normalized = normalizeSupplierProductUrl(
      "https://EXAMPLE.com:443/products/abc/?b=2&a=1#test"
    );
    expect(normalized).toBe("https://example.com/products/abc?a=1&b=2");
  });
});

describe("importPlatformSupplierProducts", () => {
  it("updates existing product by normalized external URL", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);

    const result = await importPlatformSupplierProducts(SUP_ID, [
      {
        name: "Flour Updated",
        externalUrl: "https://example.com/item?b=2&a=1",
        referencePrice: 100000,
        purchaseQty: 2,
        unit: "KG",
      },
    ]);

    expect(result.updatedCount).toBe(1);
    expect(result.createdCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(mockPrisma.supplierProduct.update).toHaveBeenCalled();
  });

  it("creates when URL match does not exist", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);
    mockPrisma.supplierProduct.create.mockResolvedValue(mockProduct);

    const result = await importPlatformSupplierProducts(SUP_ID, [
      {
        name: "New Product",
        externalUrl: "https://example.com/new",
        referencePrice: 100000,
        purchaseQty: 1,
        unit: "EACH",
      },
    ]);

    expect(result.createdCount).toBe(1);
    expect(result.updatedCount).toBe(0);
    expect(result.failedCount).toBe(0);
  });

  it("creates when URL matches but purchase unit/qty differs", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);
    mockPrisma.supplierProduct.create.mockResolvedValue(mockProduct);

    const result = await importPlatformSupplierProducts(SUP_ID, [
      {
        name: "Flour Carton",
        externalUrl: "https://example.com/item?b=2&a=1",
        referencePrice: 700000,
        purchaseQty: 1,
        unit: "EACH",
      },
    ]);

    expect(result.createdCount).toBe(1);
    expect(result.updatedCount).toBe(0);
  });
});
