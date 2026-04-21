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
    supplierPriceRecord: {
      findMany: vi.fn(),
      count: vi.fn(),
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
  recomputeReferencePrice,
  getReferencePriceInfo,
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
  supplierPriceRecord: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const mockGetScraperForUrl = getScraperForUrl as ReturnType<typeof vi.fn>;

const TENANT = "tenant-1";

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

// ─── scrapeSupplierProduct ────────────────────────────────────────────────────

describe("scrapeSupplierProduct", () => {
  it("scrapes a product and updates referencePrice", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4800,
      lastScrapedAt: new Date(),
    });

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
        data: expect.objectContaining({ referencePrice: 4800 }),
      })
    );
  });

  it("marks changed=false when price is unchanged", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({
        name: "HG Flour",
        price: 4500,
        currency: "NZD",
        unit: null,
      }),
    });

    const result = await scrapeSupplierProduct(TENANT, "sp-1");

    expect(result.changed).toBe(false);
    expect(result.newPrice).toBe(4500);
  });

  it("does NOT update ingredient unitCost (pricing moved to supplier price tables)", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4800,
    });

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
    });

    await scrapeSupplierProduct(TENANT, "sp-1");

    // ingredient.update should never be called
    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledTimes(1);
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
      { ...mockProduct, id: "sp-2", externalUrl: null }, // no URL — skip
    ]);

    mockPrisma.supplierProduct.findFirst.mockResolvedValue(mockProduct);
    mockPrisma.supplierProduct.update.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4800,
    });

    mockGetScraperForUrl.mockReturnValue({
      scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
    });

    const results = await scrapeAllSupplierProducts(TENANT, "sup-1");

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

    mockPrisma.supplierProduct.findFirst
      .mockResolvedValueOnce(mockProduct)
      .mockResolvedValueOnce({ ...mockProduct, id: "sp-2", externalUrl: "https://flourco.nz/sp-2" });

    mockPrisma.supplierProduct.update.mockResolvedValue(mockProduct);

    mockGetScraperForUrl
      .mockReturnValueOnce({
        scrape: vi.fn().mockRejectedValue(new Error("Network error")),
      })
      .mockReturnValueOnce({
        scrape: vi.fn().mockResolvedValue({ price: 4800, name: null, currency: null, unit: null }),
      });

    const results = await scrapeAllSupplierProducts(TENANT, "sup-1");

    expect(results).toHaveLength(1);
  });
});

// ─── recomputeReferencePrice ──────────────────────────────────────────────────

describe("recomputeReferencePrice", () => {
  it("sets referencePrice to the MAX of all price records", async () => {
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([
      { observedPrice: 4500 },
      { observedPrice: 6000 },
      { observedPrice: 5200 },
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({ id: "sp-1", referencePrice: 6000 });

    await recomputeReferencePrice("sp-1");

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sp-1" },
        data: expect.objectContaining({ referencePrice: 6000 }),
      })
    );
  });

  it("does nothing when no price records exist", async () => {
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([]);

    await recomputeReferencePrice("sp-1");

    expect(mockPrisma.supplierProduct.update).not.toHaveBeenCalled();
  });
});

// ─── getReferencePriceInfo ────────────────────────────────────────────────────

describe("getReferencePriceInfo", () => {
  it("returns reference price info for a product", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      id: "sp-1",
      referencePrice: 4500,
      lastScrapedAt: new Date("2026-01-15"),
    });
    mockPrisma.supplierPriceRecord.count.mockResolvedValue(3);

    const result = await getReferencePriceInfo(TENANT, "sp-1");

    expect(result.referencePrice).toBe(4500);
    expect(result.priceRecordCount).toBe(3);
    expect(typeof result.lastScrapedAt).toBe("string");
  });

  it("throws if product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(getReferencePriceInfo(TENANT, "missing")).rejects.toThrow("not found");
  });
});
