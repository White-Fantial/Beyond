import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierCredential: {
      findMany: vi.fn(),
    },
    supplierProduct: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    supplierPriceRecord: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    supplier: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/supplier-scraper/credentialed", () => ({
  credentialedScraper: {
    scrapeWithCredential: vi.fn(),
  },
}));

vi.mock("@/services/owner/owner-supplier-credentials.service", () => ({
  getDecryptedCredential: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { credentialedScraper } from "@/lib/supplier-scraper/credentialed";
import { getDecryptedCredential } from "@/services/owner/owner-supplier-credentials.service";
import {
  recomputeReferencePrice,
  scrapeForUser,
  scrapeAllUsersForProduct,
  getReferencePriceInfo,
} from "@/services/owner/owner-supplier-scraper.service";

const mockPrisma = prisma as unknown as {
  supplierCredential: { findMany: ReturnType<typeof vi.fn> };
  supplierProduct: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  supplierPriceRecord: {
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  supplier: { findFirst: ReturnType<typeof vi.fn> };
};

const mockCredentialedScraper = credentialedScraper as unknown as {
  scrapeWithCredential: ReturnType<typeof vi.fn>;
};
const mockGetDecryptedCredential = getDecryptedCredential as ReturnType<typeof vi.fn>;

const TENANT = "tenant-1";
const USER_A = "user-a";
const USER_B = "user-b";
const PRODUCT_ID = "sp-1";
const CRED_ID_A = "cred-a";
const CRED_ID_B = "cred-b";
const SUP_ID = "sup-1";

const mockProduct = {
  id: PRODUCT_ID,
  supplierId: SUP_ID,
  name: "High Grade Flour 25kg",
  externalUrl: "https://flourco.nz/products/hg-flour-25kg",
  referencePrice: 4500,
  lastScrapedAt: null,
  metadata: {},
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── recomputeReferencePrice ──────────────────────────────────────────────────

describe("recomputeReferencePrice", () => {
  it("sets referencePrice to the maximum of all price records", async () => {
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([
      { observedPrice: 1000 },
      { observedPrice: 1200 },
      { observedPrice: 900 },
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});

    await recomputeReferencePrice(PRODUCT_ID);

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PRODUCT_ID },
        data: expect.objectContaining({ referencePrice: 1200 }),
      })
    );
  });

  it("does nothing when there are no price records", async () => {
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([]);

    await recomputeReferencePrice(PRODUCT_ID);

    expect(mockPrisma.supplierProduct.update).not.toHaveBeenCalled();
  });
});

// ─── scrapeForUser ────────────────────────────────────────────────────────────

describe("scrapeForUser", () => {
  it("returns empty result when user has no credentials", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([]);

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.scraped).toBe(0);
    expect(result.results).toHaveLength(0);
  });

  it("scrapes products and creates SupplierPriceRecord rows (no upsert)", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([
      { id: CRED_ID_A, supplierId: SUP_ID, loginUrl: null, username: "u", passwordEnc: "enc" },
    ]);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { ...mockProduct, externalUrl: "https://flourco.nz/p1" },
    ]);
    mockGetDecryptedCredential.mockResolvedValue({
      username: "u",
      password: "p",
      loginUrl: null,
    });
    mockCredentialedScraper.scrapeWithCredential.mockResolvedValue({
      price: 4800,
      name: "HG Flour",
      currency: "NZD",
      unit: null,
    });
    mockPrisma.supplierPriceRecord.findFirst.mockResolvedValue(null); // no previous record
    mockPrisma.supplierPriceRecord.create.mockResolvedValue({ id: "pr-1" });
    // recomputeReferencePrice
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([{ observedPrice: 4800 }]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4800,
    });

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.scraped).toBe(1);
    expect(result.results[0].observedPrice).toBe(4800);
    expect(result.results[0].newReferencePrice).toBe(4800);
    // Must use create, not upsert
    expect(mockPrisma.supplierPriceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierProductId: PRODUCT_ID,
          tenantId: TENANT,
          observedPrice: 4800,
          source: "SCRAPED",
        }),
      })
    );
  });

  it("tracks previous observed price for change reporting", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([
      { id: CRED_ID_A, supplierId: SUP_ID, loginUrl: null, username: "u", passwordEnc: "enc" },
    ]);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { ...mockProduct, externalUrl: "https://flourco.nz/p1" },
    ]);
    mockGetDecryptedCredential.mockResolvedValue({ username: "u", password: "p", loginUrl: null });
    mockCredentialedScraper.scrapeWithCredential.mockResolvedValue({
      price: 4800, name: null, currency: null, unit: null,
    });
    // Previous record exists
    mockPrisma.supplierPriceRecord.findFirst.mockResolvedValue({ observedPrice: 4200 });
    mockPrisma.supplierPriceRecord.create.mockResolvedValue({ id: "pr-1" });
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([
      { observedPrice: 4200 },
      { observedPrice: 4800 },
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      referencePrice: 4800,
    });

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.results[0].previousObservedPrice).toBe(4200);
    expect(result.results[0].observedPrice).toBe(4800);
  });

  it("skips products with no price returned", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([
      { id: CRED_ID_A, supplierId: SUP_ID, loginUrl: null, username: "u", passwordEnc: "enc" },
    ]);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { ...mockProduct, externalUrl: "https://flourco.nz/p1" },
    ]);
    mockGetDecryptedCredential.mockResolvedValue({ username: "u", password: "p", loginUrl: null });
    mockCredentialedScraper.scrapeWithCredential.mockResolvedValue({
      price: null, name: null, currency: null, unit: null,
    });

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.scraped).toBe(0);
    expect(result.skipped).toBe(1);
    expect(mockPrisma.supplierPriceRecord.create).not.toHaveBeenCalled();
  });

  it("counts failed scrapes without throwing", async () => {
    mockPrisma.supplierCredential.findMany.mockResolvedValue([
      { id: CRED_ID_A, supplierId: SUP_ID, loginUrl: null, username: "u", passwordEnc: "enc" },
    ]);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { ...mockProduct, externalUrl: "https://flourco.nz/p1" },
    ]);
    mockGetDecryptedCredential.mockResolvedValue({ username: "u", password: "p", loginUrl: null });
    mockCredentialedScraper.scrapeWithCredential.mockRejectedValue(new Error("network error"));

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.scraped).toBe(0);
    expect(result.failed).toBe(1);
  });
});

