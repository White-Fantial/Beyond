/**
 * Phase 7: Catalog Sync — API Endpoint Tests
 *
 * Tests all sync API routes with mocked service layer.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock services ────────────────────────────────────────────────────────────

vi.mock("@/services/catalog-sync-planner.service", () => ({
  buildSyncPlanForConnection: vi.fn(),
  getSyncPoliciesForConnection: vi.fn(),
  listSyncPlans: vi.fn(),
  getSyncPlan: vi.fn(),
  previewSyncPlan: vi.fn(),
  validateSyncPlan: vi.fn(),
  getDefaultPolicy: vi.fn(),
}));

vi.mock("@/services/catalog-sync-executor.service", () => ({
  applySyncPlan: vi.fn(),
  applySyncPlanItem: vi.fn(),
  retrySyncPlanItem: vi.fn(),
  cancelSyncPlan: vi.fn(),
  getSyncInboxSummary: vi.fn(),
  getSyncPlan: vi.fn(),
  listSyncPlans: vi.fn(),
  previewSyncPlan: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogSyncPolicy: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    externalCatalogChange: {
      findMany: vi.fn(),
    },
  },
}));

import {
  buildSyncPlanForConnection as mockBuildPlan,
  getSyncPoliciesForConnection as mockGetPolicies,
  listSyncPlans as mockListPlans,
  getSyncPlan as mockGetPlan,
  previewSyncPlan as mockPreview,
} from "@/services/catalog-sync-planner.service";

import {
  applySyncPlan as mockApply,
  retrySyncPlanItem as mockRetry,
  cancelSyncPlan as mockCancel,
  getSyncInboxSummary as mockInboxSummary,
} from "@/services/catalog-sync-executor.service";

import { prisma } from "@/lib/prisma";

import { GET as listPoliciesRoute, POST as createPolicyRoute } from "@/app/api/catalog/sync/policies/route";
import { PATCH as patchPolicyRoute } from "@/app/api/catalog/sync/policies/[policyId]/route";
import { POST as buildPlanRoute } from "@/app/api/catalog/sync/plans/build/route";
import { GET as listPlansRoute } from "@/app/api/catalog/sync/plans/route";
import { GET as getPlanRoute } from "@/app/api/catalog/sync/plans/[planId]/route";
import { GET as previewRoute } from "@/app/api/catalog/sync/plans/[planId]/preview/route";
import { POST as applyRoute } from "@/app/api/catalog/sync/plans/[planId]/apply/route";
import { POST as cancelRoute } from "@/app/api/catalog/sync/plans/[planId]/cancel/route";
import { POST as retryRoute } from "@/app/api/catalog/sync/plan-items/[planItemId]/retry/route";
import { GET as inboxRoute } from "@/app/api/catalog/sync/inbox/route";
import { GET as summaryRoute } from "@/app/api/catalog/sync/summary/route";

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

const NOW = new Date().toISOString();

function makePlan(overrides = {}) {
  return {
    id: "plan-1",
    tenantId: "t1",
    storeId: "s1",
    connectionId: "conn-1",
    source: "AUTO",
    status: "READY",
    basedOnImportRunId: null,
    basedOnExternalChangeId: null,
    basedOnConflictId: null,
    summary: null,
    createdByUserId: null,
    createdAt: NOW,
    updatedAt: NOW,
    items: [],
    ...overrides,
  };
}

// ─── 1. GET /api/catalog/sync/policies — missing connectionId ─────────────────

describe("GET /api/catalog/sync/policies", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await listPoliciesRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/policies") as never
    );
    expect(res.status).toBe(400);
  });

  it("returns policy list for a connection", async () => {
    (mockGetPolicies as ReturnType<typeof vi.fn>).mockResolvedValue([
      { id: "pol-1", scope: "PRODUCT", fieldPath: "name", direction: "BIDIRECTIONAL", conflictStrategy: "MANUAL_REVIEW", autoApplyMode: "SAFE_ONLY", isEnabled: true, priority: 100, createdAt: NOW, updatedAt: NOW },
    ]);

    const res = await listPoliciesRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/policies?connectionId=conn-1") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.policies).toHaveLength(1);
    expect(json.policies[0].scope).toBe("PRODUCT");
  });
});

// ─── 2. POST /api/catalog/sync/policies — create policy ──────────────────────

describe("POST /api/catalog/sync/policies", () => {
  it("returns 400 when required fields missing", async () => {
    const res = await createPolicyRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/policies", { tenantId: "t1" }) as never
    );
    expect(res.status).toBe(400);
  });

  it("creates a policy and returns 201", async () => {
    (prisma.catalogSyncPolicy.create as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pol-new",
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      scope: "PRODUCT",
      fieldPath: "name",
      direction: "BIDIRECTIONAL",
      conflictStrategy: "MANUAL_REVIEW",
      autoApplyMode: "SAFE_ONLY",
      isEnabled: true,
      priority: 100,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await createPolicyRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/policies", {
        tenantId: "t1",
        storeId: "s1",
        connectionId: "conn-1",
        scope: "PRODUCT",
        fieldPath: "name",
        direction: "BIDIRECTIONAL",
        conflictStrategy: "MANUAL_REVIEW",
        autoApplyMode: "SAFE_ONLY",
      }) as never
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.policy.id).toBe("pol-new");
  });
});

// ─── 3. PATCH /api/catalog/sync/policies/[policyId] ──────────────────────────

describe("PATCH /api/catalog/sync/policies/[policyId]", () => {
  it("returns 404 when policy not found", async () => {
    (prisma.catalogSyncPolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await patchPolicyRoute(
      makeReq("PATCH", "http://localhost/api/catalog/sync/policies/missing", { isEnabled: false }) as never,
      { params: Promise.resolve({ policyId: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("updates policy fields", async () => {
    (prisma.catalogSyncPolicy.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "pol-1" });
    (prisma.catalogSyncPolicy.update as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: "pol-1",
      isEnabled: false,
    });

    const res = await patchPolicyRoute(
      makeReq("PATCH", "http://localhost/api/catalog/sync/policies/pol-1", { isEnabled: false }) as never,
      { params: Promise.resolve({ policyId: "pol-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.policy.id).toBe("pol-1");
  });
});

// ─── 4. POST /api/catalog/sync/plans/build ───────────────────────────────────

describe("POST /api/catalog/sync/plans/build", () => {
  it("returns 400 when required fields missing", async () => {
    const res = await buildPlanRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plans/build", { tenantId: "t1" }) as never
    );
    expect(res.status).toBe(400);
  });

  it("builds and returns a sync plan", async () => {
    (mockBuildPlan as ReturnType<typeof vi.fn>).mockResolvedValue(makePlan());

    const res = await buildPlanRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plans/build", {
        tenantId: "t1",
        storeId: "s1",
        connectionId: "conn-1",
      }) as never
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.plan.id).toBe("plan-1");
    expect(json.plan.status).toBe("READY");
  });
});

// ─── 5. GET /api/catalog/sync/plans ──────────────────────────────────────────

describe("GET /api/catalog/sync/plans", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await listPlansRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/plans") as never
    );
    expect(res.status).toBe(400);
  });

  it("returns list of plans", async () => {
    (mockListPlans as ReturnType<typeof vi.fn>).mockResolvedValue([makePlan()]);

    const res = await listPlansRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/plans?connectionId=conn-1") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plans).toHaveLength(1);
  });
});

// ─── 6. GET /api/catalog/sync/plans/[planId] ─────────────────────────────────

describe("GET /api/catalog/sync/plans/[planId]", () => {
  it("returns 404 when plan not found", async () => {
    (mockGetPlan as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const res = await getPlanRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/plans/missing") as never,
      { params: Promise.resolve({ planId: "missing" }) }
    );
    expect(res.status).toBe(404);
  });

  it("returns plan details", async () => {
    (mockGetPlan as ReturnType<typeof vi.fn>).mockResolvedValue(makePlan({ items: [] }));

    const res = await getPlanRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/plans/plan-1") as never,
      { params: Promise.resolve({ planId: "plan-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.plan.id).toBe("plan-1");
  });
});

// ─── 7. GET /api/catalog/sync/plans/[planId]/preview ─────────────────────────

describe("GET /api/catalog/sync/plans/[planId]/preview", () => {
  it("returns preview summary", async () => {
    (mockPreview as ReturnType<typeof vi.fn>).mockResolvedValue({
      plan: makePlan(),
      readyCount: 2,
      blockedCount: 1,
      skippedCount: 0,
      appliedCount: 0,
      failedCount: 0,
      items: [],
    });

    const res = await previewRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/plans/plan-1/preview") as never,
      { params: Promise.resolve({ planId: "plan-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.preview.readyCount).toBe(2);
  });
});

// ─── 8. POST /api/catalog/sync/plans/[planId]/apply ──────────────────────────

describe("POST /api/catalog/sync/plans/[planId]/apply", () => {
  it("applies the plan and returns result", async () => {
    (mockApply as ReturnType<typeof vi.fn>).mockResolvedValue({ applied: 3, failed: 0, skipped: 1 });

    const res = await applyRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plans/plan-1/apply") as never,
      { params: Promise.resolve({ planId: "plan-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.result.applied).toBe(3);
    expect(json.result.failed).toBe(0);
  });
});

// ─── 9. POST /api/catalog/sync/plans/[planId]/cancel ─────────────────────────

describe("POST /api/catalog/sync/plans/[planId]/cancel", () => {
  it("cancels the plan", async () => {
    (mockCancel as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

    const res = await cancelRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plans/plan-1/cancel") as never,
      { params: Promise.resolve({ planId: "plan-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockCancel).toHaveBeenCalledWith("plan-1");
  });
});

// ─── 10. POST /api/catalog/sync/plan-items/[planItemId]/retry ─────────────────

describe("POST /api/catalog/sync/plan-items/[planItemId]/retry", () => {
  it("retries a FAILED plan item", async () => {
    (mockRetry as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

    const res = await retryRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plan-items/item-1/retry") as never,
      { params: Promise.resolve({ planItemId: "item-1" }) }
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it("returns 422 when item cannot be retried", async () => {
    (mockRetry as ReturnType<typeof vi.fn>).mockResolvedValue({ success: false, error: "Item is not FAILED" });

    const res = await retryRoute(
      makeReq("POST", "http://localhost/api/catalog/sync/plan-items/item-bad/retry") as never,
      { params: Promise.resolve({ planItemId: "item-bad" }) }
    );
    expect(res.status).toBe(422);
  });
});

// ─── 11. GET /api/catalog/sync/inbox ─────────────────────────────────────────

describe("GET /api/catalog/sync/inbox", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await inboxRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/inbox") as never
    );
    expect(res.status).toBe(400);
  });

  it("returns summary and open changes", async () => {
    (mockInboxSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      openExternalChanges: 5,
      openConflicts: 2,
      readyPlanItems: 3,
      blockedPlanItems: 1,
      failedPlanItems: 0,
      lastSyncAt: null,
      activePlanId: null,
    });
    (prisma.externalCatalogChange.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const res = await inboxRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/inbox?connectionId=conn-1") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.openExternalChanges).toBe(5);
    expect(json.summary.openConflicts).toBe(2);
  });
});

// ─── 12. GET /api/catalog/sync/summary ───────────────────────────────────────

describe("GET /api/catalog/sync/summary", () => {
  it("returns 400 when connectionId missing", async () => {
    const res = await summaryRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/summary") as never
    );
    expect(res.status).toBe(400);
  });

  it("returns sync summary", async () => {
    (mockInboxSummary as ReturnType<typeof vi.fn>).mockResolvedValue({
      connectionId: "conn-1",
      openExternalChanges: 10,
      openConflicts: 0,
      readyPlanItems: 5,
      blockedPlanItems: 0,
      failedPlanItems: 0,
      lastSyncAt: NOW,
      activePlanId: "plan-active",
    });

    const res = await summaryRoute(
      makeReq("GET", "http://localhost/api/catalog/sync/summary?connectionId=conn-1") as never
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.summary.readyPlanItems).toBe(5);
    expect(json.summary.activePlanId).toBe("plan-active");
  });
});

// ─── 13. POST /api/catalog/sync/plans/build — invalid JSON ───────────────────

describe("POST /api/catalog/sync/plans/build — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/catalog/sync/plans/build", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await buildPlanRoute(req as never);
    expect(res.status).toBe(400);
  });
});

// ─── 14. POST /api/catalog/sync/policies — invalid JSON ──────────────────────

describe("POST /api/catalog/sync/policies — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/catalog/sync/policies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await createPolicyRoute(req as never);
    expect(res.status).toBe(400);
  });
});

// ─── 15. PATCH /api/catalog/sync/policies/[policyId] — invalid JSON ──────────

describe("PATCH /api/catalog/sync/policies/[policyId] — invalid JSON", () => {
  it("returns 400 for malformed JSON", async () => {
    const req = new Request("http://localhost/api/catalog/sync/policies/pol-1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    const res = await patchPolicyRoute(req as never, { params: Promise.resolve({ policyId: "pol-1" }) });
    expect(res.status).toBe(400);
  });
});
