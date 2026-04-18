/**
 * Phase 8: Catalog Merge — Service Tests
 *
 * Tests cover:
 *   1. createMergeDraftFromConflict
 *   2. upsertMergeFieldChoice
 *   3. upsertMergeStructureChoice
 *   4. validateMergeDraft — valid and invalid cases
 *   5. generateSyncPlanFromMergeDraft
 *   6. applyMergeDraft
 *   7. resetMergeDraft
 *   8. resolve-values helpers (pure functions)
 *   9. validate helpers (pure functions)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogConflict: {
      findUnique: vi.fn(),
    },
    connection: {
      findUnique: vi.fn(),
    },
    catalogMergeDraft: {
      create:     vi.fn(),
      findUnique: vi.fn(),
      findMany:   vi.fn(),
      update:     vi.fn(),
    },
    catalogMergeDraftField: {
      upsert:     vi.fn(),
      findUnique: vi.fn(),
    },
    catalogMergeDraftStructure: {
      upsert:     vi.fn(),
      findUnique: vi.fn(),
    },
    catalogMergeExecutionLog: {
      create: vi.fn(),
    },
    catalogSyncPlan: {
      create: vi.fn(),
      update: vi.fn(),
    },
    catalogSyncPlanItem: {
      findMany: vi.fn(),
      update:   vi.fn(),
    },
    $transaction: vi.fn().mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      // Execute the callback with a mock tx that mirrors the prisma mock
      const mockTx = {
        catalogSyncPlan: { create: vi.fn().mockResolvedValue({ id: "plan-1" }) },
        catalogMergeDraft: { update: vi.fn() },
        catalogMergeExecutionLog: { create: vi.fn() },
      };
      return fn(mockTx);
    }),
  },
}));

// ─── Mock catalog-sync-executor ───────────────────────────────────────────────

vi.mock("@/services/catalog-sync-executor.service", () => ({
  applySyncPlan: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { applySyncPlan } from "@/services/catalog-sync-executor.service";

import {
  createMergeDraftFromConflict,
  getMergeDraft,
  listMergeDrafts,
  updateMergeDraftMetadata,
  setMergeApplyTarget,
  upsertMergeFieldChoice,
  upsertMergeStructureChoice,
  resetMergeDraft,
  validateMergeDraft,
  applyMergeDraft,
} from "@/services/catalog-merge.service";

import { resolveFieldValue, resolveStructureValue } from "@/services/catalog-merge/resolve-values";
import { validateMergeDraftData } from "@/services/catalog-merge/validate";
import type { CatalogMergeDraftDto } from "@/types/catalog-merge";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDraftRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id:                 "draft-1",
    tenantId:           "t1",
    storeId:            "s1",
    connectionId:       "conn-1",
    conflictId:         "conflict-1",
    internalEntityType: "PRODUCT",
    internalEntityId:   "prod-1",
    externalEntityType: null,
    externalEntityId:   null,
    status:             "DRAFT",
    applyTarget:        "INTERNAL_THEN_EXTERNAL",
    title:              "Test merge",
    summary:            null,
    validationErrors:   null,
    generatedPlanId:    null,
    createdByUserId:    null,
    updatedByUserId:    null,
    createdAt:          new Date("2025-01-01"),
    updatedAt:          new Date("2025-01-01"),
    fieldChoices:       [],
    structureChoices:   [],
    executionLogs:      [],
    ...overrides,
  };
}

function makeFieldRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id:            "field-1",
    draftId:       "draft-1",
    fieldPath:     "name",
    choice:        "TAKE_INTERNAL",
    baselineValue: "Old name",
    internalValue: "Internal name",
    externalValue: "External name",
    customValue:   null,
    resolvedValue: "Internal name",
    note:          null,
    createdAt:     new Date("2025-01-01"),
    updatedAt:     new Date("2025-01-01"),
    ...overrides,
  };
}

// ─── 1. createMergeDraftFromConflict ─────────────────────────────────────────

describe("createMergeDraftFromConflict", () => {
  it("throws when conflict not found", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(createMergeDraftFromConflict("bad-id")).rejects.toThrow("not found");
  });

  it("throws when connection not found", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conflict-1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId: "prod-1",
      externalEntityType: null,
      externalEntityId: null,
      summary: null,
      conflictFields: [],
    });
    (prisma.connection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(createMergeDraftFromConflict("conflict-1")).rejects.toThrow("not found");
  });

  it("creates a draft with pre-populated field choices", async () => {
    (prisma.catalogConflict.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conflict-1",
      connectionId: "conn-1",
      internalEntityType: "PRODUCT",
      internalEntityId: "prod-1",
      externalEntityType: null,
      externalEntityId: null,
      summary: "Price conflict",
      conflictFields: [
        { fieldPath: "priceAmount", baselineValue: 500, internalValue: 600, externalValue: 650 },
      ],
    });
    (prisma.connection.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      tenantId: "t1",
      storeId: "s1",
    });
    (prisma.catalogMergeDraft.create as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ fieldChoices: [makeFieldRow({ fieldPath: "priceAmount" })] })
    );

    const draft = await createMergeDraftFromConflict("conflict-1", "user-1");

    expect(prisma.catalogMergeDraft.create).toHaveBeenCalledOnce();
    expect(draft.conflictId).toBe("conflict-1");
    expect(draft.internalEntityType).toBe("PRODUCT");
  });
});

// ─── 2. upsertMergeFieldChoice ────────────────────────────────────────────────

describe("upsertMergeFieldChoice", () => {
  it("upserts with TAKE_INTERNAL choice", async () => {
    (prisma.catalogMergeDraftField.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFieldRow()
    );
    (prisma.catalogMergeDraftField.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFieldRow({ choice: "TAKE_INTERNAL" })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const field = await upsertMergeFieldChoice({
      draftId: "draft-1",
      fieldPath: "name",
      choice: "TAKE_INTERNAL",
    });

    expect(prisma.catalogMergeDraftField.upsert).toHaveBeenCalledOnce();
    expect(field.choice).toBe("TAKE_INTERNAL");
  });

  it("upserts with CUSTOM_VALUE and stores resolvedValue = customValue", async () => {
    (prisma.catalogMergeDraftField.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFieldRow()
    );
    (prisma.catalogMergeDraftField.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFieldRow({ choice: "CUSTOM_VALUE", customValue: "My custom name", resolvedValue: "My custom name" })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const field = await upsertMergeFieldChoice({
      draftId: "draft-1",
      fieldPath: "name",
      choice: "CUSTOM_VALUE",
      customValue: "My custom name",
    });

    expect(field.choice).toBe("CUSTOM_VALUE");
    expect(field.resolvedValue).toBe("My custom name");
  });

  it("resets draft status to DRAFT after field change", async () => {
    (prisma.catalogMergeDraftField.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.catalogMergeDraftField.upsert as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeFieldRow()
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await upsertMergeFieldChoice({ draftId: "draft-1", fieldPath: "name", choice: "TAKE_INTERNAL" });

    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT" }) })
    );
  });
});

// ─── 3. upsertMergeStructureChoice ───────────────────────────────────────────

describe("upsertMergeStructureChoice", () => {
  it("upserts KEEP_INTERNAL_SET choice", async () => {
    (prisma.catalogMergeDraftStructure.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.catalogMergeDraftStructure.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "str-1",
      draftId: "draft-1",
      fieldPath: "categoryLinks",
      choice: "KEEP_INTERNAL_SET",
      baselineValue: null,
      internalValue: ["cat-a"],
      externalValue: ["cat-b"],
      customValue: null,
      resolvedValue: ["cat-a"],
      note: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const structure = await upsertMergeStructureChoice({
      draftId: "draft-1",
      fieldPath: "categoryLinks",
      choice: "KEEP_INTERNAL_SET",
    });

    expect(structure.choice).toBe("KEEP_INTERNAL_SET");
    expect(structure.fieldPath).toBe("categoryLinks");
  });

  it("resets draft status to DRAFT after structure change", async () => {
    (prisma.catalogMergeDraftStructure.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    (prisma.catalogMergeDraftStructure.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "str-1", draftId: "draft-1", fieldPath: "categoryLinks", choice: "TAKE_EXTERNAL_SET",
      baselineValue: null, internalValue: null, externalValue: null, customValue: null,
      resolvedValue: null, note: null, createdAt: new Date(), updatedAt: new Date(),
    });
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await upsertMergeStructureChoice({ draftId: "draft-1", fieldPath: "categoryLinks", choice: "TAKE_EXTERNAL_SET" });

    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "DRAFT" }) })
    );
  });
});

// ─── 4. validateMergeDraft ────────────────────────────────────────────────────

describe("validateMergeDraft — valid cases", () => {
  it("validates a draft with no fields (trivially valid)", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow()
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "VALIDATED" }) })
    );
  });

  it("validates a draft with valid name field", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "name", choice: "TAKE_INTERNAL", internalValue: "Good Name" })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(true);
  });

  it("validates a draft with valid priceAmount", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "priceAmount", choice: "TAKE_INTERNAL", internalValue: 500 })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(true);
  });
});

describe("validateMergeDraft — invalid cases", () => {
  it("fails when CUSTOM_VALUE choice has null customValue", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "name", choice: "CUSTOM_VALUE", customValue: null })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldPath === "name")).toBe(true);
  });

  it("fails when name is empty string", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "name", choice: "TAKE_INTERNAL", internalValue: "" })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldPath === "name")).toBe(true);
  });

  it("fails when priceAmount is negative", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "priceAmount", choice: "TAKE_INTERNAL", internalValue: -100 })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldPath === "priceAmount")).toBe(true);
  });

  it("fails when minSelect > maxSelect", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [
          makeFieldRow({ fieldPath: "minSelect", choice: "TAKE_INTERNAL", internalValue: 5 }),
          makeFieldRow({ id: "field-2", fieldPath: "maxSelect", choice: "TAKE_INTERNAL", internalValue: 2 }),
        ],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.fieldPath === "minSelect")).toBe(true);
  });

  it("fails when isActive is not boolean", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "isActive", choice: "TAKE_INTERNAL", internalValue: "yes" })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await validateMergeDraft("draft-1");
    expect(result.valid).toBe(false);
  });

  it("sets status INVALID on the draft when validation fails", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({
        fieldChoices: [makeFieldRow({ fieldPath: "name", choice: "TAKE_INTERNAL", internalValue: "" })],
      })
    );
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});

    await validateMergeDraft("draft-1");

    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "INVALID" }) })
    );
  });
});

// ─── 5. generateSyncPlanFromMergeDraft ────────────────────────────────────────

describe("generateSyncPlanFromMergeDraft", () => {
  it("throws when draft not found", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { generateSyncPlanFromMergeDraft } = await import("@/services/catalog-merge.service");
    await expect(generateSyncPlanFromMergeDraft("bad-id")).rejects.toThrow("not found");
  });

  it("throws when draft is not VALIDATED", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ status: "DRAFT" })
    );

    const { generateSyncPlanFromMergeDraft } = await import("@/services/catalog-merge.service");
    await expect(generateSyncPlanFromMergeDraft("draft-1")).rejects.toThrow("VALIDATED");
  });

  it("generates a plan for a VALIDATED draft", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ status: "VALIDATED", fieldChoices: [makeFieldRow()], structureChoices: [] })
    );
    // $transaction mock creates plan with id = "plan-1"

    const { generateSyncPlanFromMergeDraft } = await import("@/services/catalog-merge.service");
    const planId = await generateSyncPlanFromMergeDraft("draft-1", "user-1");

    expect(planId).toBe("plan-1");
  });
});

// ─── 6. applyMergeDraft ───────────────────────────────────────────────────────

describe("applyMergeDraft", () => {
  it("throws when draft not found", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    await expect(applyMergeDraft("bad-id")).rejects.toThrow("not found");
  });

  it("throws when no generatedPlanId", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "PLAN_GENERATED",
      generatedPlanId: null,
    });

    await expect(applyMergeDraft("draft-1")).rejects.toThrow("generated plan");
  });

  it("throws when status is not PLAN_GENERATED", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "VALIDATED",
      generatedPlanId: "plan-1",
    });

    await expect(applyMergeDraft("draft-1")).rejects.toThrow("PLAN_GENERATED");
  });

  it("applies successfully and marks draft as APPLIED", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "PLAN_GENERATED",
      generatedPlanId: "plan-1",
    });
    (applySyncPlan as ReturnType<typeof vi.fn>).mockResolvedValue({ applied: 3, failed: 0, skipped: 0 });
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.catalogMergeExecutionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await applyMergeDraft("draft-1", { userId: "user-1" });

    expect(result.success).toBe(true);
    expect(result.appliedCount).toBe(3);
    expect(result.failedCount).toBe(0);
    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "APPLIED" }) })
    );
  });

  it("marks draft as PLAN_GENERATED (not APPLIED) when some items fail", async () => {
    (prisma.catalogMergeDraft.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
      status: "PLAN_GENERATED",
      generatedPlanId: "plan-1",
    });
    (applySyncPlan as ReturnType<typeof vi.fn>).mockResolvedValue({ applied: 1, failed: 2, skipped: 0 });
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue({});
    (prisma.catalogMergeExecutionLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

    const result = await applyMergeDraft("draft-1");

    expect(result.success).toBe(false);
    expect(result.failedCount).toBe(2);
    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "PLAN_GENERATED" }) })
    );
  });
});

// ─── 7. resetMergeDraft ───────────────────────────────────────────────────────

describe("resetMergeDraft", () => {
  it("resets status to DRAFT and clears generatedPlanId", async () => {
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ status: "DRAFT", generatedPlanId: null })
    );

    const draft = await resetMergeDraft("draft-1");

    expect(prisma.catalogMergeDraft.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "DRAFT", generatedPlanId: null }),
      })
    );
    expect(draft.status).toBe("DRAFT");
    expect(draft.generatedPlanId).toBeNull();
  });
});

// ─── 8. resolve-values (pure function tests) ─────────────────────────────────

describe("resolveFieldValue", () => {
  it("returns internalValue for TAKE_INTERNAL", () => {
    expect(resolveFieldValue({
      choice: "TAKE_INTERNAL",
      internalValue: "foo",
      externalValue: "bar",
      customValue: null,
    })).toBe("foo");
  });

  it("returns externalValue for TAKE_EXTERNAL", () => {
    expect(resolveFieldValue({
      choice: "TAKE_EXTERNAL",
      internalValue: "foo",
      externalValue: "bar",
      customValue: null,
    })).toBe("bar");
  });

  it("returns customValue for CUSTOM_VALUE", () => {
    expect(resolveFieldValue({
      choice: "CUSTOM_VALUE",
      internalValue: "foo",
      externalValue: "bar",
      customValue: "custom",
    })).toBe("custom");
  });
});

describe("resolveStructureValue", () => {
  it("returns internalValue for KEEP_INTERNAL_SET", () => {
    expect(resolveStructureValue({
      choice: "KEEP_INTERNAL_SET",
      internalValue: ["a", "b"],
      externalValue: ["c"],
      customValue: null,
    })).toEqual(["a", "b"]);
  });

  it("returns externalValue for TAKE_EXTERNAL_SET", () => {
    expect(resolveStructureValue({
      choice: "TAKE_EXTERNAL_SET",
      internalValue: ["a"],
      externalValue: ["c", "d"],
      customValue: null,
    })).toEqual(["c", "d"]);
  });

  it("returns customValue for MERGE_SELECTED", () => {
    expect(resolveStructureValue({
      choice: "MERGE_SELECTED",
      internalValue: ["a"],
      externalValue: ["b"],
      customValue: ["a", "b"],
    })).toEqual(["a", "b"]);
  });

  it("returns customValue for CUSTOM_STRUCTURE", () => {
    expect(resolveStructureValue({
      choice: "CUSTOM_STRUCTURE",
      internalValue: null,
      externalValue: null,
      customValue: ["x"],
    })).toEqual(["x"]);
  });
});

// ─── 9. validateMergeDraftData (pure function tests) ─────────────────────────

describe("validateMergeDraftData", () => {
  function makeDraftDto(overrides: Partial<CatalogMergeDraftDto> = {}): CatalogMergeDraftDto {
    return {
      id: "d1", tenantId: "t1", storeId: "s1", connectionId: "c1",
      conflictId: null, internalEntityType: "PRODUCT", internalEntityId: "p1",
      externalEntityType: null, externalEntityId: null,
      status: "DRAFT", applyTarget: "INTERNAL_THEN_EXTERNAL",
      title: null, summary: null, validationErrors: null, generatedPlanId: null,
      createdByUserId: null, updatedByUserId: null,
      createdAt: "2025-01-01", updatedAt: "2025-01-01",
      fieldChoices: [], structureChoices: [],
      ...overrides,
    };
  }

  it("is valid with no choices", () => {
    const result = validateMergeDraftData(makeDraftDto());
    expect(result.valid).toBe(true);
  });

  it("fails with invalid applyTarget", () => {
    const result = validateMergeDraftData(makeDraftDto({ applyTarget: "INVALID" as never }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.fieldPath === "applyTarget")).toBe(true);
  });

  it("validates structure choice MERGE_SELECTED requires customValue", () => {
    const result = validateMergeDraftData(makeDraftDto({
      structureChoices: [{
        id: "s1", draftId: "d1", fieldPath: "categoryLinks",
        choice: "MERGE_SELECTED",
        baselineValue: null, internalValue: null, externalValue: null, customValue: null,
        resolvedValue: null, note: null, createdAt: "2025-01-01", updatedAt: "2025-01-01",
      }],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.fieldPath === "categoryLinks")).toBe(true);
  });
});

// ─── Misc: listMergeDrafts, updateMetadata, setApplyTarget ───────────────────

describe("listMergeDrafts", () => {
  it("returns mapped drafts", async () => {
    (prisma.catalogMergeDraft.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      makeDraftRow(),
    ]);

    const drafts = await listMergeDrafts({ connectionId: "conn-1" });
    expect(drafts).toHaveLength(1);
    expect(drafts[0].id).toBe("draft-1");
  });
});

describe("updateMergeDraftMetadata", () => {
  it("updates title and summary", async () => {
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ title: "New title", summary: "New summary" })
    );

    const draft = await updateMergeDraftMetadata({
      draftId: "draft-1",
      title: "New title",
      summary: "New summary",
    });

    expect(draft.title).toBe("New title");
    expect(draft.summary).toBe("New summary");
  });
});

describe("setMergeApplyTarget", () => {
  it("updates applyTarget and resets status", async () => {
    (prisma.catalogMergeDraft.update as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeDraftRow({ applyTarget: "INTERNAL_ONLY", status: "DRAFT" })
    );

    const draft = await setMergeApplyTarget({
      draftId: "draft-1",
      applyTarget: "INTERNAL_ONLY",
    });

    expect(draft.applyTarget).toBe("INTERNAL_ONLY");
    expect(draft.status).toBe("DRAFT");
  });
});