// ─── reference price accumulation across tenants ──────────────────────────────

describe("reference price across multiple tenants", () => {
  it("referencePrice is the max across all tenant price records", async () => {
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([
      { observedPrice: 1000 },
      { observedPrice: 1200 },
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});

    await recomputeReferencePrice(PRODUCT_ID);

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ referencePrice: 1200 }),
      })
    );
  });
});

// ─── scrapeAllUsersForProduct ─────────────────────────────────────────────────

describe("scrapeAllUsersForProduct", () => {
  it("throws if product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(scrapeAllUsersForProduct(TENANT, "missing")).rejects.toThrow("not found");
  });

  it("throws if product has no externalUrl", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      externalUrl: null,
    });

    await expect(scrapeAllUsersForProduct(TENANT, PRODUCT_ID)).rejects.toThrow("no externalUrl");
  });

  it("scrapes for each user and returns updated reference price", async () => {
    mockPrisma.supplierProduct.findFirst
      .mockResolvedValueOnce(mockProduct)
      .mockResolvedValueOnce({ ...mockProduct, referencePrice: 4800 });

    mockPrisma.supplierCredential.findMany
      .mockResolvedValueOnce([
        { id: CRED_ID_A, userId: USER_A },
        { id: CRED_ID_B, userId: USER_B },
      ])
      .mockResolvedValue([]); // return empty for each scrapeForUser call

    const result = await scrapeAllUsersForProduct(TENANT, PRODUCT_ID);

    expect(result.userCount).toBe(2);
    expect(result.newReferencePrice).toBe(4800);
  });
});

// ─── getReferencePriceInfo (and backward-compat alias getBasePriceInfo) ──────

describe("getReferencePriceInfo", () => {
  it("returns reference price info with record count", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      id: PRODUCT_ID,
      referencePrice: 1200,
      lastScrapedAt: new Date("2026-01-15"),
    });
    mockPrisma.supplierPriceRecord.count.mockResolvedValue(3);

    const result = await getReferencePriceInfo(TENANT, PRODUCT_ID);

    expect(result.referencePrice).toBe(1200);
    expect(result.priceRecordCount).toBe(3);
    expect(result.lastScrapedAt).toBe("2026-01-15T00:00:00.000Z");
  });

  it("throws if product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(getReferencePriceInfo(TENANT, "missing")).rejects.toThrow("not found");
  });
});
