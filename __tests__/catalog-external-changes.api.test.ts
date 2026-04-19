/**
 * Phase 5: External Change Detection — API Endpoint Tests
 *
 * Tests all 6 API routes with mocked service layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the service before importing routes
vi.mock("@/services/external-change-detection.service", () => ({
  detectExternalChangesForImportRun: vi.fn(),
  listExternalChanges: vi.fn(),
  getExternalChangeSummary: vi.fn(),
  getExternalChange: vi.fn(),
  acknowledgeExternalChange: vi.fn(),
  ignoreExternalChange: vi.fn(),
}));

import {
  detectExternalChangesForImportRun as mockDetect,
  listExternalChanges as mockList,
  getExternalChangeSummary as mockSummary,
  getExternalChange as mockGetOne,
  acknowledgeExternalChange as mockAck,
  ignoreExternalChange as mockIgnore,
} from "@/services/external-change-detection.service";

import { POST as detectRoute } from "@/app/api/catalog/external-changes/detect/route";
import { GET as listRoute } from "@/app/api/catalog/external-changes/route";
import { GET as summaryRoute } from "@/app/api/catalog/external-changes/summary/route";
import { GET as getOneRoute } from "@/app/api/catalog/external-changes/[changeId]/route";
import { POST as ackRoute } from "@/app/api/catalog/external-changes/[changeId]/acknowledge/route";
import { POST as ignoreRoute } from "@/app/api/catalog/external-changes/[changeId]/ignore/route";

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

describe("POST /api/catalog/external-changes/detect", () => {
  it("returns 400 when importRunId missing", async () => {
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/detect", {}) as never);
    expect(res.status).toBe(400);
  });

  it("returns 200 on success", async () => {
    (mockDetect as ReturnType<typeof vi.fn>).mockResolvedValue({
      importRunId: "run-1",
      diffStatus: "SUCCEEDED",
      created: 2,
      updated: 0,
      deleted: 0,
      structureUpdated: 0,
      unchanged: 0,
      comparedImportRunId: null,
    });
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/detect", { importRunId: "run-1" }) as never);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.diffStatus).toBe("SUCCEEDED");
    expect(json.created).toBe(2);
  });

  it("returns 500 when diffStatus is FAILED", async () => {
    (mockDetect as ReturnType<typeof vi.fn>).mockResolvedValue({
      importRunId: "run-1",
      diffStatus: "FAILED",
      errorMessage: "not found",
      created: 0,
      updated: 0,
      deleted: 0,
      structureUpdated: 0,
      unchanged: 0,
      comparedImportRunId: null,
    });
    const res = await detectRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/detect", { importRunId: "run-1" }) as never);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/catalog/external-changes", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await listRoute(makeReq("GET", "http://localhost/api/catalog/external-changes") as never);
    expect(res.status).toBe(400);
  });

  it("returns changes list", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([{ id: "c1", changeKind: "CREATED" }]);
    const res = await listRoute(makeReq("GET", "http://localhost/api/catalog/external-changes?connectionId=conn-1") as never);
    const json = await res.json();
    expect(json.changes).toHaveLength(1);
    expect(json.changes[0].id).toBe("c1");
  });

  it("passes filters through to service", async () => {
    (mockList as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    await listRoute(makeReq("GET", "http://localhost/api/catalog/external-changes?connectionId=conn-1&status=OPEN&entityType=PRODUCT") as never);
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: "OPEN", entityType: "PRODUCT" }));
  });
});

describe("GET /api/catalog/external-changes/summary", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await summaryRoute(makeReq("GET", "http://localhost/api/catalog/external-changes/summary") as never);
    expect(res.status).toBe(400);
  });

  it("returns summary", async () => {
    (mockSummary as ReturnType<typeof vi.fn>).mockResolvedValue({ totalOpen: 3, created: 1, updated: 2 });
    const res = await summaryRoute(makeReq("GET", "http://localhost/api/catalog/external-changes/summary?connectionId=conn-1") as never);
    const json = await res.json();
    expect(json.totalOpen).toBe(3);
  });
});

describe("GET /api/catalog/external-changes/[changeId]", () => {
  it("returns 404 when change not found", async () => {
    (mockGetOne as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await getOneRoute(makeReq("GET", "http://localhost/api/catalog/external-changes/missing") as never, { params: Promise.resolve({ changeId: "missing" }) });
    expect(res.status).toBe(404);
  });

  it("returns change with field diffs", async () => {
    (mockGetOne as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", changeKind: "UPDATED", fieldDiffs: [{ fieldPath: "name" }] });
    const res = await getOneRoute(makeReq("GET", "http://localhost/api/catalog/external-changes/c1") as never, { params: Promise.resolve({ changeId: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.id).toBe("c1");
    expect(json.fieldDiffs).toHaveLength(1);
  });
});

describe("POST /api/catalog/external-changes/[changeId]/acknowledge", () => {
  it("acknowledges and returns change", async () => {
    (mockAck as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", status: "ACKNOWLEDGED" });
    const res = await ackRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/c1/acknowledge") as never, { params: Promise.resolve({ changeId: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("ACKNOWLEDGED");
  });

  it("returns 404 when service throws", async () => {
    (mockAck as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));
    const res = await ackRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/missing/acknowledge") as never, { params: Promise.resolve({ changeId: "missing" }) });
    expect(res.status).toBe(404);
  });
});

describe("POST /api/catalog/external-changes/[changeId]/ignore", () => {
  it("ignores and returns change", async () => {
    (mockIgnore as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "c1", status: "IGNORED" });
    const res = await ignoreRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/c1/ignore") as never, { params: Promise.resolve({ changeId: "c1" }) });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe("IGNORED");
  });

  it("returns 404 when service throws", async () => {
    (mockIgnore as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("not found"));
    const res = await ignoreRoute(makeReq("POST", "http://localhost/api/catalog/external-changes/missing/ignore") as never, { params: Promise.resolve({ changeId: "missing" }) });
    expect(res.status).toBe(404);
  });
});
