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
    supplierPriceObservation: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
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
  recomputeBasePrice,
  scrapeForUser,
  scrapeAllUsersForProduct,
  getBasePriceInfo,
} from "@/services/owner/owner-supplier-scraper.service";

const mockPrisma = prisma as unknown as {
  supplierCredential: { findMany: ReturnType<typeof vi.fn> };
  supplierProduct: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  supplierPriceObservation: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
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
  currentPrice: 4500,
  basePrice: 0,
  basePriceUpdatedAt: null,
  basePriceScrapedUserCount: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── recomputeBasePrice ───────────────────────────────────────────────────────

describe("recomputeBasePrice", () => {
  it("sets basePrice to the maximum observed price", async () => {
    mockPrisma.supplierPriceObservation.findMany.mockResolvedValue([
      { observedPrice: 1000 },
      { observedPrice: 1200 },
      { observedPrice: 900 },
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});

    await recomputeBasePrice(PRODUCT_ID);

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: PRODUCT_ID },
        data: expect.objectContaining({
          basePrice: 1200,
          basePriceScrapedUserCount: 3,
        }),
      })
    );
  });

  it("does nothing when there are no observations", async () => {
    mockPrisma.supplierPriceObservation.findMany.mockResolvedValue([]);

    await recomputeBasePrice(PRODUCT_ID);

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

  it("scrapes products linked to user recipes and upserts observations", async () => {
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
    mockPrisma.supplierPriceObservation.findFirst.mockResolvedValue(null);
    mockPrisma.supplierPriceObservation.upsert.mockResolvedValue({});
    // For recomputeBasePrice
    mockPrisma.supplierPriceObservation.findMany.mockResolvedValue([{ observedPrice: 4800 }]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      ...mockProduct,
      basePrice: 4800,
    });

    const result = await scrapeForUser(TENANT, USER_A);

    expect(result.scraped).toBe(1);
    expect(result.results[0].observedPrice).toBe(4800);
    expect(result.results[0].newBasePrice).toBe(4800);
    expect(mockPrisma.supplierPriceObservation.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          supplierProductId: PRODUCT_ID,
          userId: USER_A,
          observedPrice: 4800,
        }),
      })
    );
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

// ─── base price accumulation across users ─────────────────────────────────────

describe("base price across multiple users", () => {
  it("base price becomes the maximum of all user observations", async () => {
    // Simulate user A observes 1000, user B observes 1200
    // After both scrape, recomputeBasePrice should yield 1200
    mockPrisma.supplierPriceObservation.findMany.mockResolvedValue([
      { observedPrice: 1000 }, // user A
      { observedPrice: 1200 }, // user B
    ]);
    mockPrisma.supplierProduct.update.mockResolvedValue({});

    await recomputeBasePrice(PRODUCT_ID);

    expect(mockPrisma.supplierProduct.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ basePrice: 1200 }),
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

  it("scrapes for each user and returns updated base price", async () => {
    mockPrisma.supplierProduct.findFirst
      .mockResolvedValueOnce(mockProduct) // initial lookup
      .mockResolvedValueOnce({ ...mockProduct, basePrice: 4800 }); // after scraping

    mockPrisma.supplierCredential.findMany
      // Called inside scrapeAllUsersForProduct for listing credentials
      .mockResolvedValueOnce([
        { id: CRED_ID_A, userId: USER_A },
        { id: CRED_ID_B, userId: USER_B },
      ])
      // Called inside each scrapeForUser call
      .mockResolvedValue([]);

    const result = await scrapeAllUsersForProduct(TENANT, PRODUCT_ID);

    expect(result.userCount).toBe(2);
    expect(result.newBasePrice).toBe(4800);
  });
});

// ─── getBasePriceInfo ─────────────────────────────────────────────────────────

describe("getBasePriceInfo", () => {
  it("returns base price info with observation count", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({
      id: PRODUCT_ID,
      basePrice: 1200,
      basePriceUpdatedAt: new Date("2026-01-15"),
      basePriceScrapedUserCount: 2,
    });
    mockPrisma.supplierPriceObservation.count.mockResolvedValue(2);

    const result = await getBasePriceInfo(TENANT, PRODUCT_ID);

    expect(result.basePrice).toBe(1200);
    expect(result.basePriceScrapedUserCount).toBe(2);
    expect(result.observationCount).toBe(2);
    expect(result.basePriceUpdatedAt).toBe("2026-01-15T00:00:00.000Z");
  });

  it("throws if product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(getBasePriceInfo(TENANT, "missing")).rejects.toThrow("not found");
  });
});
