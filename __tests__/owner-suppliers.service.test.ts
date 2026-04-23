import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplier: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
    supplierProduct: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    ingredientSupplierLink: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    tenantIngredientSelection: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listAvailableSuppliers,
  getSupplierDetail,
  listSupplierProducts,
  linkIngredientToSupplierProduct,
  unlinkIngredientFromSupplierProduct,
} from "@/services/owner/owner-suppliers.service";

const mockPrisma = prisma as unknown as {
  supplier: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  supplierProduct: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
  };
  ingredientSupplierLink: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  tenantIngredientSelection: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";

const mockPlatformSupplier = {
  id: "sup-platform-1",
  scope: "PLATFORM",
  tenantId: null,
  storeId: null,
  name: "Sysco Foods",
  websiteUrl: "https://sysco.com",
  contactEmail: null,
  contactPhone: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { products: 5 },
};

const mockProduct = {
  id: "sp-1",
  supplierId: "sup-platform-1",
  name: "High Grade Flour 25kg",
  externalUrl: "https://sysco.com/products/hg-flour-25kg",
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

// ─── listAvailableSuppliers ───────────────────────────────────────────────────

describe("listAvailableSuppliers", () => {
  it("returns PLATFORM suppliers", async () => {
    mockPrisma.supplier.findMany.mockResolvedValue([mockPlatformSupplier]);
    mockPrisma.supplier.count.mockResolvedValue(1);

    const result = await listAvailableSuppliers(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].scope).toBe("PLATFORM");
  });
});

// ─── getSupplierDetail ────────────────────────────────────────────────────────

describe("getSupplierDetail", () => {
  it("returns supplier with products", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({
      ...mockPlatformSupplier,
      products: [mockProduct],
    });

    const result = await getSupplierDetail(TENANT, "sup-platform-1");

    expect(result.id).toBe("sup-platform-1");
    expect(result.products).toHaveLength(1);
    expect(result.products[0].referencePrice).toBe(4500);
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(getSupplierDetail(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── listSupplierProducts ─────────────────────────────────────────────────────

describe("listSupplierProducts", () => {
  it("returns products for a supplier", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(mockPlatformSupplier);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([mockProduct]);

    const result = await listSupplierProducts(TENANT, "sup-platform-1");

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("High Grade Flour 25kg");
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(listSupplierProducts(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── linkIngredientToSupplierProduct ─────────────────────────────────────────

const mockLinkRow = {
  id: "link-1",
  ingredientId: "ing-1",
  supplierProductId: "sp-1",
  tenantId: TENANT,
  isPreferred: true,
  createdAt: new Date("2026-01-01"),
  supplierProduct: {
    name: "High Grade Flour 25kg",
    referencePrice: 45000,
    lastScrapedAt: null,
    supplier: { name: "Sysco Foods" },
  },
};

describe("linkIngredientToSupplierProduct", () => {
  it("creates a link between ingredient and supplier product", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue({ id: "sel-1" });
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      supplier: { name: "Sysco Foods" },
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null); // no existing link
    mockPrisma.ingredientSupplierLink.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.ingredientSupplierLink.create.mockResolvedValue(mockLinkRow);

    const result = await linkIngredientToSupplierProduct(
      TENANT,
      "ing-1",
      "sp-1",
      true
    );

    expect(result.isPreferred).toBe(true);
    expect(result.supplierProductName).toBe("High Grade Flour 25kg");
    expect(result.supplierName).toBe("Sysco Foods");
  });

  it("unsets other preferred links when isPreferred = true", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue({ id: "sel-1" });
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      supplier: { name: "Sysco Foods" },
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);
    mockPrisma.ingredientSupplierLink.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.ingredientSupplierLink.create.mockResolvedValue({
      ...mockLinkRow,
      supplierProduct: { name: "X", referencePrice: 0, lastScrapedAt: null, supplier: { name: "Y" } },
    });

    await linkIngredientToSupplierProduct(TENANT, "ing-1", "sp-1", true);

    expect(mockPrisma.ingredientSupplierLink.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ ingredientId: "ing-1", isPreferred: true }),
        data: { isPreferred: false },
      })
    );
  });

  it("allows linking to a PLATFORM supplier product", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue({ id: "sel-1" });
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      supplierId: "sup-platform-1",
      supplier: { name: "Sysco Foods" },
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);
    mockPrisma.ingredientSupplierLink.updateMany.mockResolvedValue({ count: 0 });
    mockPrisma.ingredientSupplierLink.create.mockResolvedValue({
      ...mockLinkRow,
      id: "link-2",
      isPreferred: false,
      supplierProduct: {
        name: "All Purpose Flour",
        referencePrice: 30000,
        lastScrapedAt: null,
        supplier: { name: "Sysco Foods" },
      },
    });

    const result = await linkIngredientToSupplierProduct(TENANT, "ing-1", "sp-1");

    expect(result.supplierName).toBe("Sysco Foods");
  });
});

// ─── unlinkIngredientFromSupplierProduct ─────────────────────────────────────

describe("unlinkIngredientFromSupplierProduct", () => {
  it("deletes the link", async () => {
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue({
      id: "link-1",
      ingredientId: "ing-1",
      tenantId: TENANT,
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
