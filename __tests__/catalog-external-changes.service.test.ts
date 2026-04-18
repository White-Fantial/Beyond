/**
 * Phase 5: External Change Detection Service — Tests
 *
 * Tests cover:
 *   1. Compare functions (pure functions — no mocks)
 *      1a. Category field diffs
 *      1b. Product field diffs
 *      1c. Modifier group field diffs
 *      1d. Modifier option field diffs
 *      1e. Link diffs (category links, modifier group links)
 *   2. Service orchestration (created / updated / deleted detection)
 *      - CREATED when entity appears in current but not previous run
 *      - UPDATED when entityHash changes with field diffs
 *      - DELETED when entity in previous run is absent in current
 *      - unchanged when hash is the same
 *   3. Structure diff tests
 *      - category link add/remove
 *      - modifier group link add/remove
 *   4. Mapping linkage tests
 *      - mapped entity gets internalEntityId linked
 *      - unmapped entity has null internalEntityId
 *   5. API endpoint tests (module-level mocks)
 *      - detect, list, summary, getOne, acknowledge, ignore
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Compare functions (pure) ──────────────────────────────────────────────

import { compareCategoryFields } from "@/services/external-change-detection/compare-category";
import { compareProductFields } from "@/services/external-change-detection/compare-product";
import { compareModifierGroupFields } from "@/services/external-change-detection/compare-modifier-group";
import { compareModifierOptionFields } from "@/services/external-change-detection/compare-modifier-option";
import { compareCategoryLinks, compareModifierGroupLinks } from "@/services/external-change-detection/compare-links";

// 1a. Category
describe("compareCategoryFields", () => {
  it("returns empty when nothing changed", () => {
    const snap = { normalizedName: "Coffee", rawPayload: {} };
    expect(compareCategoryFields(snap, snap)).toHaveLength(0);
  });

  it("detects name change", () => {
    const prev = { normalizedName: "Coffee", rawPayload: {} };
    const curr = { normalizedName: "Hot Coffee", rawPayload: {} };
    const diffs = compareCategoryFields(prev, curr);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fieldPath).toBe("name");
    expect(diffs[0].previousValue).toBe("Coffee");
    expect(diffs[0].currentValue).toBe("Hot Coffee");
    expect(diffs[0].changeType).toBe("VALUE_CHANGED");
  });

  it("detects sortOrder change", () => {
    const prev = { normalizedName: "Coffee", rawPayload: { sort_order: 1 } };
    const curr = { normalizedName: "Coffee", rawPayload: { sort_order: 5 } };
    const diffs = compareCategoryFields(prev, curr);
    expect(diffs.some((d) => d.fieldPath === "sortOrder")).toBe(true);
  });

  it("detects isActive change", () => {
    const prev = { normalizedName: "Coffee", rawPayload: { is_active: true } };
    const curr = { normalizedName: "Coffee", rawPayload: { is_active: false } };
    const diffs = compareCategoryFields(prev, curr);
    expect(diffs.some((d) => d.fieldPath === "isActive")).toBe(true);
  });
});

// 1b. Product
describe("compareProductFields", () => {
  const base = { normalizedName: "Latte", normalizedPriceAmount: 500, rawPayload: {} };

  it("returns empty when nothing changed", () => {
    expect(compareProductFields(base, base)).toHaveLength(0);
  });

  it("detects name change", () => {
    const curr = { ...base, normalizedName: "Iced Latte" };
    const diffs = compareProductFields(base, curr);
    expect(diffs[0].fieldPath).toBe("name");
    expect(diffs[0].previousValue).toBe("Latte");
    expect(diffs[0].currentValue).toBe("Iced Latte");
  });

  it("detects price change", () => {
    const curr = { ...base, normalizedPriceAmount: 700 };
    const diffs = compareProductFields(base, curr);
    expect(diffs[0].fieldPath).toBe("priceAmount");
    expect(diffs[0].previousValue).toBe(500);
    expect(diffs[0].currentValue).toBe(700);
    expect(diffs[0].changeType).toBe("VALUE_CHANGED");
  });

  it("detects isActive when added", () => {
    const prev = { ...base, rawPayload: {} };
    const curr = { ...base, rawPayload: { is_active: false } };
    const diffs = compareProductFields(prev, curr);
    const d = diffs.find((x) => x.fieldPath === "isActive");
    expect(d).toBeDefined();
    expect(d?.changeType).toBe("ADDED");
  });
});

// 1c. Modifier group
describe("compareModifierGroupFields", () => {
  const base = { normalizedName: "Size", rawPayload: {} };

  it("returns empty when nothing changed", () => {
    expect(compareModifierGroupFields(base, base)).toHaveLength(0);
  });

  it("detects name change", () => {
    const curr = { normalizedName: "Drink Size", rawPayload: {} };
    const diffs = compareModifierGroupFields(base, curr);
    expect(diffs[0].fieldPath).toBe("name");
  });

  it("detects minSelect change", () => {
    const prev = { normalizedName: "Size", rawPayload: { min_select: 1 } };
    const curr = { normalizedName: "Size", rawPayload: { min_select: 0 } };
    const diffs = compareModifierGroupFields(prev, curr);
    expect(diffs.some((d) => d.fieldPath === "minSelect")).toBe(true);
  });

  it("detects maxSelect change", () => {
    const prev = { normalizedName: "Size", rawPayload: { max_select: 3 } };
    const curr = { normalizedName: "Size", rawPayload: { max_select: 5 } };
    const diffs = compareModifierGroupFields(prev, curr);
    expect(diffs.some((d) => d.fieldPath === "maxSelect")).toBe(true);
  });
});

// 1d. Modifier option
describe("compareModifierOptionFields", () => {
  const base = {
    normalizedName: "Small",
    normalizedPriceAmount: 0,
    externalParentId: "group-1",
    rawPayload: {},
  };

  it("returns empty when nothing changed", () => {
    expect(compareModifierOptionFields(base, base)).toHaveLength(0);
  });

  it("detects name change", () => {
    const curr = { ...base, normalizedName: "S" };
    const diffs = compareModifierOptionFields(base, curr);
    expect(diffs[0].fieldPath).toBe("name");
  });

  it("detects price change", () => {
    const curr = { ...base, normalizedPriceAmount: 100 };
    const diffs = compareModifierOptionFields(base, curr);
    expect(diffs[0].fieldPath).toBe("priceAmount");
  });

  it("detects parent group change with PARENT_CHANGED type", () => {
    const curr = { ...base, externalParentId: "group-2" };
    const diffs = compareModifierOptionFields(base, curr);
    const d = diffs.find((x) => x.fieldPath === "groupExternalId");
    expect(d).toBeDefined();
    expect(d?.changeType).toBe("PARENT_CHANGED");
    expect(d?.previousValue).toBe("group-1");
    expect(d?.currentValue).toBe("group-2");
  });
});

// 1e. Link diffs
describe("compareCategoryLinks", () => {
  it("detects added category link", () => {
    const diffs = compareCategoryLinks(["cat-1"], ["cat-1", "cat-2"]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].changeType).toBe("ADDED");
    expect(diffs[0].currentValue).toBe("cat-2");
  });

  it("detects removed category link", () => {
    const diffs = compareCategoryLinks(["cat-1", "cat-2"], ["cat-1"]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].changeType).toBe("REMOVED");
    expect(diffs[0].previousValue).toBe("cat-2");
  });

  it("returns empty when links are same", () => {
    expect(compareCategoryLinks(["cat-1"], ["cat-1"])).toHaveLength(0);
  });
});

describe("compareModifierGroupLinks", () => {
  it("detects added modifier group link", () => {
    const diffs = compareModifierGroupLinks([], ["mg-1"]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].fieldPath).toBe("modifierGroupLinks");
    expect(diffs[0].changeType).toBe("ADDED");
  });

  it("detects removed modifier group link", () => {
    const diffs = compareModifierGroupLinks(["mg-1", "mg-2"], ["mg-1"]);
    expect(diffs).toHaveLength(1);
    expect(diffs[0].changeType).toBe("REMOVED");
  });
});

// ─── 2-4. Service tests (mocked prisma) ───────────────────────────────────────

vi.mock("@/lib/prisma", () => {
  const catalogImportRun = {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  };
  const externalCatalogChange = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    updateMany: vi.fn(),
    update: vi.fn(),
  };
  const externalCatalogChangeField = {
    createMany: vi.fn(),
  };
  const externalCatalogCategory = {
    findMany: vi.fn(),
  };
  const externalCatalogProduct = {
    findMany: vi.fn(),
  };
  const externalCatalogModifierGroup = {
    findMany: vi.fn(),
  };
  const externalCatalogModifierOption = {
    findMany: vi.fn(),
  };
  const externalCatalogProductModifierGroupLink = {
    findMany: vi.fn(),
  };
  const channelEntityMapping = {
    findFirst: vi.fn(),
  };

  return {
    prisma: {
      catalogImportRun,
      externalCatalogChange,
      externalCatalogChangeField,
      externalCatalogCategory,
      externalCatalogProduct,
      externalCatalogModifierGroup,
      externalCatalogModifierOption,
      externalCatalogProductModifierGroupLink,
      channelEntityMapping,
    },
  };
});

import { prisma } from "@/lib/prisma";
import {
  detectExternalChangesForImportRun,
  listExternalChanges,
  getExternalChangeSummary,
  getExternalChange,
  acknowledgeExternalChange,
  ignoreExternalChange,
} from "@/services/external-change-detection.service";

const mockPrisma = prisma as unknown as {
  catalogImportRun: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  externalCatalogChange: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  externalCatalogChangeField: {
    createMany: ReturnType<typeof vi.fn>;
  };
  externalCatalogCategory: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogProduct: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogModifierGroup: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogModifierOption: { findMany: ReturnType<typeof vi.fn> };
  externalCatalogProductModifierGroupLink: { findMany: ReturnType<typeof vi.fn> };
  channelEntityMapping: { findFirst: ReturnType<typeof vi.fn> };
};

const NOW = new Date("2026-04-18T00:00:00Z");

const makeImportRun = (id: string, connectionId = "conn-1", startedAt = NOW) => ({
  id,
  connectionId,
  tenantId: "tenant-1",
  storeId: "store-1",
  provider: "LOYVERSE",
  status: "SUCCEEDED",
  startedAt,
  completedAt: startedAt,
});

function resetMocks() {
  mockPrisma.catalogImportRun.findUnique.mockResolvedValue(null);
  mockPrisma.catalogImportRun.findFirst.mockResolvedValue(null);
  mockPrisma.catalogImportRun.update.mockResolvedValue({});
  mockPrisma.externalCatalogChange.findMany.mockResolvedValue([]);
  mockPrisma.externalCatalogChange.findUnique.mockResolvedValue(null);
  mockPrisma.externalCatalogChange.create.mockResolvedValue({ id: "change-1" });
  mockPrisma.externalCatalogChange.createMany.mockResolvedValue({});
  mockPrisma.externalCatalogChange.updateMany.mockResolvedValue({});
  mockPrisma.externalCatalogChange.update.mockResolvedValue({ id: "change-1" });
  mockPrisma.externalCatalogChangeField.createMany.mockResolvedValue({});
  mockPrisma.externalCatalogCategory.findMany.mockResolvedValue([]);
  mockPrisma.externalCatalogProduct.findMany.mockResolvedValue([]);
  mockPrisma.externalCatalogModifierGroup.findMany.mockResolvedValue([]);
  mockPrisma.externalCatalogModifierOption.findMany.mockResolvedValue([]);
  mockPrisma.externalCatalogProductModifierGroupLink.findMany.mockResolvedValue([]);
  mockPrisma.channelEntityMapping.findFirst.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetMocks();
});

// ── 2. CREATED / UPDATED / DELETED ───────────────────────────────────────────

describe("detectExternalChangesForImportRun — importRun not found", () => {
  it("returns FAILED when importRun not found", async () => {
    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(null);

    const result = await detectExternalChangesForImportRun({ importRunId: "missing" });

    expect(result.diffStatus).toBe("FAILED");
    expect(result.errorMessage).toMatch(/not found/i);
  });
});

describe("detectExternalChangesForImportRun — first import (no previous run)", () => {
  it("marks all entities as CREATED", async () => {
    const run = makeImportRun("run-1");
    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(run);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(null); // no previous

    mockPrisma.externalCatalogCategory.findMany.mockResolvedValue([
      { externalId: "cat-1", normalizedName: "Coffee", entityHash: "h1", importRunId: "run-1" },
    ]);

    const result = await detectExternalChangesForImportRun({ importRunId: "run-1" });

    expect(result.diffStatus).toBe("SUCCEEDED");
    expect(result.created).toBe(1);
    expect(result.comparedImportRunId).toBeNull();
    expect(mockPrisma.externalCatalogChange.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ changeKind: "CREATED" }) })
    );
  });
});

describe("detectExternalChangesForImportRun — CREATED detection", () => {
  it("marks new entities as CREATED when absent from previous run", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    // prev: no categories; curr: 1 category
    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([{ externalId: "cat-1", normalizedName: "Coffee", entityHash: "h1", importRunId: "run-curr", rawPayload: {} }])
      .mockResolvedValueOnce([]); // prev

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(result.created).toBeGreaterThanOrEqual(1);
  });
});

describe("detectExternalChangesForImportRun — DELETED detection", () => {
  it("marks entity as DELETED when missing from current run", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    // prev: 1 category; curr: none
    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([]) // curr
      .mockResolvedValueOnce([{ externalId: "cat-1", normalizedName: "Coffee", entityHash: "h1", importRunId: "run-prev", rawPayload: {} }]); // prev

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(result.deleted).toBeGreaterThanOrEqual(1);
    expect(mockPrisma.externalCatalogChange.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ changeKind: "DELETED" }) })
    );
  });
});

describe("detectExternalChangesForImportRun — UPDATED detection", () => {
  it("marks entity as UPDATED when hash changes", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    const prev = { externalId: "cat-1", normalizedName: "Coffee", entityHash: "hash-a", importRunId: "run-prev", rawPayload: {} };
    const curr = { externalId: "cat-1", normalizedName: "Hot Coffee", entityHash: "hash-b", importRunId: "run-curr", rawPayload: {} };

    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([curr])  // curr
      .mockResolvedValueOnce([prev]); // prev

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(result.updated).toBeGreaterThanOrEqual(1);
    expect(mockPrisma.externalCatalogChange.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ changeKind: "UPDATED" }) })
    );
  });

  it("does not create change when hash is unchanged", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    const sameRow = { externalId: "cat-1", normalizedName: "Coffee", entityHash: "hash-a", importRunId: "run-prev", rawPayload: {} };

    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([{ ...sameRow, importRunId: "run-curr" }])
      .mockResolvedValueOnce([sameRow]);

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(result.unchanged).toBeGreaterThanOrEqual(1);
    // Should not have created any change record (no diff)
    expect(mockPrisma.externalCatalogChange.create).not.toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ changeKind: "UPDATED" }) })
    );
  });
});

// ── 3. Structure diff ─────────────────────────────────────────────────────────

describe("detectExternalChangesForImportRun — structure changes", () => {
  it("detects category link addition for a product", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    const prevProd = { externalId: "prod-1", normalizedName: "Latte", normalizedPriceAmount: 500, entityHash: "hash-a", importRunId: "run-prev", externalParentId: "cat-1", rawPayload: {} };
    const currProd = { externalId: "prod-1", normalizedName: "Latte", normalizedPriceAmount: 500, entityHash: "hash-a", importRunId: "run-curr", externalParentId: "cat-2", rawPayload: {} };

    mockPrisma.externalCatalogCategory.findMany.mockResolvedValue([]);
    mockPrisma.externalCatalogProduct.findMany
      .mockResolvedValueOnce([currProd])
      .mockResolvedValueOnce([prevProd]);
    // No mg links
    mockPrisma.externalCatalogProductModifierGroupLink.findMany.mockResolvedValue([]);

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    // Category parent changed → STRUCTURE_UPDATED
    expect(result.structureUpdated).toBeGreaterThanOrEqual(1);
  });

  it("detects modifier group link removal for a product", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    const prod = { externalId: "prod-1", normalizedName: "Latte", normalizedPriceAmount: 500, entityHash: "hash-a", importRunId: "run-curr", externalParentId: null, rawPayload: {} };

    mockPrisma.externalCatalogCategory.findMany.mockResolvedValue([]);
    mockPrisma.externalCatalogProduct.findMany
      .mockResolvedValueOnce([prod])
      .mockResolvedValueOnce([{ ...prod, importRunId: "run-prev" }]);

    // prev: 1 mg link; curr: none
    mockPrisma.externalCatalogProductModifierGroupLink.findMany
      .mockResolvedValueOnce([]) // curr links
      .mockResolvedValueOnce([{ externalProductId: "prod-1", externalModifierGroupId: "mg-1" }]); // prev links

    const result = await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(result.structureUpdated).toBeGreaterThanOrEqual(1);
  });
});

// ── 4. Mapping linkage ────────────────────────────────────────────────────────

describe("detectExternalChangesForImportRun — mapping linkage", () => {
  it("links internalEntityId when active mapping exists", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);

    // ACTIVE mapping for the category
    mockPrisma.channelEntityMapping.findFirst.mockResolvedValue({
      id: "mapping-1",
      internalEntityId: "internal-cat-1",
    });

    const prev = { externalId: "cat-1", normalizedName: "Coffee", entityHash: "hash-a", importRunId: "run-prev", rawPayload: {} };
    const curr = { externalId: "cat-1", normalizedName: "Hot Coffee", entityHash: "hash-b", importRunId: "run-curr", rawPayload: {} };

    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([curr])
      .mockResolvedValueOnce([prev]);

    await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(mockPrisma.externalCatalogChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          internalEntityId: "internal-cat-1",
          mappingId: "mapping-1",
        }),
      })
    );
  });

  it("sets internalEntityId to null when no mapping exists", async () => {
    const prevRun = makeImportRun("run-prev", "conn-1", new Date("2026-04-17T00:00:00Z"));
    const currRun = makeImportRun("run-curr", "conn-1", NOW);

    mockPrisma.catalogImportRun.findUnique.mockResolvedValue(currRun);
    mockPrisma.catalogImportRun.findFirst.mockResolvedValue(prevRun);
    mockPrisma.channelEntityMapping.findFirst.mockResolvedValue(null);

    const curr = { externalId: "cat-1", normalizedName: "Coffee", entityHash: "h1", importRunId: "run-curr", rawPayload: {} };
    mockPrisma.externalCatalogCategory.findMany
      .mockResolvedValueOnce([curr])
      .mockResolvedValueOnce([]);

    await detectExternalChangesForImportRun({ importRunId: "run-curr" });

    expect(mockPrisma.externalCatalogChange.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ internalEntityId: null }),
      })
    );
  });
});

// ── 5. Service read / status functions ───────────────────────────────────────

describe("listExternalChanges", () => {
  it("returns mapped DTO list", async () => {
    const fakeChange = {
      id: "change-1",
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      entityType: "CATEGORY",
      externalEntityId: "cat-1",
      internalEntityId: null,
      mappingId: null,
      changeKind: "CREATED",
      status: "OPEN",
      previousEntityHash: null,
      currentEntityHash: "h1",
      importRunId: "run-1",
      comparedImportRunId: null,
      summary: "Created",
      detectedAt: new Date(),
      acknowledgedAt: null,
      ignoredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      fieldDiffs: [],
    };
    mockPrisma.externalCatalogChange.findMany.mockResolvedValue([fakeChange]);

    const result = await listExternalChanges({ connectionId: "conn-1" });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("change-1");
    expect(result[0].changeKind).toBe("CREATED");
  });
});

describe("getExternalChangeSummary", () => {
  it("returns summary with counts", async () => {
    mockPrisma.externalCatalogChange.findMany.mockResolvedValue([
      { entityType: "CATEGORY", changeKind: "CREATED", internalEntityId: null },
      { entityType: "PRODUCT", changeKind: "UPDATED", internalEntityId: "int-1" },
      { entityType: "PRODUCT", changeKind: "DELETED", internalEntityId: null },
    ]);

    const summary = await getExternalChangeSummary("conn-1");

    expect(summary.totalOpen).toBe(3);
    expect(summary.created).toBe(1);
    expect(summary.updated).toBe(1);
    expect(summary.deleted).toBe(1);
    expect(summary.mapped).toBe(1);
    expect(summary.unmapped).toBe(2);
  });
});

describe("acknowledgeExternalChange", () => {
  it("sets status to ACKNOWLEDGED", async () => {
    const fakeChange = {
      id: "change-1",
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      entityType: "CATEGORY",
      externalEntityId: "cat-1",
      internalEntityId: null,
      mappingId: null,
      changeKind: "CREATED",
      status: "ACKNOWLEDGED",
      previousEntityHash: null,
      currentEntityHash: "h1",
      importRunId: "run-1",
      comparedImportRunId: null,
      summary: null,
      detectedAt: new Date(),
      acknowledgedAt: new Date(),
      ignoredAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      fieldDiffs: [],
    };
    mockPrisma.externalCatalogChange.update.mockResolvedValue(fakeChange);

    const result = await acknowledgeExternalChange("change-1");

    expect(result?.status).toBe("ACKNOWLEDGED");
    expect(mockPrisma.externalCatalogChange.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACKNOWLEDGED" }),
      })
    );
  });
});

describe("ignoreExternalChange", () => {
  it("sets status to IGNORED", async () => {
    const fakeChange = {
      id: "change-1",
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      entityType: "CATEGORY",
      externalEntityId: "cat-1",
      internalEntityId: null,
      mappingId: null,
      changeKind: "UPDATED",
      status: "IGNORED",
      previousEntityHash: "h0",
      currentEntityHash: "h1",
      importRunId: "run-1",
      comparedImportRunId: "run-prev",
      summary: null,
      detectedAt: new Date(),
      acknowledgedAt: null,
      ignoredAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      fieldDiffs: [],
    };
    mockPrisma.externalCatalogChange.update.mockResolvedValue(fakeChange);

    const result = await ignoreExternalChange("change-1");

    expect(result?.status).toBe("IGNORED");
  });
});

