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
    ingredientSupplierLink: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
    },
    ingredient: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listSuppliers,
  getSupplierDetail,
  createSupplier,
  updateSupplier,
  deleteSupplier,
  listSupplierProducts,
  createSupplierProduct,
  linkIngredientToSupplierProduct,
  unlinkIngredientFromSupplierProduct,
} from "@/services/owner/owner-suppliers.service";

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
  ingredientSupplierLink: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  ingredient: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";
const STORE = "store-1";

const mockSupplier = {
  id: "sup-1",
  tenantId: TENANT,
  storeId: STORE,
  name: "Flour Co",
  websiteUrl: "https://flourco.nz",
  contactEmail: "orders@flourco.nz",
  contactPhone: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { products: 2 },
};

const mockProduct = {
  id: "sp-1",
  supplierId: "sup-1",
  name: "High Grade Flour 25kg",
  externalUrl: "https://flourco.nz/products/hg-flour-25kg",
  referencePrice: 4500,
  unit: "KG",
  lastScrapedAt: null,
  metadata: {},
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listSuppliers ────────────────────────────────────────────────────────────

describe("listSuppliers", () => {
  it("returns paginated suppliers with product counts", async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([mockSupplier]);
    mockPrisma.supplier.count.mockResolvedValue(1);

    const result = await listSuppliers(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Flour Co");
    expect(result.items[0].productCount).toBe(2);
  });

  it("filters by storeId", async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([]);
    mockPrisma.supplier.count.mockResolvedValue(0);

    await listSuppliers(TENANT, { storeId: STORE });

    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: STORE }),
      })
    );
  });

  it("excludes soft-deleted suppliers", async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([]);
    mockPrisma.supplier.count.mockResolvedValue(0);

    await listSuppliers(TENANT);

    expect(mockPrisma.supplier.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });
});

// ─── getSupplierDetail ────────────────────────────────────────────────────────

describe("getSupplierDetail", () => {
  it("returns supplier with products", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      ...mockSupplier,
      products: [mockProduct],
    });

    const result = await getSupplierDetail(TENANT, "sup-1");

    expect(result.id).toBe("sup-1");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].referencePrice).toBe(4500);
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(getSupplierDetail(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── createSupplier ───────────────────────────────────────────────────────────

describe("createSupplier", () => {
  it("creates a supplier", async () => {
    mockPrisma.supplier.create.mockResolvedValue(mockSupplier);

    const result = await createSupplier(TENANT, {
      storeId: STORE,
      name: "Flour Co",
      websiteUrl: "https://flourco.nz",
    });

    expect(result.name).toBe("Flour Co");
    expect(mockPrisma.supplier.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tenantId: TENANT, storeId: STORE }),
      })
    );
  });
});

// ─── updateSupplier ───────────────────────────────────────────────────────────

describe("updateSupplier", () => {
  it("updates supplier name", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplier.update.mockResolvedValue({
      ...mockSupplier,
      name: "New Name",
    });

    const result = await updateSupplier(TENANT, "sup-1", { name: "New Name" });

    expect(result.name).toBe("New Name");
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(
      updateSupplier(TENANT, "missing", { name: "X" })
    ).rejects.toThrow("not found");
  });
});

// ─── deleteSupplier ───────────────────────────────────────────────────────────

describe("deleteSupplier", () => {
  it("soft-deletes the supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplier.update.mockResolvedValue({
      ...mockSupplier,
      deletedAt: new Date(),
    });

    await deleteSupplier(TENANT, "sup-1");

    expect(mockPrisma.supplier.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sup-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(deleteSupplier(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── listSupplierProducts ─────────────────────────────────────────────────────

describe("listSupplierProducts", () => {
  it("returns products for a supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([mockProduct]);

    const result = await listSupplierProducts(TENANT, "sup-1");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("High Grade Flour 25kg");
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(listSupplierProducts(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── createSupplierProduct ────────────────────────────────────────────────────

describe("createSupplierProduct", () => {
  it("creates a product for a supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockSupplier);
    mockPrisma.supplierProduct.create.mockResolvedValue(mockProduct);

    const result = await createSupplierProduct(TENANT, "sup-1", {
      name: "High Grade Flour 25kg",
      externalUrl: "https://flourco.nz/products/hg-flour-25kg",
      unit: "KG",
    });

    expect(result.referencePrice).toBe(4500);
    expect(result.unit).toBe("KG");
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(
      createSupplierProduct(TENANT, "missing", {
        name: "X",
        unit: "EACH",
      })
    ).rejects.toThrow("not found");
  });
});

// ─── linkIngredientToSupplierProduct ─────────────────────────────────────────

describe("linkIngredientToSupplierProduct", () => {
  it("creates a link between ingredient and supplier product", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue({
      id: "ing-1",
      tenantId: TENANT,
    });
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      supplier: { name: "Flour Co" },
    });
    mockPrisma.ingredientSupplierLink.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.ingredientSupplierLink.upsert.mockResolvedValue({
      id: "link-1",
      ingredientId: "ing-1",
      supplierProductId: "sp-1",
      isPreferred: true,
      createdAt: new Date("2026-01-01"),
      supplierProduct: {
        name: "High Grade Flour 25kg",
        supplier: { name: "Flour Co" },
      },
    });

    const result = await linkIngredientToSupplierProduct(
      TENANT,
      "ing-1",
      "sp-1",
      true
    );

    expect(result.isPreferred).toBe(true);
    expect(result.supplierProductName).toBe("High Grade Flour 25kg");
    expect(result.supplierName).toBe("Flour Co");
  });

  it("unsets other preferred links when isPreferred = true", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue({ id: "ing-1", tenantId: TENANT });
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      supplier: { name: "Flour Co" },
    });
    mockPrisma.ingredientSupplierLink.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ingredientSupplierLink.upsert.mockResolvedValue({
      id: "link-1",
      ingredientId: "ing-1",
      supplierProductId: "sp-1",
      isPreferred: true,
      createdAt: new Date("2026-01-01"),
      supplierProduct: { name: "X", supplier: { name: "Y" } },
    });

    await linkIngredientToSupplierProduct(TENANT, "ing-1", "sp-1", true);

    expect(mockPrisma.ingredientSupplierLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ingredientId: "ing-1", isPreferred: true }),
        data: { isPreferred: false },
      })
    );
  });
});

// ─── unlinkIngredientFromSupplierProduct ─────────────────────────────────────

describe("unlinkIngredientFromSupplierProduct", () => {
  it("deletes the link", async () => {
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue({
      id: "link-1",
      ingredientId: "ing-1",
    });
    mockPrisma.ingredientSupplierLink.delete.mockResolvedValue({ id: "link-1" });

    await unlinkIngredientFromSupplierProduct(TENANT, "link-1");

    expect(mockPrisma.ingredientSupplierLink.delete).toHaveBeenCalledWith({
      where: { id: "link-1" },
    });
  });

  it("throws if link not found", async () => {
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    await expect(
      unlinkIngredientFromSupplierProduct(TENANT, "missing")
    ).rejects.toThrow("not found");
  });
});
