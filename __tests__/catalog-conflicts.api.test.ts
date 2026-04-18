/**
 * Phase 6: Catalog Conflicts — API Endpoint Tests
 *
 * Tests all conflict API routes with mocked service layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock service before importing routes
vi.mock("@/services/catalog-conflict.service", () => ({
  detectConflictsForConnection:    vi.fn(),
  detectConflictsForExternalChange: vi.fn(),
  listConflicts:                   vi.fn(),
  getConflictSummary:              vi.fn(),
  getConflictById:                 vi.fn(),
  setConflictStatus:               vi.fn(),
  resolveConflict:                 vi.fn(),
}));

import {
  detectConflictsForConnection    as mockDetectForConn,
  detectConflictsForExternalChange as mockDetectForChange,
  listConflicts                   as mockList,
  getConflictSummary              as mockSummary,
  getConflictById                 as mockGetOne,
  setConflictStatus               as mockSetStatus,
  resolveConflict                 as mockResolve,
} from "@/services/catalog-conflict.service";

import { POST as detectRoute }      from "@/app/api/catalog/conflicts/detect/route";
import { GET  as listRoute }        from "@/app/api/catalog/conflicts/route";
import { GET  as summaryRoute }     from "@/app/api/catalog/conflicts/summary/route";
import { GET  as getOneRoute }      from "@/app/api/catalog/conflicts/[conflictId]/route";
import { POST as startReviewRoute } from "@/app/api/catalog/conflicts/[conflictId]/start-review/route";
import { POST as ignoreRoute }      from "@/app/api/catalog/conflicts/[conflictId]/ignore/route";
import { POST as resolveRoute }     from "@/app/api/catalog/conflicts/[conflictId]/resolve/route";

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

// ─── POST /api/catalog/conflicts/detect ───────────────────────────────────────

describe("POST /api/catalog/conflicts/detect", () => {
  it("returns 400 when neither connectionId nor externalChangeId provided", async () => {
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/detect", {}) as never);
    expect(res.status).toBe(400);
  });

  it("delegates to detectConflictsForConnection when connectionId provided", async () => {
    (mockDetectForConn as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      conflictsCreated: 3,
      conflictsSuperseded: 1,
      status: "SUCCEEDED",
    });
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/detect", { connectionId: "conn-1" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.conflictsCreated).toBe(3);
    expect(json.status).toBe("SUCCEEDED");
  });

  it("delegates to detectConflictsForExternalChange when externalChangeId provided", async () => {
    (mockDetectForChange as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      conflictsCreated: 1,
      conflictsSuperseded: 0,
      status: "SUCCEEDED",
    });
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/detect", { externalChangeId: "chg-1" }) as never);
    expect(res.status).toBe(200);
  });

  it("returns 500 when detection fails", async () => {
    (mockDetectForConn as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      conflictsCreated: 0,
      conflictsSuperseded: 0,
      status: "FAILED",
      errorMessage: "DB error",
    });
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/detect", { connectionId: "conn-1" }) as never);
    expect(res.status).toBe(500);
  });
});

// ─── GET /api/catalog/conflicts ───────────────────────────────────────────────

describe("GET /api/catalog/conflicts", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await listRoute(makeReq("GET", "http://localhost/api/catalog/conflicts") as never);
    expect(res.status).toBe(400);
  });

  it("returns conflict list", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "conf-1", conflictType: "FIELD_VALUE_CONFLICT", status: "OPEN" },
    ]);
    const res = await listRoute(makeReq("GET", "http://localhost/api/catalog/conflicts?connectionId=conn-1") as never);
    const json = await res.json();
    expect(json.conflicts).toHaveLength(1);
    expect(json.conflicts[0].id).toBe("conf-1");
  });

  it("passes filters to service", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await listRoute(makeReq("GET", "http://localhost/api/catalog/conflicts?connectionId=conn-1&status=OPEN&entityType=PRODUCT") as never);
    const callArgs = (mockList as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.status).toBe("OPEN");
    expect(callArgs.entityType).toBe("PRODUCT");
  });
});

// ─── GET /api/catalog/conflicts/summary ──────────────────────────────────────

describe("GET /api/catalog/conflicts/summary", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await summaryRoute(makeReq("GET", "http://localhost/api/catalog/conflicts/summary") as never);
    expect(res.status).toBe(400);
  });

  it("returns summary", async () => {
    (mockSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      totalOpen: 5,
      totalInReview: 2,
      totalResolved: 10,
      totalIgnored: 1,
      fieldConflicts: 4,
      structureConflicts: 2,
      missingIssues: 1,
      byEntityType: { PRODUCT: 5, CATEGORY: 2, MODIFIER_GROUP: 1, MODIFIER_OPTION: 0 },
    });
    const res = await summaryRoute(makeReq("GET", "http://localhost/api/catalog/conflicts/summary?connectionId=conn-1") as never);
    const json = await res.json();
    expect(json.summary.totalOpen).toBe(5);
    expect(json.summary.fieldConflicts).toBe(4);
  });
});

// ─── GET /api/catalog/conflicts/[conflictId] ─────────────────────────────────

describe("GET /api/catalog/conflicts/[conflictId]", () => {
  it("returns 404 when not found", async () => {
    (mockGetOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getOneRoute(makeReq("GET", "http://localhost/api/catalog/conflicts/missing") as never, { params: { conflictId: "missing" } });
    expect(res.status).toBe(404);
  });

  it("returns conflict details", async () => {
    (mockGetOne as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "conf-1",
      conflictType: "FIELD_VALUE_CONFLICT",
      status: "OPEN",
      conflictFields: [{ id: "f1", fieldPath: "priceAmount" }],
      resolutionLogs: [],
    });
    const res = await getOneRoute(makeReq("GET", "http://localhost/api/catalog/conflicts/conf-1") as never, { params: { conflictId: "conf-1" } });
    const json = await res.json();
    expect(json.conflict.id).toBe("conf-1");
    expect(json.conflict.conflictFields).toHaveLength(1);
  });
});

// ─── POST /api/catalog/conflicts/[conflictId]/start-review ───────────────────

describe("POST /api/catalog/conflicts/[conflictId]/start-review", () => {
  it("calls setConflictStatus with IN_REVIEW", async () => {
    (mockSetStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const res = await startReviewRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/start-review") as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(200);
    const callArgs = (mockSetStatus as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.newStatus).toBe("IN_REVIEW");
    expect(callArgs.conflictId).toBe("conf-1");
  });

  it("returns 400 when service throws", async () => {
    (mockSetStatus as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));
    const res = await startReviewRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/start-review") as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(400);
  });
});

// ─── POST /api/catalog/conflicts/[conflictId]/ignore ─────────────────────────

describe("POST /api/catalog/conflicts/[conflictId]/ignore", () => {
  it("calls setConflictStatus with IGNORED", async () => {
    (mockSetStatus as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const res = await ignoreRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/ignore") as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(200);
    const callArgs = (mockSetStatus as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.newStatus).toBe("IGNORED");
  });
});

// ─── POST /api/catalog/conflicts/[conflictId]/resolve ────────────────────────

describe("POST /api/catalog/conflicts/[conflictId]/resolve", () => {
  it("returns 400 when resolutionStrategy missing", async () => {
    const res = await resolveRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/resolve", {}) as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(400);
  });

  it("returns 400 when resolutionStrategy invalid", async () => {
    const res = await resolveRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/resolve", { resolutionStrategy: "INVALID" }) as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(400);
  });

  it("resolves with KEEP_INTERNAL strategy", async () => {
    (mockResolve as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const res = await resolveRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/resolve", { resolutionStrategy: "KEEP_INTERNAL", note: "Trust internal" }) as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(200);
    const callArgs = (mockResolve as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.resolutionStrategy).toBe("KEEP_INTERNAL");
    expect(callArgs.note).toBe("Trust internal");
  });

  it("resolves with ACCEPT_EXTERNAL strategy", async () => {
    (mockResolve as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    const res = await resolveRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/resolve", { resolutionStrategy: "ACCEPT_EXTERNAL" }) as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(200);
    const callArgs = (mockResolve as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(callArgs.resolutionStrategy).toBe("ACCEPT_EXTERNAL");
  });

  it("returns 400 when service throws", async () => {
    (mockResolve as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));
    const res = await resolveRoute(makeReq("POST", "http://localhost/api/catalog/conflicts/conf-1/resolve", { resolutionStrategy: "DEFER" }) as never, { params: { conflictId: "conf-1" } });
    expect(res.status).toBe(400);
  });
});
