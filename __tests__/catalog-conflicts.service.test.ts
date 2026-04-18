/**
 * Phase 6: Catalog Conflict Detection & Resolution — Service Tests
 *
 * Tests cover:
 *   1. Field conflict detection (pure function tests)
 *      1a. internal + external price changed differently => FIELD_VALUE_CONFLICT
 *      1b. external only changed => no conflict
 *      1c. internal description + external soldOut => no conflict (different fields)
 *      1d. both sides converged to same value => no conflict
 *
 *   2. Structure conflict detection (pure function tests)
 *      2a. both modifierGroupLinks changed differently => STRUCTURE_CONFLICT
 *      2b. internal unchanged + external modifierGroupLinks changed => no conflict
 *
 *   3. Conflict policy tests
 *      3a. priceAmount is tracked for PRODUCT
 *      3b. displayOrder is not tracked for PRODUCT
 *      3c. sortOrder is not tracked for CATEGORY
 *
 *   4. Resolution tests
 *      4a. resolveConflict => RESOLVED + strategy saved
 *      4b. setConflictStatus IGNORED => IGNORED
 *      4c. setConflictStatus IN_REVIEW => IN_REVIEW
 *      4d. resolution log is created
 *
 *   5. Summary tests
 *      5a. buildConflictSummary aggregates correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Field conflict detection ──────────────────────────────────────────────

import { detectFieldConflicts, extractInternalFieldValues } from "@/services/catalog-conflict/detect-field-conflicts";
import { isFieldConflictTracked } from "@/services/catalog-conflict/conflict-policy";

// Mock baseline so we can control internal-changed flag
vi.mock("@/services/catalog-conflict/baseline", () => ({
  resolveBaseline: vi.fn(),
  hasInternalChangedAfterBaseline: vi.fn(),
}));

import { hasInternalChangedAfterBaseline } from "@/services/catalog-conflict/baseline";

// Mock prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogConflict: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create:    vi.fn(),
      update:    vi.fn(),
      updateMany: vi.fn(),
    },
    catalogConflictField: {
      createMany: vi.fn(),
    },
    catalogConflictResolutionLog: {
      create: vi.fn(),
    },
    channelEntityMapping: {
      findFirst: vi.fn(),
    },
    externalCatalogChange: {
      findMany:  vi.fn(),
      findFirst: vi.fn(),
    },
    catalogProduct: {
      findUnique: vi.fn(),
    },
    catalogCategory: {
      findUnique: vi.fn(),
    },
    catalogModifierGroup: {
      findUnique: vi.fn(),
    },
    catalogModifierOption: {
      findUnique: vi.fn(),
    },
    internalCatalogChange: {
      count: vi.fn(),
    },
    connection: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((ops: Promise<unknown>[]) => Promise.all(ops)),
  },
}));

import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── 1a. internal + external price both changed differently ───────────────────

describe("detectFieldConflicts — FIELD_VALUE_CONFLICT", () => {
  it("returns VALUE_MISMATCH when both sides changed price differently", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectFieldConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      externalFieldDiffs: [
        { fieldPath: "priceAmount", previousValue: 650, currentValue: 680 },
      ],
      internalCurrentValues: { priceAmount: 700 },
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].fieldPath).toBe("priceAmount");
    expect(candidates[0].fieldConflictType).toBe("VALUE_MISMATCH");
    expect(candidates[0].baselineValue).toBe(650);
    expect(candidates[0].internalValue).toBe(700);
    expect(candidates[0].externalValue).toBe(680);
  });

  it("returns empty when external changed but internal did NOT change", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const candidates = await detectFieldConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      externalFieldDiffs: [
        { fieldPath: "priceAmount", previousValue: 650, currentValue: 680 },
      ],
      internalCurrentValues: { priceAmount: 650 },
    });

    expect(candidates).toHaveLength(0);
  });

  it("returns empty when both sides converged to same value", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectFieldConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      externalFieldDiffs: [
        { fieldPath: "priceAmount", previousValue: 650, currentValue: 700 },
      ],
      internalCurrentValues: { priceAmount: 700 }, // same as external
    });

    expect(candidates).toHaveLength(0);
  });

  it("ignores non-tracked fields (displayOrder)", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectFieldConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      externalFieldDiffs: [
        { fieldPath: "displayOrder", previousValue: 1, currentValue: 5 },
      ],
      internalCurrentValues: { displayOrder: 3 },
    });

    expect(candidates).toHaveLength(0);
  });

  it("ignores fields from different areas (description vs isSoldOut)", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockImplementation(
      async (_tenantId: unknown, _storeId: unknown, _eid: unknown, _etype: unknown, fieldPath: unknown) => {
        // Internal changed description, external changed isSoldOut
        return fieldPath === "description";
      }
    );

    const candidates = await detectFieldConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      externalFieldDiffs: [
        { fieldPath: "isSoldOut", previousValue: false, currentValue: true },
      ],
      internalCurrentValues: { description: "New description", isSoldOut: false },
    });

    // isSoldOut is tracked but internal didn't change isSoldOut — no conflict
    expect(candidates).toHaveLength(0);
  });
});

// ─── 2. extractInternalFieldValues ───────────────────────────────────────────

describe("extractInternalFieldValues", () => {
  it("maps PRODUCT fields correctly", () => {
    const entity = {
      name: "Latte",
      basePriceAmount: 600,
      isActive: true,
      isSoldOut: false,
      description: "Coffee drink",
      imageUrl: null,
      displayOrder: 1,
    };
    const values = extractInternalFieldValues("PRODUCT", entity);
    expect(values["priceAmount"]).toBe(600);
    expect(values["name"]).toBe("Latte");
    expect(values["isActive"]).toBe(true);
  });

  it("maps MODIFIER_GROUP fields correctly", () => {
    const entity = { name: "Extras", selectionMin: 0, selectionMax: 3, isRequired: false, isActive: true };
    const values = extractInternalFieldValues("MODIFIER_GROUP", entity);
    expect(values["selectionMin"]).toBe(0);
    expect(values["selectionMax"]).toBe(3);
  });

  it("maps MODIFIER_OPTION fields correctly", () => {
    const entity = { name: "Oat milk", priceDeltaAmount: 50, isActive: true, isSoldOut: false, isDefault: false };
    const values = extractInternalFieldValues("MODIFIER_OPTION", entity);
    expect(values["priceAmount"]).toBe(50);
    expect(values["name"]).toBe("Oat milk");
  });
});

// ─── 3. Conflict policy tests ─────────────────────────────────────────────────

describe("isFieldConflictTracked", () => {
  it("tracks priceAmount for PRODUCT", () => {
    expect(isFieldConflictTracked("PRODUCT", "priceAmount")).toBe(true);
  });

  it("does not track displayOrder for PRODUCT", () => {
    expect(isFieldConflictTracked("PRODUCT", "displayOrder")).toBe(false);
  });

  it("does not track sortOrder for CATEGORY", () => {
    expect(isFieldConflictTracked("CATEGORY", "sortOrder")).toBe(false);
  });

  it("tracks name for all entity types", () => {
    expect(isFieldConflictTracked("PRODUCT",         "name")).toBe(true);
    expect(isFieldConflictTracked("CATEGORY",        "name")).toBe(true);
    expect(isFieldConflictTracked("MODIFIER_GROUP",  "name")).toBe(true);
    expect(isFieldConflictTracked("MODIFIER_OPTION", "name")).toBe(true);
  });

  it("returns false for unknown entity type", () => {
    expect(isFieldConflictTracked("UNKNOWN", "name")).toBe(false);
  });
});

// ─── 4. Structure conflict detection ─────────────────────────────────────────

import { detectStructureConflicts } from "@/services/catalog-conflict/detect-structure-conflicts";

describe("detectStructureConflicts", () => {
  it("returns candidates when both sides changed modifierGroupLinks differently", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectStructureConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      area: "modifierGroupLinks",
      // baseline: [A, B], internal: [A, B, C], external: [A]
      internalLinks: ["grp-a", "grp-b", "grp-c"],
      externalLinks: ["grp-a"],
      baselineLinks: ["grp-a", "grp-b"],
    });

    expect(candidates.length).toBeGreaterThan(0);
    const paths = candidates.map((c) => c.fieldPath);
    // grp-b removed externally but still in internal
    expect(paths.some((p) => p.includes("grp-b"))).toBe(true);
  });

  it("returns empty when only external changed and internal did NOT change", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(false);

    const candidates = await detectStructureConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      area: "modifierGroupLinks",
      internalLinks: ["grp-a", "grp-b"],
      externalLinks: ["grp-a"],      // external removed grp-b
      baselineLinks: ["grp-a", "grp-b"],
    });

    expect(candidates).toHaveLength(0);
  });

  it("returns empty when external didn't change", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectStructureConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      area: "categoryLinks",
      internalLinks: ["cat-a", "cat-b"],
      externalLinks: ["cat-a"],       // external same as baseline
      baselineLinks: ["cat-a"],       // no external change
    });

    expect(candidates).toHaveLength(0);
  });

  it("returns empty when both sides converged to same structure", async () => {
    (hasInternalChangedAfterBaseline as ReturnType<typeof vi.fn>).mockResolvedValue(true);

    const candidates = await detectStructureConflicts({
      tenantId: "t1",
      storeId:  "s1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId:   "prod-1",
      baselineAt: new Date("2024-01-01"),
      area: "modifierGroupLinks",
      internalLinks: ["grp-a", "grp-c"],
      externalLinks: ["grp-a", "grp-c"],
      baselineLinks: ["grp-a", "grp-b"],
    });

    expect(candidates).toHaveLength(0);
  });
});

// ─── 5. Resolution service tests ─────────────────────────────────────────────

import { resolveConflict, setConflictStatus } from "@/services/catalog-conflict/resolution";

describe("resolveConflict", () => {
  it("updates status to RESOLVED and records log", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conflict-1",
      status: "IN_REVIEW",
    });
    (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.catalogConflictResolutionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await resolveConflict({
      conflictId: "conflict-1",
      resolutionStrategy: "KEEP_INTERNAL",
      note: "We trust our internal value",
      resolvedByUserId: "user-1",
    });

    const updateCall = (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.status).toBe("RESOLVED");
    expect(updateCall.data.resolutionStrategy).toBe("KEEP_INTERNAL");
    expect(updateCall.data.resolutionNote).toBe("We trust our internal value");

    const logCall = (prisma.catalogConflictResolutionLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(logCall.data.newStatus).toBe("RESOLVED");
    expect(logCall.data.previousStatus).toBe("IN_REVIEW");
    expect(logCall.data.strategy).toBe("KEEP_INTERNAL");
  });

  it("throws if conflict not found", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    await expect(
      resolveConflict({ conflictId: "missing", resolutionStrategy: "KEEP_INTERNAL" })
    ).rejects.toThrow("not found");
  });
});

describe("setConflictStatus — IGNORED", () => {
  it("updates status to IGNORED and records log", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conflict-1",
      status: "OPEN",
    });
    (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.catalogConflictResolutionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await setConflictStatus({ conflictId: "conflict-1", newStatus: "IGNORED" });

    const updateCall = (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.status).toBe("IGNORED");
    expect(updateCall.data.resolutionStrategy).toBe("IGNORE");

    const logCall = (prisma.catalogConflictResolutionLog.create as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(logCall.data.newStatus).toBe("IGNORED");
    expect(logCall.data.previousStatus).toBe("OPEN");
  });
});

describe("setConflictStatus — IN_REVIEW", () => {
  it("updates status to IN_REVIEW and records log", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conflict-1",
      status: "OPEN",
    });
    (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.catalogConflictResolutionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await setConflictStatus({ conflictId: "conflict-1", newStatus: "IN_REVIEW" });

    const updateCall = (prisma.catalogConflict.update as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(updateCall.data.status).toBe("IN_REVIEW");
  });
});

// ─── 6. Summary aggregation tests ────────────────────────────────────────────

import { buildConflictSummary } from "@/services/catalog-conflict/summary";

describe("buildConflictSummary", () => {
  it("aggregates counts correctly", async () => {
    (prisma.catalogConflict.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { status: "OPEN",      conflictType: "FIELD_VALUE_CONFLICT", internalEntityType: "PRODUCT" },
      { status: "OPEN",      conflictType: "STRUCTURE_CONFLICT",   internalEntityType: "PRODUCT" },
      { status: "IN_REVIEW", conflictType: "FIELD_VALUE_CONFLICT", internalEntityType: "CATEGORY" },
      { status: "RESOLVED",  conflictType: "MISSING_ON_EXTERNAL",  internalEntityType: "MODIFIER_GROUP" },
      { status: "IGNORED",   conflictType: "FIELD_VALUE_CONFLICT", internalEntityType: "MODIFIER_OPTION" },
    ]);

    const summary = await buildConflictSummary("conn-1");

    expect(summary.totalOpen).toBe(2);
    expect(summary.totalInReview).toBe(1);
    expect(summary.totalResolved).toBe(1);
    expect(summary.totalIgnored).toBe(1);
    expect(summary.fieldConflicts).toBe(3);
    expect(summary.structureConflicts).toBe(1);
    expect(summary.missingIssues).toBe(1);
    expect(summary.byEntityType.PRODUCT).toBe(2);
    expect(summary.byEntityType.CATEGORY).toBe(1);
  });
});
