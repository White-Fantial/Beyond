import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierProduct: {
      findFirst: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
    },
    ingredientSupplierLink: {
      findFirst: vi.fn(),
    },
    ingredient: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supplier-scraper", () => ({
  getScraperForUrl: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { getScraperForUrl } from "@/lib/supplier-scraper";
import {
  scrapeSupplierProduct,
  scrapeAllSupplierProducts,
} from "@/services/owner/owner-supplier-scraper.service";

const mockPrisma = prisma as unknown as {
  supplierProduct: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  supplier: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  ingredientSupplierLink: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  ingredient: {
    update: ReturnType<typeof vi.fn>;
  };
};

const mockGetScraperForUrl = getScraperForUrl as ReturnType<typeof vi.fn>;

const TENANT = "tenant-1";

const mockProduct = {
  id: "sp-1",
  supplierId: "sup-1",
  name: "High Grade Flour 25kg",
  externalUrl: "https://flourco.nz/products/hg-flour-25kg",
  currentPrice: 4500,
  unit: "KG",
  lastScrapedAt: null,
  metadata: {},
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── scrapeSupplierProduct ────────────────────────────────────────────────────

describe("scrapeSupplierProduct", () => {
  it("scrapes a product and updates its price", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      currentPrice: 4800,
      lastScrapedAt: new Date(),
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({
        name: "HG Flour",
        price: 4800,
        currency: "NZD",
        unit: null,
      }),
    });

    const result = await scrapeSupplierProduct(TENANT, "sp-1");

    expect(result.previousPrice).toBe(4500);
    expect(result.newPrice).toBe(4800);
    expect(result.changed).toBe(true);
    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp-1" },
        data: expect.objectContaining({ currentPrice: 4800 }),
      })
    );
  });

  it("marks changed=false when price is unchanged", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({
        name: "HG Flour",
        price: 4500, // same as currentPrice
        currency: "NZD",
        unit: null,
      }),
    });

    const result = await scrapeSupplierProduct(TENANT, "sp-1");

    expect(result.changed).toBe(false);
    expect(result.newPrice).toBe(4500);
  });

  it("updates preferred ingredient unitCost when price changes", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      currentPrice: 4800,
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue({
      id: "link-1",
      ingredientId: "ing-1",
      supplierProductId: "sp-1",
      isPreferred: true,
    });
    mockPrisma.ingredient.update.mockResolvedValue({ id: "ing-1" });

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
    });

    await scrapeSupplierProduct(TENANT, "sp-1");

    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ing-1" },
        data: { unitCost: 4800 },
      })
    );
  });

  it("does not update ingredient when price is unchanged", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({ price: 4500, name: null, currency: null, unit: null }),
    });

    await scrapeSupplierProduct(TENANT, "sp-1");

    expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
  });

  it("throws when product has no externalUrl", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      externalUrl: null,
    });

    await expect(scrapeSupplierProduct(TENANT, "sp-1")).rejects.toThrow(
      "no externalUrl"
    );
  });

  it("throws when product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(scrapeSupplierProduct(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── scrapeAllSupplierProducts ────────────────────────────────────────────────

describe("scrapeAllSupplierProducts", () => {
  it("scrapes all products with externalUrls", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({ id: "sup-1", tenantId: TENANT });
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      mockProduct,
      { ...mockProduct, id: "sp-2", externalUrl: null }, // no URL — should skip
    ]);

    // For the first product
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      currentPrice: 4800,
    });
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
    });

    const results = await scrapeAllSupplierProducts(TENANT, "sup-1");

    // Only 1 result because sp-2 has no URL
    expect(results).toHaveLength(1);
  });

  it("throws if supplier not found", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue(null);

    await expect(scrapeAllSupplierProducts(TENANT, "missing")).rejects.toThrow("not found");
  });

  it("continues scraping remaining products even if one fails", async () => {
    mockPrisma.supplier.findFirst.mockResolvedValue({ id: "sup-1", tenantId: TENANT });
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      mockProduct,
      { ...mockProduct, id: "sp-2", externalUrl: "https://flourco.nz/sp-2" },
    ]);

    // First call throws, second succeeds
    mockPrisma.supplierProduct.findFirst
      .mockResolvedValueOnce(mockProduct) // sp-1
      .mockResolvedValueOnce({ ...mockProduct, id: "sp-2", externalUrl: "https://flourco.nz/sp-2" });

    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);
    mockPrisma.ingredientSupplierLink.findFirst.mockResolvedValue(null);

    mockGetScraperForUrl
      .mockReturnValueOnce({
        scrape: vi.fn().mockRejectedValue(new Error("Network error")),
      })
      .mockReturnValueOnce({
        scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
      });

    const results = await scrapeAllSupplierProducts(TENANT, "sup-1");

    // Only the successful scrape is returned
    expect(results).toHaveLength(1);
  });
});
