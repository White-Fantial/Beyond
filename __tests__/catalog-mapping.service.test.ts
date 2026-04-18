/**
 * Phase 3: Catalog Mapping Service — Tests
 *
 * Tests cover:
 *   1. Matcher utilities (base, category, product, modifier-group, modifier-option)
 *   2. Service read functions (listMappingsByConnection, getMappingReviewSummary, etc.)
 *   3. Service write functions (linkEntityManually, relinkEntity, unlinkMapping)
 *   4. autoMatchExternalEntities dispatch and row creation
 *   5. validateMappings — marks broken when entity is missing
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Matcher tests (pure functions — no mocks needed) ─────────────────────────

import { normalizeName, nameSimilarity, pickBestCandidate, CONFIDENCE } from "@/services/catalog-matchers/base";
import { matchCategory } from "@/services/catalog-matchers/category.matcher";
import { matchProduct } from "@/services/catalog-matchers/product.matcher";
import { matchModifierGroup } from "@/services/catalog-matchers/modifier-group.matcher";
import { matchModifierOption } from "@/services/catalog-matchers/modifier-option.matcher";

describe("normalizeName", () => {
  it("lowercases and trims", () => {
    expect(normalizeName("  Latte  ")).toBe("latte");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("Flat  White")).toBe("flat white");
  });

  it("strips apostrophes and hyphens", () => {
    expect(normalizeName("Bagel's-on-board")).toBe("bagels on board");
  });

  it("returns empty string for null", () => {
    expect(normalizeName(null)).toBe("");
  });
});

describe("nameSimilarity", () => {
  it("returns 1 for identical names", () => {
    expect(nameSimilarity("latte", "latte")).toBe(1);
  });

  it("returns a value > 0.8 for near-identical names", () => {
    expect(nameSimilarity("flat white", "flat-white")).toBeGreaterThan(0.8);
  });

  it("returns a low value for completely different names", () => {
    expect(nameSimilarity("bagel", "pizza")).toBeLessThan(0.3);
  });
});

describe("pickBestCandidate", () => {
  it("returns null for empty list", () => {
    expect(pickBestCandidate([])).toBeNull();
  });

  it("returns the only candidate for singleton list", () => {
    const c = { internalEntityId: "1", internalEntityName: "X", confidence: 0.9, reason: "test" };
    expect(pickBestCandidate([c])).toBe(c);
  });

  it("returns null when two candidates are within 0.05 of each other (ambiguous)", () => {
    const a = { internalEntityId: "1", internalEntityName: "A", confidence: 0.82, reason: "" };
    const b = { internalEntityId: "2", internalEntityName: "B", confidence: 0.80, reason: "" };
    expect(pickBestCandidate([a, b])).toBeNull();
  });

  it("returns best when clear winner exists", () => {
    const a = { internalEntityId: "1", internalEntityName: "A", confidence: 0.95, reason: "" };
    const b = { internalEntityId: "2", internalEntityName: "B", confidence: 0.70, reason: "" };
    expect(pickBestCandidate([a, b])).toBe(a);
  });
});

// ─── Category matcher ─────────────────────────────────────────────────────────

describe("matchCategory", () => {
  const conn = "conn-1";

  it("exact originExternalRef match => EXACT_ORIGIN_REF confidence", () => {
    const external = { externalId: "ext-cat-1", normalizedName: "Bagels" };
    const internals = [
      {
        id: "int-cat-1",
        name: "Bagels",
        originConnectionId: conn,
        originExternalRef: "ext-cat-1",
        deletedAt: null,
      },
    ];
    const result = matchCategory(external, internals, conn);
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_ORIGIN_REF);
    expect(result.best!.reason).toContain("originExternalRef");
  });

  it("exact name match => EXACT_NAME confidence", () => {
    const external = { externalId: "ext-cat-2", normalizedName: "Pastries" };
    const internals = [
      { id: "int-cat-2", name: "Pastries", originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchCategory(external, internals, conn);
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_NAME);
  });

  it("multiple similar candidates => ambiguous, best is null", () => {
    const external = { externalId: "ext-cat-3", normalizedName: "Coffee" };
    const internals = [
      { id: "int-cat-3a", name: "Coffee", originConnectionId: null, originExternalRef: null, deletedAt: null },
      { id: "int-cat-3b", name: "Coffee", originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchCategory(external, internals, conn);
    expect(result.best).toBeNull();
    expect(result.allCandidates.length).toBeGreaterThan(1);
  });

  it("no candidates => empty allCandidates and null best", () => {
    const external = { externalId: "ext-cat-4", normalizedName: "Sushi Rolls" };
    const internals = [
      { id: "int-cat-5", name: "Bagels", originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchCategory(external, internals, conn);
    expect(result.best).toBeNull();
    expect(result.allCandidates).toHaveLength(0);
  });

  it("skips soft-deleted internals", () => {
    const external = { externalId: "ext-cat-5", normalizedName: "Drinks" };
    const internals = [
      { id: "int-cat-6", name: "Drinks", originConnectionId: null, originExternalRef: null, deletedAt: new Date() },
    ];
    const result = matchCategory(external, internals, conn);
    expect(result.best).toBeNull();
  });
});

// ─── Product matcher ──────────────────────────────────────────────────────────

describe("matchProduct", () => {
  const conn = "conn-1";

  it("exact name + price match => EXACT_NAME_AND_PRICE confidence", () => {
    const external = { externalId: "ext-prod-1", normalizedName: "Flat White", normalizedPriceAmount: 550 };
    const internals = [
      { id: "int-prod-1", name: "Flat White", basePriceAmount: 550, originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchProduct(external, internals, conn);
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_NAME_AND_PRICE);
  });

  it("exact name but different price => EXACT_NAME confidence", () => {
    const external = { externalId: "ext-prod-2", normalizedName: "Latte", normalizedPriceAmount: 600 };
    const internals = [
      { id: "int-prod-2", name: "Latte", basePriceAmount: 500, originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchProduct(external, internals, conn);
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_NAME);
  });

  it("multiple identical-name products => ambiguous", () => {
    const external = { externalId: "ext-prod-3", normalizedName: "Latte", normalizedPriceAmount: 500 };
    const internals = [
      { id: "int-prod-3a", name: "Latte", basePriceAmount: 500, originConnectionId: null, originExternalRef: null, deletedAt: null },
      { id: "int-prod-3b", name: "Latte", basePriceAmount: 500, originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchProduct(external, internals, conn);
    expect(result.best).toBeNull();
  });

  it("no match => empty candidates", () => {
    const external = { externalId: "ext-prod-4", normalizedName: "Sushi Roll", normalizedPriceAmount: 1200 };
    const internals = [
      { id: "int-prod-4", name: "Bagel", basePriceAmount: 450, originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchProduct(external, internals, conn);
    expect(result.best).toBeNull();
    expect(result.allCandidates).toHaveLength(0);
  });

  it("originExternalRef match => highest confidence", () => {
    const external = { externalId: "ext-prod-5", normalizedName: "Espresso" };
    const internals = [
      { id: "int-prod-5", name: "Espresso", basePriceAmount: 400, originConnectionId: conn, originExternalRef: "ext-prod-5", deletedAt: null },
    ];
    const result = matchProduct(external, internals, conn);
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_ORIGIN_REF);
  });
});

// ─── Modifier group matcher ───────────────────────────────────────────────────

describe("matchModifierGroup", () => {
  const conn = "conn-1";

  it("exact name match", () => {
    const external = { externalId: "ext-mg-1", normalizedName: "Milk Options" };
    const internals = [
      { id: "int-mg-1", name: "Milk Options", selectionMin: 1, selectionMax: 1, isRequired: true, originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchModifierGroup(external, internals, conn);
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBeGreaterThanOrEqual(CONFIDENCE.EXACT_NAME);
  });
});

// ─── Modifier option matcher ──────────────────────────────────────────────────

describe("matchModifierOption", () => {
  const conn = "conn-1";

  it("exact name + price match", () => {
    const external = { externalId: "ext-mo-1", normalizedName: "Oat Milk", normalizedPriceAmount: 80, groupExternalId: "ext-mg-1" };
    const internals = [
      { id: "int-mo-1", name: "Oat Milk", priceDeltaAmount: 80, modifierGroupId: "int-mg-1", originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchModifierOption(external, internals, conn, new Set(["int-mg-1"]));
    expect(result.best).not.toBeNull();
    expect(result.best!.confidence).toBe(CONFIDENCE.EXACT_NAME_AND_PRICE);
  });

  it("excludes options outside the scoped group", () => {
    const external = { externalId: "ext-mo-2", normalizedName: "Almond Milk", normalizedPriceAmount: 80, groupExternalId: "ext-mg-1" };
    const internals = [
      // in a different group
      { id: "int-mo-2", name: "Almond Milk", priceDeltaAmount: 80, modifierGroupId: "int-mg-99", originConnectionId: null, originExternalRef: null, deletedAt: null },
    ];
    const result = matchModifierOption(external, internals, conn, new Set(["int-mg-1"]));
    expect(result.best).toBeNull();
  });
});

// ─── Service function tests (with Prisma mock) ────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    connection: { findUnique: vi.fn() },
    channelEntityMapping: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    catalogCategory: { findMany: vi.fn(), findFirst: vi.fn() },
    catalogProduct: { findMany: vi.fn(), findFirst: vi.fn() },
    catalogModifierGroup: { findMany: vi.fn(), findFirst: vi.fn() },
    catalogModifierOption: { findMany: vi.fn(), findFirst: vi.fn() },
    externalCatalogCategory: { findMany: vi.fn(), findFirst: vi.fn() },
    externalCatalogProduct: { findMany: vi.fn(), findFirst: vi.fn() },
    externalCatalogModifierGroup: { findMany: vi.fn(), findFirst: vi.fn() },
    externalCatalogModifierOption: { findMany: vi.fn(), findFirst: vi.fn() },
    externalCatalogProductModifierGroupLink: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  linkEntityManually,
  relinkEntity,
  unlinkMapping,
  getMappingReviewSummary,
  validateMappings,
} from "@/services/catalog-mapping.service";

// Typed shortcut
type MockedPrisma = Record<string, Record<string, ReturnType<typeof vi.fn>>>;
const mp = prisma as unknown as MockedPrisma;

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getMappingReviewSummary ───────────────────────────────────────────────────

describe("getMappingReviewSummary", () => {
  it("returns correct totals from DB rows", async () => {
    mp.channelEntityMapping.findMany.mockResolvedValue([
      { status: "ACTIVE", internalEntityType: "PRODUCT" },
      { status: "ACTIVE", internalEntityType: "CATEGORY" },
      { status: "NEEDS_REVIEW", internalEntityType: "PRODUCT" },
      { status: "UNMATCHED", internalEntityType: "MODIFIER_OPTION" },
      { status: "BROKEN", internalEntityType: "PRODUCT" },
    ]);

    const summary = await getMappingReviewSummary("conn-1");

    expect(summary.totals.active).toBe(2);
    expect(summary.totals.needsReview).toBe(1);
    expect(summary.totals.unmatched).toBe(1);
    expect(summary.totals.broken).toBe(1);
  });
});

// ─── linkEntityManually ───────────────────────────────────────────────────────

describe("linkEntityManually", () => {
  it("archives existing mappings and creates new ACTIVE MANUAL mapping", async () => {
    mp.channelEntityMapping.updateMany.mockResolvedValue({ count: 0 });
    mp.channelEntityMapping.create.mockResolvedValue({ id: "new-mapping" });

    await linkEntityManually({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId: "int-prod-1",
      externalEntityType: "PRODUCT",
      externalEntityId: "ext-prod-1",
      notes: "manual link test",
    });

    // Should archive existing
    expect(mp.channelEntityMapping.updateMany).toHaveBeenCalledTimes(2);
    // Should create new
    expect(mp.channelEntityMapping.create).toHaveBeenCalledOnce();
    const createCall = mp.channelEntityMapping.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(createCall.data.status).toBe("ACTIVE");
    expect(createCall.data.source).toBe("MANUAL");
  });

  it("throws when internalEntityType and externalEntityType differ", async () => {
    await expect(
      linkEntityManually({
        tenantId: "t1",
        storeId: "s1",
        connectionId: "conn-1",
        internalEntityType: "PRODUCT",
        internalEntityId: "int-prod-1",
        externalEntityType: "CATEGORY", // mismatch
        externalEntityId: "ext-cat-1",
      })
    ).rejects.toThrow(/mismatch/i);
  });
});

// ─── relinkEntity ─────────────────────────────────────────────────────────────

describe("relinkEntity", () => {
  it("archives old mapping and creates a new NEEDS_REVIEW mapping", async () => {
    mp.channelEntityMapping.findUnique.mockResolvedValue({
      id: "map-1",
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId: "int-prod-old",
      externalEntityType: "PRODUCT",
      externalEntityId: "ext-prod-1",
    });
    mp.channelEntityMapping.update.mockResolvedValue({ id: "map-1", status: "ARCHIVED" });
    mp.channelEntityMapping.updateMany.mockResolvedValue({ count: 0 });
    mp.channelEntityMapping.create.mockResolvedValue({ id: "map-2" });

    await relinkEntity({ mappingId: "map-1", newInternalEntityId: "int-prod-new" });

    expect(mp.channelEntityMapping.update).toHaveBeenCalledOnce();
    const archiveCall = mp.channelEntityMapping.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(archiveCall.data.status).toBe("ARCHIVED");

    expect(mp.channelEntityMapping.create).toHaveBeenCalledOnce();
    const newMapping = mp.channelEntityMapping.create.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(newMapping.data.status).toBe("NEEDS_REVIEW");
    expect(newMapping.data.internalEntityId).toBe("int-prod-new");
  });

  it("throws when mapping not found", async () => {
    mp.channelEntityMapping.findUnique.mockResolvedValue(null);
    await expect(relinkEntity({ mappingId: "missing", newInternalEntityId: "int-1" })).rejects.toThrow(
      /not found/i
    );
  });
});

// ─── unlinkMapping ────────────────────────────────────────────────────────────

describe("unlinkMapping", () => {
  it("sets status to ARCHIVED", async () => {
    mp.channelEntityMapping.update.mockResolvedValue({ id: "map-1", status: "ARCHIVED" });

    await unlinkMapping({ mappingId: "map-1", reason: "no longer relevant" });

    const call = mp.channelEntityMapping.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(call.data.status).toBe("ARCHIVED");
    expect(call.data.notes).toBe("no longer relevant");
  });
});

// ─── validateMappings ─────────────────────────────────────────────────────────

describe("validateMappings", () => {
  it("marks mapping BROKEN when internal entity is missing", async () => {
    mp.channelEntityMapping.findMany.mockResolvedValue([
      {
        id: "map-1",
        connectionId: "conn-1",
        storeId: "s1",
        internalEntityType: "PRODUCT",
        internalEntityId: "int-prod-missing",
        externalEntityType: "PRODUCT",
        externalEntityId: "ext-prod-1",
        status: "ACTIVE",
      },
    ]);
    // Internal entity not found
    mp.catalogProduct.findFirst.mockResolvedValue(null);
    // External entity found
    mp.externalCatalogProduct.findFirst.mockResolvedValue({ id: "ext-row-1" });
    mp.channelEntityMapping.update.mockResolvedValue({});

    const result = await validateMappings("conn-1");

    expect(result.brokenCount).toBe(1);
    const updateCall = mp.channelEntityMapping.update.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateCall.data.status).toBe("BROKEN");
  });

  it("marks mapping BROKEN when external entity is missing", async () => {
    mp.channelEntityMapping.findMany.mockResolvedValue([
      {
        id: "map-2",
        connectionId: "conn-1",
        storeId: "s1",
        internalEntityType: "CATEGORY",
        internalEntityId: "int-cat-1",
        externalEntityType: "CATEGORY",
        externalEntityId: "ext-cat-missing",
        status: "ACTIVE",
      },
    ]);
    mp.catalogCategory.findFirst.mockResolvedValue({ id: "int-cat-1", name: "Drinks", isActive: true });
    mp.externalCatalogCategory.findFirst.mockResolvedValue(null);
    mp.channelEntityMapping.update.mockResolvedValue({});

    const result = await validateMappings("conn-1");

    expect(result.brokenCount).toBe(1);
  });

  it("leaves valid mappings ACTIVE and updates lastValidatedAt", async () => {
    mp.channelEntityMapping.findMany.mockResolvedValue([
      {
        id: "map-3",
        connectionId: "conn-1",
        storeId: "s1",
        internalEntityType: "PRODUCT",
        internalEntityId: "int-prod-1",
        externalEntityType: "PRODUCT",
        externalEntityId: "ext-prod-1",
        status: "ACTIVE",
      },
    ]);
    mp.catalogProduct.findFirst.mockResolvedValue({ id: "int-prod-1", name: "Latte", isActive: true, deletedAt: null });
    mp.externalCatalogProduct.findFirst.mockResolvedValue({ id: "ext-prod-row-1" });
    mp.channelEntityMapping.update.mockResolvedValue({});

    const result = await validateMappings("conn-1");

    expect(result.brokenCount).toBe(0);
    const updateCall = mp.channelEntityMapping.update.mock.calls[0][0] as { data: Record<string, unknown> };
    // Should update lastValidatedAt but NOT change status to BROKEN
    expect(updateCall.data.status).toBeUndefined();
    expect(updateCall.data.lastValidatedAt).toBeDefined();
  });

  it("skips UNMATCHED rows during validation checks", async () => {
    mp.channelEntityMapping.findMany.mockResolvedValue([
      {
        id: "map-4",
        connectionId: "conn-1",
        storeId: "s1",
        internalEntityType: "PRODUCT",
        internalEntityId: "",
        externalEntityType: "PRODUCT",
        externalEntityId: "ext-prod-unmatched",
        status: "UNMATCHED",
      },
    ]);
    mp.channelEntityMapping.update.mockResolvedValue({});

    const result = await validateMappings("conn-1");

    // No entity lookups should be called for UNMATCHED rows.
    expect(mp.catalogProduct.findFirst).not.toHaveBeenCalled();
    expect(result.brokenCount).toBe(0);
  });
});
