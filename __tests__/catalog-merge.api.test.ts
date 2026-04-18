/**
 * Phase 8: Catalog Merge — API Route Tests
 *
 * Tests all merge-draft API routes with mocked service layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock service ─────────────────────────────────────────────────────────────

vi.mock("@/services/catalog-merge.service", () => ({
  listMergeDrafts:                vi.fn(),
  createMergeDraftFromConflict:   vi.fn(),
  getMergeDraft:                  vi.fn(),
  updateMergeDraftMetadata:       vi.fn(),
  setMergeApplyTarget:            vi.fn(),
  upsertMergeFieldChoice:         vi.fn(),
  upsertMergeStructureChoice:     vi.fn(),
  resetMergeDraft:                vi.fn(),
  validateMergeDraft:             vi.fn(),
  generateSyncPlanFromMergeDraft: vi.fn(),
  applyMergeDraft:                vi.fn(),
  previewMergeDraft:              vi.fn(),
}));

import {
  listMergeDrafts                as mockList,
  createMergeDraftFromConflict   as mockCreate,
  getMergeDraft                  as mockGet,
  updateMergeDraftMetadata       as mockUpdateMeta,
  setMergeApplyTarget            as mockSetTarget,
  upsertMergeFieldChoice         as mockUpsertField,
  upsertMergeStructureChoice     as mockUpsertStructure,
  resetMergeDraft                as mockReset,
  validateMergeDraft             as mockValidate,
  generateSyncPlanFromMergeDraft as mockGeneratePlan,
  applyMergeDraft                as mockApply,
  previewMergeDraft              as mockPreview,
} from "@/services/catalog-merge.service";

import { GET  as listRoute,  POST as createRoute } from "@/app/api/catalog/merge-drafts/route";
import { GET  as getRoute,   PATCH as patchRoute }  from "@/app/api/catalog/merge-drafts/[draftId]/route";
import { POST as fieldsRoute }                      from "@/app/api/catalog/merge-drafts/[draftId]/fields/route";
import { POST as structuresRoute }                  from "@/app/api/catalog/merge-drafts/[draftId]/structures/route";
import { POST as resetRoute }                       from "@/app/api/catalog/merge-drafts/[draftId]/reset/route";
import { POST as validateRoute }                    from "@/app/api/catalog/merge-drafts/[draftId]/validate/route";
import { POST as generatePlanRoute }                from "@/app/api/catalog/merge-drafts/[draftId]/generate-plan/route";
import { POST as applyRoute }                       from "@/app/api/catalog/merge-drafts/[draftId]/apply/route";
import { GET  as previewRoute }                     from "@/app/api/catalog/merge-drafts/[draftId]/preview/route";

beforeEach(() => {
  vi.clearAllMocks();
});

function makeReq(method: string, url: string, body?: unknown): Request {
  return new Request(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

const DRAFT_PARAMS = { params: { draftId: "draft-1" } };

const MOCK_DRAFT = {
  id: "draft-1",
  tenantId: "t1",
  storeId: "s1",
  connectionId: "conn-1",
  conflictId: null,
  internalEntityType: "PRODUCT",
  internalEntityId: "prod-1",
  externalEntityType: null,
  externalEntityId: null,
  status: "DRAFT",
  applyTarget: "INTERNAL_THEN_EXTERNAL",
  title: "Test draft",
  summary: null,
  validationErrors: null,
  generatedPlanId: null,
  createdByUserId: null,
  updatedByUserId: null,
  createdAt: "2025-01-01T00:00:00.000Z",
  updatedAt: "2025-01-01T00:00:00.000Z",
  fieldChoices: [],
  structureChoices: [],
};

// ─── GET /api/catalog/merge-drafts ────────────────────────────────────────────

describe("GET /api/catalog/merge-drafts", () => {
  it("returns 400 when connectionId is missing", async () => {
    const res = await listRoute(
      makeReq("GET", "http://localhost/api/catalog/merge-drafts") as never
    );
    expect(res.status).toBe(400);
  });

  it("returns drafts list", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([MOCK_DRAFT]);

    const res = await listRoute(
      makeReq("GET", "http://localhost/api/catalog/merge-drafts?connectionId=conn-1") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.drafts).toHaveLength(1);
  });

  it("passes status filter to service", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    await listRoute(
      makeReq("GET", "http://localhost/api/catalog/merge-drafts?connectionId=conn-1&status=VALIDATED") as never
    );

    expect(mockList).toHaveBeenCalledWith(
      expect.objectContaining({ status: "VALIDATED" })
    );
  });
});

// ─── POST /api/catalog/merge-drafts ───────────────────────────────────────────

describe("POST /api/catalog/merge-drafts", () => {
  it("returns 400 when conflictId is missing", async () => {
    const res = await createRoute(
      makeReq("POST", "http://localhost/api/catalog/merge-drafts", {}) as never
    );
    expect(res.status).toBe(400);
  });

  it("creates a draft and returns 201", async () => {
    (mockCreate as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_DRAFT);

    const res = await createRoute(
      makeReq("POST", "http://localhost/api/catalog/merge-drafts", { conflictId: "conflict-1" }) as never
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.draft.id).toBe("draft-1");
  });

  it("returns 404 when service throws not found", async () => {
    (mockCreate as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Conflict bad-id not found"));

    const res = await createRoute(
      makeReq("POST", "http://localhost/api/catalog/merge-drafts", { conflictId: "bad-id" }) as never
    );
    expect(res.status).toBe(404);
  });
});

// ─── GET /api/catalog/merge-drafts/[draftId] ─────────────────────────────────

describe("GET /api/catalog/merge-drafts/[draftId]", () => {
  it("returns 404 when draft not found", async () => {
    (mockGet as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getRoute(
      makeReq("GET", "http://localhost/api/catalog/merge-drafts/bad-id") as never,
      { params: { draftId: "bad-id" } }
    );
    expect(res.status).toBe(404);
  });

  it("returns draft when found", async () => {
    (mockGet as ReturnType<typeof vi.fn>).mockResolvedValue(MOCK_DRAFT);

    const res = await getRoute(
      makeReq("GET", "http://localhost/api/catalog/merge-drafts/draft-1") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft.id).toBe("draft-1");
  });
});

// ─── PATCH /api/catalog/merge-drafts/[draftId] ────────────────────────────────

describe("PATCH /api/catalog/merge-drafts/[draftId]", () => {
  it("updates metadata", async () => {
    (mockUpdateMeta as ReturnType<typeof vi.fn>).mockResolvedValue({ ...MOCK_DRAFT, title: "Updated" });

    const res = await patchRoute(
      makeReq("PATCH", "http://localhost/api/catalog/merge-drafts/draft-1", { title: "Updated" }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft.title).toBe("Updated");
  });

  it("updates applyTarget via setMergeApplyTarget", async () => {
    (mockSetTarget as ReturnType<typeof vi.fn>).mockResolvedValue({
      ...MOCK_DRAFT,
      applyTarget: "INTERNAL_ONLY",
    });

    const res = await patchRoute(
      makeReq("PATCH", "http://localhost/api/catalog/merge-drafts/draft-1", {
        applyTarget: "INTERNAL_ONLY",
      }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    expect(mockSetTarget).toHaveBeenCalled();
    expect(mockUpdateMeta).not.toHaveBeenCalled();
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/fields ─────────────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/fields", () => {
  it("returns 400 when fieldPath missing", async () => {
    const res = await fieldsRoute(
      makeReq("POST", "http://localhost/.../fields", { choice: "TAKE_INTERNAL" }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 when choice missing", async () => {
    const res = await fieldsRoute(
      makeReq("POST", "http://localhost/.../fields", { fieldPath: "name" }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });

  it("upserts field choice", async () => {
    (mockUpsertField as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "f1", draftId: "draft-1", fieldPath: "name", choice: "TAKE_INTERNAL",
      baselineValue: null, internalValue: "Name", externalValue: "Ext", customValue: null,
      resolvedValue: "Name", note: null,
      createdAt: "2025-01-01", updatedAt: "2025-01-01",
    });

    const res = await fieldsRoute(
      makeReq("POST", "http://localhost/.../fields", { fieldPath: "name", choice: "TAKE_INTERNAL" }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.field.fieldPath).toBe("name");
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/structures ─────────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/structures", () => {
  it("returns 400 when fieldPath missing", async () => {
    const res = await structuresRoute(
      makeReq("POST", "http://localhost/.../structures", { choice: "KEEP_INTERNAL_SET" }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });

  it("upserts structure choice", async () => {
    (mockUpsertStructure as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "s1", draftId: "draft-1", fieldPath: "categoryLinks", choice: "KEEP_INTERNAL_SET",
      baselineValue: null, internalValue: null, externalValue: null, customValue: null,
      resolvedValue: null, note: null,
      createdAt: "2025-01-01", updatedAt: "2025-01-01",
    });

    const res = await structuresRoute(
      makeReq("POST", "http://localhost/.../structures", {
        fieldPath: "categoryLinks",
        choice: "KEEP_INTERNAL_SET",
      }) as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.structure.fieldPath).toBe("categoryLinks");
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/reset ──────────────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/reset", () => {
  it("resets draft and returns 200", async () => {
    (mockReset as ReturnType<typeof vi.fn>).mockResolvedValue({ ...MOCK_DRAFT, status: "DRAFT" });

    const res = await resetRoute(
      makeReq("POST", "http://localhost/.../reset") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.draft.status).toBe("DRAFT");
  });

  it("returns 400 when service throws", async () => {
    (mockReset as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Not found"));

    const res = await resetRoute(
      makeReq("POST", "http://localhost/.../reset") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/validate ────────────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/validate", () => {
  it("returns validation result", async () => {
    (mockValidate as ReturnType<typeof vi.fn>).mockResolvedValue({ valid: true, errors: [] });

    const res = await validateRoute(
      makeReq("POST", "http://localhost/.../validate") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation.valid).toBe(true);
  });

  it("returns validation errors when invalid", async () => {
    (mockValidate as ReturnType<typeof vi.fn>).mockResolvedValue({
      valid: false,
      errors: [{ fieldPath: "name", message: "name is required" }],
    });

    const res = await validateRoute(
      makeReq("POST", "http://localhost/.../validate") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.validation.valid).toBe(false);
    expect(json.validation.errors).toHaveLength(1);
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/generate-plan ──────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/generate-plan", () => {
  it("returns planId on success", async () => {
    (mockGeneratePlan as ReturnType<typeof vi.fn>).mockResolvedValue("plan-999");

    const res = await generatePlanRoute(
      makeReq("POST", "http://localhost/.../generate-plan") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.planId).toBe("plan-999");
  });

  it("returns 400 when draft is not VALIDATED", async () => {
    (mockGeneratePlan as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Draft must be in VALIDATED status")
    );

    const res = await generatePlanRoute(
      makeReq("POST", "http://localhost/.../generate-plan") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/catalog/merge-drafts/[draftId]/apply ──────────────────────────

describe("POST /api/catalog/merge-drafts/[draftId]/apply", () => {
  it("returns success result", async () => {
    (mockApply as ReturnType<typeof vi.fn>).mockResolvedValue({
      success: true,
      appliedCount: 2,
      failedCount: 0,
      planId: "plan-1",
    });

    const res = await applyRoute(
      makeReq("POST", "http://localhost/.../apply") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.appliedCount).toBe(2);
  });

  it("returns 400 when apply fails (no plan)", async () => {
    (mockApply as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Draft does not have a generated plan")
    );

    const res = await applyRoute(
      makeReq("POST", "http://localhost/.../apply") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(400);
  });
});

// ─── GET /api/catalog/merge-drafts/[draftId]/preview ─────────────────────────

describe("GET /api/catalog/merge-drafts/[draftId]/preview", () => {
  it("returns preview", async () => {
    (mockPreview as ReturnType<typeof vi.fn>).mockResolvedValue({
      draft: MOCK_DRAFT,
      validation: { valid: true, errors: [] },
      resolvedFields: [],
      resolvedStructures: [],
    });

    const res = await previewRoute(
      makeReq("GET", "http://localhost/.../preview") as never,
      DRAFT_PARAMS
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preview.validation.valid).toBe(true);
  });

  it("returns 404 when draft not found", async () => {
    (mockPreview as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("MergeDraft bad-id not found")
    );

    const res = await previewRoute(
      makeReq("GET", "http://localhost/.../preview") as never,
      { params: { draftId: "bad-id" } }
    );
    expect(res.status).toBe(404);
  });
});
