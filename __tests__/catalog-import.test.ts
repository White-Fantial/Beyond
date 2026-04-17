/**
 * Phase 2: External Catalog Import Foundation — Tests
 *
 * Verifies the core invariants:
 * 1. Import run row is created with status RUNNING then SUCCEEDED/FAILED.
 * 2. Raw snapshots (ExternalCatalogSnapshot) are stored for each entity.
 * 3. Normalised external rows (ExternalCatalog*) are upserted.
 * 4. entityHash is computed and stored on normalised rows.
 * 5. Internal catalog tables (catalog_*) are never touched.
 * 6. Product–modifier-group link rows are upserted.
 * 7. Import run is marked FAILED when the adapter throws.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Prisma mock ──────────────────────────────────────────────────────────────
// vi.mock factories are hoisted, so we MUST NOT reference top-level `const` vars
// inside them.  Use vi.fn() directly inside the factory; grab refs via the
// mocked module after import.

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogImportRun: {
      create: vi.fn(),
      update: vi.fn(),
    },
    externalCatalogSnapshot: {
      create: vi.fn(),
    },
    externalCatalogCategory: {
      upsert: vi.fn(),
    },
    externalCatalogProduct: {
      upsert: vi.fn(),
    },
    externalCatalogModifierGroup: {
      upsert: vi.fn(),
    },
    externalCatalogModifierOption: {
      upsert: vi.fn(),
    },
    externalCatalogProductModifierGroupLink: {
      upsert: vi.fn(),
    },
    // internal catalog tables — must not be written to
    catalogCategory: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    catalogProduct: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    catalogModifierGroup: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
    catalogModifierOption: { create: vi.fn(), update: vi.fn(), findFirst: vi.fn() },
  },
}));

// ─── Adapter mock ─────────────────────────────────────────────────────────────

vi.mock("@/adapters/catalog", () => ({
  createCatalogAdapter: vi.fn(() => ({
    provider: "LOYVERSE",
    fetchFullCatalog: vi.fn(),
  })),
}));

// ─── Import service under test ────────────────────────────────────────────────

import { runFullCatalogImport } from "@/services/catalog-import.service";
import { prisma } from "@/lib/prisma";
import { createCatalogAdapter } from "@/adapters/catalog";

// Typed shortcuts to the mocked prisma tables
type MockedTable = { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> };
const mp = prisma as unknown as Record<string, MockedTable>;

// ─── Test fixtures ────────────────────────────────────────────────────────────

const BASE_INPUT = {
  tenantId: "tenant-1",
  storeId: "store-1",
  connectionId: "conn-1",
  provider: "LOYVERSE",
  credentials: { accessToken: "tok" },
};

const EMPTY_CATALOG = {
  categories: [],
  products: [],
  modifierGroups: [],
  modifierOptions: [],
  productCategoryLinks: [],
  productModifierGroupLinks: [],
};

function makeRun(id = "run-1") {
  return { id, status: "RUNNING" };
}

/** Returns the fetchFullCatalog spy from the mocked adapter. */
function getAdapterSpy() {
  // createCatalogAdapter is mocked; the returned object has fetchFullCatalog as a vi.fn()
  const adapter = (createCatalogAdapter as ReturnType<typeof vi.fn>).mock.results.at(-1)?.value as {
    fetchFullCatalog: ReturnType<typeof vi.fn>;
  } | undefined;
  return adapter?.fetchFullCatalog;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("catalog-import.service — runFullCatalogImport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-create the adapter mock for each test (vi.clearAllMocks clears mock state)
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue(EMPTY_CATALOG),
    });
    mp["catalogImportRun"].create.mockResolvedValue(makeRun());
    mp["catalogImportRun"].update.mockResolvedValue({});
    mp["externalCatalogSnapshot"].create.mockResolvedValue({});
    mp["externalCatalogCategory"].upsert.mockResolvedValue({});
    mp["externalCatalogProduct"].upsert.mockResolvedValue({});
    mp["externalCatalogModifierGroup"].upsert.mockResolvedValue({});
    mp["externalCatalogModifierOption"].upsert.mockResolvedValue({});
    mp["externalCatalogProductModifierGroupLink"].upsert.mockResolvedValue({});
  });

  // ── 1. Import run row creation ─────────────────────────────────────────────

  it("creates a CatalogImportRun row with status RUNNING at start", async () => {
    await runFullCatalogImport(BASE_INPUT);

    expect(mp["catalogImportRun"].create).toHaveBeenCalledOnce();
    const createCall = mp["catalogImportRun"].create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data).toMatchObject({
      tenantId: "tenant-1",
      storeId: "store-1",
      connectionId: "conn-1",
      provider: "LOYVERSE",
      status: "RUNNING",
    });
    expect(createCall.data["startedAt"]).toBeInstanceOf(Date);
  });

  it("updates the import run to SUCCEEDED on success", async () => {
    await runFullCatalogImport(BASE_INPUT);

    expect(mp["catalogImportRun"].update).toHaveBeenCalledOnce();
    const updateCall = mp["catalogImportRun"].update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data["status"]).toBe("SUCCEEDED");
    expect(updateCall.data["completedAt"]).toBeInstanceOf(Date);
  });

  it("returns SUCCEEDED result with correct counts", async () => {
    const result = await runFullCatalogImport(BASE_INPUT);
    expect(result.status).toBe("SUCCEEDED");
    expect(result.importedCategoriesCount).toBe(0);
    expect(result.importedProductsCount).toBe(0);
  });

  // ── 2. Raw snapshot storage ────────────────────────────────────────────────

  it("creates one ExternalCatalogSnapshot per category", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [
          { externalId: "cat-1", raw: { id: "cat-1", name: "Bagels" } },
          { externalId: "cat-2", raw: { id: "cat-2", name: "Drinks" } },
        ],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const snapshotCalls = mp["externalCatalogSnapshot"].create.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    const categoryCalls = snapshotCalls.filter((c) => c[0].data["entityType"] === "CATEGORY");
    expect(categoryCalls).toHaveLength(2);
    expect(categoryCalls[0][0].data["externalEntityId"]).toBe("cat-1");
    expect(categoryCalls[1][0].data["externalEntityId"]).toBe("cat-2");
  });

  it("stores payloadChecksum on snapshot (SHA-256 string)", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "cat-1", raw: { id: "cat-1", name: "Pizza" } }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const snapshotCall = mp["externalCatalogSnapshot"].create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(typeof snapshotCall.data["payloadChecksum"]).toBe("string");
    expect((snapshotCall.data["payloadChecksum"] as string).length).toBe(64); // SHA-256 hex
  });

  it("creates snapshots for products, modifier groups and modifier options", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        products: [{ externalId: "prod-1", raw: { id: "prod-1", item_name: "Latte" }, categoryExternalIds: [], modifierGroupExternalIds: [] }],
        modifierGroups: [{ externalId: "mg-1", raw: { id: "mg-1", name: "Size" } }],
        modifierOptions: [{ externalId: "mo-1", groupExternalId: "mg-1", raw: { id: "mo-1", name: "Large", price: 1.5 } }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const calls = mp["externalCatalogSnapshot"].create.mock.calls as Array<[{ data: Record<string, unknown> }]>;
    const types = calls.map((c) => c[0].data["entityType"] as string);
    expect(types).toContain("PRODUCT");
    expect(types).toContain("MODIFIER_GROUP");
    expect(types).toContain("MODIFIER_OPTION");
  });

  // ── 3. Normalised row upsert ───────────────────────────────────────────────

  it("upserts ExternalCatalogCategory row for each category", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "cat-1", raw: { id: "cat-1", name: "Bagels" } }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    expect(mp["externalCatalogCategory"].upsert).toHaveBeenCalledOnce();
    const call = mp["externalCatalogCategory"].upsert.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(call.create["externalId"]).toBe("cat-1");
    expect(call.create["normalizedName"]).toBe("Bagels");
    expect(call.create["connectionId"]).toBe("conn-1");
  });

  it("upserts ExternalCatalogProduct with normalizedName and normalizedPriceAmount", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        products: [
          {
            externalId: "prod-1",
            raw: { id: "prod-1", item_name: "Espresso", variants: [{ price: 4.5 }] },
            categoryExternalIds: [],
            modifierGroupExternalIds: [],
          },
        ],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    expect(mp["externalCatalogProduct"].upsert).toHaveBeenCalledOnce();
    const call = mp["externalCatalogProduct"].upsert.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(call.create["externalId"]).toBe("prod-1");
    expect(call.create["normalizedName"]).toBe("Espresso");
    expect(call.create["normalizedPriceAmount"]).toBe(450);
  });

  // ── 4. entityHash generation ───────────────────────────────────────────────

  it("sets entityHash on ExternalCatalogCategory (non-empty string)", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "cat-1", raw: { id: "cat-1", name: "Wraps" } }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const call = mp["externalCatalogCategory"].upsert.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(typeof call.create["entityHash"]).toBe("string");
    expect((call.create["entityHash"] as string).length).toBe(64);
  });

  it("sets entityHash on ExternalCatalogProduct", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        products: [
          {
            externalId: "p1",
            raw: { id: "p1", item_name: "Flat White", variants: [{ price: 5.0 }] },
            categoryExternalIds: [],
            modifierGroupExternalIds: [],
          },
        ],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const call = mp["externalCatalogProduct"].upsert.mock.calls[0][0] as { create: Record<string, unknown> };
    expect(typeof call.create["entityHash"]).toBe("string");
    expect((call.create["entityHash"] as string).length).toBe(64);
  });

  it("same entity data always produces the same entityHash (deterministic)", async () => {
    const rawCat = { id: "c1", name: "Salads" };
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "c1", raw: rawCat }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);
    const hash1 = (mp["externalCatalogCategory"].upsert.mock.calls[0][0] as { create: Record<string, unknown> }).create["entityHash"] as string;

    vi.clearAllMocks();
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "c1", raw: rawCat }],
      }),
    });
    mp["catalogImportRun"].create.mockResolvedValue(makeRun("run-2"));
    mp["catalogImportRun"].update.mockResolvedValue({});
    mp["externalCatalogSnapshot"].create.mockResolvedValue({});
    mp["externalCatalogCategory"].upsert.mockResolvedValue({});

    await runFullCatalogImport(BASE_INPUT);
    const hash2 = (mp["externalCatalogCategory"].upsert.mock.calls[0][0] as { create: Record<string, unknown> }).create["entityHash"] as string;

    expect(hash1).toBe(hash2);
  });

  // ── 5. Internal catalog not touched ───────────────────────────────────────

  it("never writes to internal catalog tables", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        categories: [{ externalId: "cat-1", raw: { id: "cat-1", name: "Mains" } }],
        products: [{ externalId: "p1", raw: { id: "p1", item_name: "Burger" }, categoryExternalIds: [], modifierGroupExternalIds: [] }],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    expect(mp["catalogCategory"].create).not.toHaveBeenCalled();
    expect(mp["catalogCategory"].update).not.toHaveBeenCalled();
    expect(mp["catalogProduct"].create).not.toHaveBeenCalled();
    expect(mp["catalogProduct"].update).not.toHaveBeenCalled();
    expect(mp["catalogModifierGroup"].create).not.toHaveBeenCalled();
    expect(mp["catalogModifierOption"].create).not.toHaveBeenCalled();
  });

  // ── 6. Link rows ───────────────────────────────────────────────────────────

  it("upserts product–modifier-group link rows", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        ...EMPTY_CATALOG,
        productModifierGroupLinks: [
          { productExternalId: "p1", groupExternalId: "mg1" },
          { productExternalId: "p1", groupExternalId: "mg2" },
        ],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    expect(mp["externalCatalogProductModifierGroupLink"].upsert).toHaveBeenCalledTimes(2);
  });

  // ── 7. Failure handling ────────────────────────────────────────────────────

  it("marks the run FAILED and returns FAILED status when adapter throws", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockRejectedValue(new Error("API timeout")),
    });

    const result = await runFullCatalogImport(BASE_INPUT);

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toBe("API timeout");

    const updateCall = mp["catalogImportRun"].update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data["status"]).toBe("FAILED");
    expect(updateCall.data["errorMessage"]).toBe("API timeout");
  });

  it("returns the importRunId in all cases", async () => {
    const result = await runFullCatalogImport(BASE_INPUT);
    expect(result.importRunId).toBe("run-1");
  });

  // ── 8. Counts ─────────────────────────────────────────────────────────────

  it("reports accurate entity counts in the import result", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        categories: [
          { externalId: "c1", raw: { name: "A" } },
          { externalId: "c2", raw: { name: "B" } },
        ],
        products: [{ externalId: "p1", raw: { item_name: "X" }, categoryExternalIds: [], modifierGroupExternalIds: [] }],
        modifierGroups: [{ externalId: "mg1", raw: { name: "G" } }],
        modifierOptions: [
          { externalId: "mo1", groupExternalId: "mg1", raw: { name: "O1" } },
          { externalId: "mo2", groupExternalId: "mg1", raw: { name: "O2" } },
        ],
        productCategoryLinks: [],
        productModifierGroupLinks: [],
      }),
    });

    const result = await runFullCatalogImport(BASE_INPUT);

    expect(result.importedCategoriesCount).toBe(2);
    expect(result.importedProductsCount).toBe(1);
    expect(result.importedModifierGroupsCount).toBe(1);
    expect(result.importedModifierOptionsCount).toBe(2);
  });

  it("passes accurate counts to the CatalogImportRun update", async () => {
    (createCatalogAdapter as ReturnType<typeof vi.fn>).mockReturnValue({
      provider: "LOYVERSE",
      fetchFullCatalog: vi.fn().mockResolvedValue({
        categories: [{ externalId: "c1", raw: { name: "A" } }],
        products: [],
        modifierGroups: [],
        modifierOptions: [],
        productCategoryLinks: [],
        productModifierGroupLinks: [],
      }),
    });

    await runFullCatalogImport(BASE_INPUT);

    const updateCall = mp["catalogImportRun"].update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data["importedCategoriesCount"]).toBe(1);
    expect(updateCall.data["importedProductsCount"]).toBe(0);
  });
});
