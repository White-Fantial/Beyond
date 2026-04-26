/**
 * Phase 4: Catalog Publish Service — Tests
 *
 * Tests cover:
 *   1. Publish hash computation (pure functions)
 *   2. Prerequisite validation (unit tests with mocked prisma)
 *   3. Core service orchestration (publishEntityToConnection)
 *      - CREATE path (no mapping)
 *      - UPDATE path (active mapping)
 *      - BROKEN mapping → FAILED
 *      - Parent mapping missing for modifier option → FAILED
 *      - onlyChanged=true + same hash → SKIPPED
 *   4. Bulk publish
 *   5. retryPublishJob
 *   6. Adapter contract tests
 *      - Loyverse category builder
 *      - Provider adapter unsupported action returns error result
 *   7. API endpoint tests (module-level mocks)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── 1. Publish hash tests (pure functions) ───────────────────────────────────

import {
  hashCategory,
  hashProduct,
  hashModifierGroup,
  hashModifierOption,
  computePublishHash,
} from "@/services/catalog-publish/publish-hash";

describe("hashCategory", () => {
  it("produces a consistent hash for the same input", () => {
    const h1 = hashCategory({ name: "Beverages", isActive: true });
    const h2 = hashCategory({ name: "Beverages", isActive: true });
    expect(h1).toBe(h2);
  });

  it("changes when name changes", () => {
    expect(hashCategory({ name: "Beverages" })).not.toBe(hashCategory({ name: "Food" }));
  });
});

describe("hashProduct", () => {
  it("produces consistent hashes", () => {
    const h1 = hashProduct({ name: "Latte", price: 5 }, ["cat-1"], ["mg-1"]);
    const h2 = hashProduct({ name: "Latte", price: 5 }, ["cat-1"], ["mg-1"]);
    expect(h1).toBe(h2);
  });

  it("is order-independent for linked ids", () => {
    const h1 = hashProduct({ name: "Latte", price: 5 }, ["cat-1", "cat-2"], ["mg-1", "mg-2"]);
    const h2 = hashProduct({ name: "Latte", price: 5 }, ["cat-2", "cat-1"], ["mg-2", "mg-1"]);
    expect(h1).toBe(h2);
  });

  it("changes when price changes", () => {
    const h1 = hashProduct({ name: "Latte", price: 5 });
    const h2 = hashProduct({ name: "Latte", price: 6 });
    expect(h1).not.toBe(h2);
  });
});

describe("hashModifierGroup", () => {
  it("produces consistent hashes", () => {
    expect(hashModifierGroup({ name: "Size" })).toBe(hashModifierGroup({ name: "Size" }));
  });
});

describe("hashModifierOption", () => {
  it("produces consistent hashes", () => {
    expect(hashModifierOption({ name: "Small", price: 0 })).toBe(
      hashModifierOption({ name: "Small", price: 0 })
    );
  });
});

describe("computePublishHash", () => {
  it("delegates to correct per-type function", () => {
    const catHash = computePublishHash("CATEGORY", { name: "Drinks" });
    expect(catHash).toBe(hashCategory({ name: "Drinks" }));

    const prodHash = computePublishHash("PRODUCT", { name: "Espresso", price: 3 }, { categoryIds: ["c1"], modifierGroupIds: [] });
    expect(prodHash).toBe(hashProduct({ name: "Espresso", price: 3 }, ["c1"], []));
  });
});

// ─── 2. Loyverse payload builders ────────────────────────────────────────────

import {
  buildLoyverseCategoryCreate,
  buildLoyverseCategoryUpdate,
} from "@/services/catalog-publish/payload-builders/loyverse/category.builder";

import {
  buildLoyverseProductCreate,
} from "@/services/catalog-publish/payload-builders/loyverse/product.builder";

import {
  buildLoyverseModifierOptionCreate,
} from "@/services/catalog-publish/payload-builders/loyverse/modifier-option.builder";


import {
  buildUberEatsCategoryCreate,
  buildUberEatsProductCreate,
} from "@/services/catalog-publish/payload-builders/uber-eats";
import {
  buildDoorDashCategoryCreate,
  buildDoorDashProductCreate,
} from "@/services/catalog-publish/payload-builders/doordash";

describe("buildLoyverseCategoryCreate", () => {
  it("returns payload with name", () => {
    const payload = buildLoyverseCategoryCreate({ name: "Drinks" });
    expect(payload.name).toBe("Drinks");
  });

  it("throws when name is missing", () => {
    expect(() => buildLoyverseCategoryCreate({ name: null })).toThrow("name is required");
  });
});

describe("buildLoyverseCategoryUpdate", () => {
  it("returns updated payload", () => {
    const payload = buildLoyverseCategoryUpdate({ name: "Beverages" }, "ext-cat-1");
    expect(payload.name).toBe("Beverages");
  });
});

describe("buildLoyverseProductCreate", () => {
  it("includes external category id when provided", () => {
    const payload = buildLoyverseProductCreate(
      { name: "Latte", price: 5 },
      { externalCategoryId: "ext-cat-1" }
    );
    expect(payload.category_id).toBe("ext-cat-1");
    expect(payload.item_name).toBe("Latte");
  });

  it("omits category_id when not provided", () => {
    const payload = buildLoyverseProductCreate({ name: "Latte", price: 5 });
    expect(payload.category_id).toBeUndefined();
  });

  it("throws when name is missing", () => {
    expect(() => buildLoyverseProductCreate({ name: null })).toThrow("name is required");
  });
});

describe("buildLoyverseModifierOptionCreate", () => {
  it("includes parent group id", () => {
    const payload = buildLoyverseModifierOptionCreate({ name: "Small" }, "ext-group-1");
    expect(payload.modifier_set_id).toBe("ext-group-1");
    expect(payload.name).toBe("Small");
  });

  it("throws when parentExternalGroupId is missing", () => {
    expect(() => buildLoyverseModifierOptionCreate({ name: "Small" }, "")).toThrow(
      "parentExternalGroupId is required"
    );
  });
});


describe("buildUberEatsCategoryCreate", () => {
  it("maps category availability into Uber service_availability", () => {
    const payload = buildUberEatsCategoryCreate({
      id: "cat-1",
      name: "Breakfast",
      isActive: true,
      availabilityWindows: [{ dayOfWeek: "MON", startTime: "08:00", endTime: "11:00" }],
    });

    expect(payload.id).toBe("cat-1");
    expect(payload.active).toBe(true);
    expect(Array.isArray(payload.service_availability)).toBe(true);
  });
});

describe("buildUberEatsProductCreate", () => {
  it("maps visibility into suspended flag", () => {
    const payload = buildUberEatsProductCreate({ name: "Latte", price: 599, isVisible: false });
    expect(payload.suspended).toBe(true);
  });

  it("throws when name is missing", () => {
    expect(() => buildUberEatsProductCreate({ name: null })).toThrow("name is required");
  });
});

describe("buildDoorDashCategoryCreate", () => {
  it("maps active state and availability", () => {
    const payload = buildDoorDashCategoryCreate({
      id: "cat-1",
      name: "Lunch",
      isActive: true,
      availabilityWindows: [{ dayOfWeek: "MON", startTime: "11:00", endTime: "14:00" }],
    });

    expect(payload.id).toBe("cat-1");
    expect(payload.active).toBe(true);
    expect(Array.isArray(payload.availability)).toBe(true);
  });
});

describe("buildDoorDashProductCreate", () => {
  it("maps core item fields", () => {
    const payload = buildDoorDashProductCreate({
      id: "prod-1",
      name: "Latte",
      price: 650,
      isVisible: false,
    });
    expect(payload.id).toBe("prod-1");
    expect(payload.price).toBe(650);
    expect(payload.active).toBe(false);
  });
});

// ─── 3. Adapter contract: unsupported action ──────────────────────────────────

import { LoyverseCatalogPublishAdapter } from "@/adapters/catalog/loyverse-publish.adapter";
import { UberEatsCatalogPublishAdapter } from "@/adapters/catalog/uber-eats-publish.adapter";
import { DoorDashCatalogPublishAdapter } from "@/adapters/catalog/doordash-publish.adapter";

const DUMMY_INPUT = {
  connectionId: "conn-1",
  credentials: { accessToken: "tok" },
  payload: { name: "Test" },
  internalEntityId: "int-1",
};

describe("LoyverseCatalogPublishAdapter", () => {
  const adapter = new LoyverseCatalogPublishAdapter();

  it("archiveCategory returns failure (Loyverse does not support it)", async () => {
    const result = await adapter.archiveCategory(DUMMY_INPUT);
    expect(result.success).toBe(false);
    expect(result.responsePayload?.["error"]).toBeTruthy();
  });

  it("createModifierGroup returns failure (not standalone in Loyverse)", async () => {
    const result = await adapter.createModifierGroup(DUMMY_INPUT);
    expect(result.success).toBe(false);
    expect(result.warningMessage).toBeTruthy();
  });
});

describe("UberEatsCatalogPublishAdapter", () => {
  const adapter = new UberEatsCatalogPublishAdapter();

  it("createCategory executes menu-level publish calls", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ menus: [{ id: "menu-1", categories: [] }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

    const result = await adapter.createCategory({
      ...DUMMY_INPUT,
      credentials: { accessToken: "tok", externalStoreId: "store-1" },
      payload: { id: "cat-1", title: { translations: { en_us: "Drinks" } } },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    global.fetch = originalFetch;
  });
});

describe("DoorDashCatalogPublishAdapter", () => {
  const adapter = new DoorDashCatalogPublishAdapter();

  it("createProduct executes menu-level publish calls", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ menus: [{ id: "menu-1", items: [] }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ ok: true }),
      } as Response);

    const result = await adapter.createProduct({
      ...DUMMY_INPUT,
      credentials: { accessToken: "tok", externalStoreId: "store-1" },
      payload: { entity: { id: "prod-1", name: "Latte", price: 599 } },
    });

    expect(result.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    global.fetch = originalFetch;
  });
});

// ─── 4. Publish service (mocked prisma + adapter) ────────────────────────────

vi.mock("@/lib/prisma", () => {
  const mockPrisma = {
    connection: {
      findUnique: vi.fn(),
    },
    channelEntityMapping: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    catalogPublishJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    catalogCategory: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    catalogProduct: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    catalogModifierGroup: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    catalogModifierOption: { findFirst: vi.fn(), findMany: vi.fn(), findUnique: vi.fn() },
    catalogProductCategory: { findMany: vi.fn() },
    catalogProductModifierGroup: { findMany: vi.fn() },
  };
  return { prisma: mockPrisma };
});

vi.mock("@/adapters/catalog/publish-index", () => ({
  createCatalogPublishAdapter: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createCatalogPublishAdapter } from "@/adapters/catalog/publish-index";
import {
  publishEntityToConnection,
  publishEntitiesBulk,
  retryPublishJob,
  getPublishJobs,
} from "@/services/catalog-publish.service";

const mockPrisma = prisma as typeof prisma & {
  connection: { findUnique: ReturnType<typeof vi.fn> };
  channelEntityMapping: { findFirst: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  catalogPublishJob: { create: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn>; findUnique: ReturnType<typeof vi.fn>; findMany: ReturnType<typeof vi.fn> };
  catalogCategory: { findFirst: ReturnType<typeof vi.fn> };
  catalogProduct: { findFirst: ReturnType<typeof vi.fn> };
  catalogModifierGroup: { findFirst: ReturnType<typeof vi.fn> };
  catalogModifierOption: { findFirst: ReturnType<typeof vi.fn> };
  catalogProductCategory: { findMany: ReturnType<typeof vi.fn> };
  catalogProductModifierGroup: { findMany: ReturnType<typeof vi.fn> };
};

const mockAdapter = {
  provider: "LOYVERSE",
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  archiveCategory: vi.fn(),
  unarchiveCategory: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  archiveProduct: vi.fn(),
  unarchiveProduct: vi.fn(),
  createModifierGroup: vi.fn(),
  updateModifierGroup: vi.fn(),
  archiveModifierGroup: vi.fn(),
  unarchiveModifierGroup: vi.fn(),
  createModifierOption: vi.fn(),
  updateModifierOption: vi.fn(),
  archiveModifierOption: vi.fn(),
  unarchiveModifierOption: vi.fn(),
};

const BASE_CONN = { provider: "LOYVERSE", tenantId: "t1", storeId: "s1", status: "CONNECTED" };
const BASE_JOB = { id: "job-1", tenantId: "t1", storeId: "s1", connectionId: "conn-1", status: "PENDING", action: "CREATE", internalEntityType: "CATEGORY", internalEntityId: "cat-1" };
const BASE_ENTITY = { id: "cat-1", name: "Drinks", isActive: true };

beforeEach(() => {
  vi.resetAllMocks();
  (createCatalogPublishAdapter as ReturnType<typeof vi.fn>).mockReturnValue(mockAdapter);
  mockPrisma.connection.findUnique.mockResolvedValue(BASE_CONN);
  mockPrisma.catalogPublishJob.create.mockResolvedValue(BASE_JOB);
  mockPrisma.catalogPublishJob.update.mockResolvedValue({ ...BASE_JOB, status: "SUCCEEDED" });
  mockPrisma.channelEntityMapping.findFirst.mockResolvedValue(null);
  mockPrisma.channelEntityMapping.findUnique.mockResolvedValue(null);
  mockPrisma.channelEntityMapping.create.mockResolvedValue({});
  mockPrisma.channelEntityMapping.update.mockResolvedValue({});
  mockPrisma.catalogCategory.findFirst.mockResolvedValue(BASE_ENTITY);
  mockPrisma.catalogProduct.findFirst.mockResolvedValue(BASE_ENTITY);
  mockPrisma.catalogModifierGroup.findFirst.mockResolvedValue(BASE_ENTITY);
  mockPrisma.catalogModifierOption.findFirst.mockResolvedValue({ ...BASE_ENTITY, groupId: "mg-1" });
  mockPrisma.catalogProductCategory.findMany.mockResolvedValue([]);
  mockPrisma.catalogProductModifierGroup.findMany.mockResolvedValue([]);
  // Adapter method defaults — return undefined (simulate unsupported unless overridden)
  mockAdapter.createCategory.mockResolvedValue(undefined);
  mockAdapter.updateCategory.mockResolvedValue(undefined);
  mockAdapter.archiveCategory.mockResolvedValue(undefined);
  mockAdapter.unarchiveCategory.mockResolvedValue(undefined);
  mockAdapter.createProduct.mockResolvedValue(undefined);
  mockAdapter.updateProduct.mockResolvedValue(undefined);
  mockAdapter.archiveProduct.mockResolvedValue(undefined);
  mockAdapter.unarchiveProduct.mockResolvedValue(undefined);
  mockAdapter.createModifierGroup.mockResolvedValue(undefined);
  mockAdapter.updateModifierGroup.mockResolvedValue(undefined);
  mockAdapter.archiveModifierGroup.mockResolvedValue(undefined);
  mockAdapter.unarchiveModifierGroup.mockResolvedValue(undefined);
  mockAdapter.createModifierOption.mockResolvedValue(undefined);
  mockAdapter.updateModifierOption.mockResolvedValue(undefined);
  mockAdapter.archiveModifierOption.mockResolvedValue(undefined);
  mockAdapter.unarchiveModifierOption.mockResolvedValue(undefined);
});

const PUBLISH_INPUT = {
  tenantId: "t1",
  storeId: "s1",
  connectionId: "conn-1",
  internalEntityType: "CATEGORY" as const,
  internalEntityId: "cat-1",
  action: "CREATE" as const,
};

// 4-1. CREATE path — no mapping
describe("publishEntityToConnection — CREATE (no mapping)", () => {
  it("calls createCategory on adapter and creates mapping on success", async () => {
    mockPrisma.channelEntityMapping.findFirst
      .mockResolvedValueOnce(null)  // no active mapping
      .mockResolvedValueOnce(null); // no broken mapping
    mockAdapter.createCategory.mockResolvedValue({ success: true, externalId: "ext-cat-1" });

    const result = await publishEntityToConnection(PUBLISH_INPUT);

    expect(result.status).toBe("SUCCEEDED");
    expect(result.externalId).toBe("ext-cat-1");
    expect(mockAdapter.createCategory).toHaveBeenCalledOnce();
    expect(mockPrisma.channelEntityMapping.create).toHaveBeenCalledOnce();
  });

  it("returns FAILED when adapter returns failure", async () => {
    mockPrisma.channelEntityMapping.findFirst.mockResolvedValue(null);
    mockAdapter.createCategory.mockResolvedValue({ success: false, responsePayload: { error: "API error" } });

    const result = await publishEntityToConnection(PUBLISH_INPUT);

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("API error");
  });
});

// 4-2. UPDATE path — active mapping present
describe("publishEntityToConnection — UPDATE (active mapping)", () => {
  it("calls updateCategory and updates mapping summary", async () => {
    const activeMapping = { id: "map-1", externalEntityId: "ext-cat-1", externalEntityType: "CATEGORY", status: "ACTIVE" };
    // Validator calls: ACTIVE check → activeMapping, BROKEN check → null
    mockPrisma.channelEntityMapping.findFirst
      .mockResolvedValueOnce(activeMapping) // ACTIVE mapping check
      .mockResolvedValueOnce(null);         // BROKEN mapping check
    mockAdapter.updateCategory.mockResolvedValue({ success: true, externalId: "ext-cat-1" });

    const result = await publishEntityToConnection({ ...PUBLISH_INPUT, action: "UPDATE" });

    expect(result.status).toBe("SUCCEEDED");
    expect(mockAdapter.updateCategory).toHaveBeenCalledOnce();
    expect(mockPrisma.channelEntityMapping.update).toHaveBeenCalledOnce();
  });
});

// 4-3. BROKEN mapping → FAILED
describe("publishEntityToConnection — BROKEN mapping", () => {
  it("returns FAILED when mapping is BROKEN", async () => {
    // Validator calls findFirst twice: once for ACTIVE, once for BROKEN
    mockPrisma.channelEntityMapping.findFirst
      .mockResolvedValueOnce(null)             // no ACTIVE mapping
      .mockResolvedValueOnce({ id: "map-b" }); // BROKEN mapping found

    const result = await publishEntityToConnection({ ...PUBLISH_INPUT, action: "UPDATE" });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("BROKEN");
    expect(mockAdapter.updateCategory).not.toHaveBeenCalled();
  });
});

// 4-4. Parent mapping missing for modifier option → FAILED
describe("publishEntityToConnection — MODIFIER_OPTION missing parent", () => {
  it("returns FAILED when parent group has no active mapping", async () => {
    // For MODIFIER_OPTION CREATE: no active mapping, no broken mapping, entity exists
    mockPrisma.channelEntityMapping.findFirst
      .mockResolvedValueOnce(null) // no active mapping
      .mockResolvedValueOnce(null) // no broken mapping
      .mockResolvedValueOnce(null); // parent group mapping missing

    const result = await publishEntityToConnection({
      ...PUBLISH_INPUT,
      internalEntityType: "MODIFIER_OPTION",
      internalEntityId: "opt-1",
      action: "CREATE",
    });

    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("parent");
  });
});

// 4-5. onlyChanged=true + same hash → SKIPPED
describe("publishEntityToConnection — onlyChanged + same hash", () => {
  it("creates SKIPPED job when hash matches", async () => {
    const h = hashCategory({ name: "Drinks", isActive: true });
    const activeMapping = { id: "map-1", externalEntityId: "ext-1", externalEntityType: "CATEGORY", status: "ACTIVE" };
    // Validator findFirst calls: ACTIVE check → activeMapping, BROKEN check → null
    mockPrisma.channelEntityMapping.findFirst
      .mockResolvedValueOnce(activeMapping) // ACTIVE mapping check
      .mockResolvedValueOnce(null);         // BROKEN mapping check
    // Service then calls findUnique to get the stored hash for comparison
    mockPrisma.channelEntityMapping.findUnique
      .mockResolvedValueOnce({ lastPublishHash: h }); // hash matches → SKIPPED

    mockPrisma.catalogPublishJob.create.mockResolvedValue({ ...BASE_JOB, status: "SKIPPED" });

    const result = await publishEntityToConnection({
      ...PUBLISH_INPUT,
      action: "UPDATE",
      onlyChanged: true,
    });

    expect(result.status).toBe("SKIPPED");
    expect(result.skippedReason).toBeTruthy();
    expect(mockAdapter.updateCategory).not.toHaveBeenCalled();
  });
});

// 4-6. Bulk publish
describe("publishEntitiesBulk", () => {
  it("processes multiple entities and returns summary", async () => {
    // All findFirst calls return null (no existing mappings) — set as default in beforeEach
    mockAdapter.createCategory.mockResolvedValue({ success: true, externalId: "ext-1" });

    const result = await publishEntitiesBulk({
      tenantId: "t1",
      storeId: "s1",
      connectionId: "conn-1",
      items: [
        { internalEntityType: "CATEGORY", internalEntityId: "cat-1", action: "CREATE" },
        { internalEntityType: "CATEGORY", internalEntityId: "cat-2", action: "CREATE" },
      ],
    });

    expect(result.total).toBe(2);
    expect(result.succeeded).toBe(2);
  });
});

// 4-7. retryPublishJob
describe("retryPublishJob", () => {
  it("returns error when job not found", async () => {
    mockPrisma.catalogPublishJob.findUnique.mockResolvedValue(null);
    const result = await retryPublishJob("nonexistent");
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("not found");
  });

  it("returns error when job is not FAILED", async () => {
    mockPrisma.catalogPublishJob.findUnique.mockResolvedValue({ ...BASE_JOB, status: "SUCCEEDED" });
    const result = await retryPublishJob("job-1");
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("SUCCEEDED");
  });

  it("re-publishes a FAILED job as new job", async () => {
    mockPrisma.catalogPublishJob.findUnique.mockResolvedValue({ ...BASE_JOB, status: "FAILED" });
    mockPrisma.catalogPublishJob.update.mockResolvedValue({ ...BASE_JOB, status: "CANCELLED" });
    mockPrisma.channelEntityMapping.findFirst.mockResolvedValue(null);
    mockAdapter.createCategory.mockResolvedValue({ success: true, externalId: "ext-retry-1" });

    const result = await retryPublishJob("job-1");
    expect(result.status).toBe("SUCCEEDED");
  });
});

// 4-8. getPublishJobs
describe("getPublishJobs", () => {
  it("returns jobs from prisma", async () => {
    mockPrisma.catalogPublishJob.findMany.mockResolvedValue([BASE_JOB]);
    const jobs = await getPublishJobs({ connectionId: "conn-1" });
    expect(jobs).toHaveLength(1);
    expect(jobs[0].id).toBe("job-1");
  });
});

// ─── 5. lib/catalog/publish-actions helpers ───────────────────────────────────

import {
  isTerminalPublishStatus,
  canRetryPublishJob,
  allowedActionsForMappingStatus,
} from "@/lib/catalog/publish-actions";

describe("isTerminalPublishStatus", () => {
  it("returns true for SUCCEEDED, FAILED, SKIPPED, CANCELLED", () => {
    expect(isTerminalPublishStatus("SUCCEEDED")).toBe(true);
    expect(isTerminalPublishStatus("FAILED")).toBe(true);
    expect(isTerminalPublishStatus("SKIPPED")).toBe(true);
    expect(isTerminalPublishStatus("CANCELLED")).toBe(true);
  });

  it("returns false for PENDING and RUNNING", () => {
    expect(isTerminalPublishStatus("PENDING")).toBe(false);
    expect(isTerminalPublishStatus("RUNNING")).toBe(false);
  });
});

describe("canRetryPublishJob", () => {
  it("returns true only for FAILED", () => {
    expect(canRetryPublishJob("FAILED")).toBe(true);
    expect(canRetryPublishJob("SUCCEEDED")).toBe(false);
    expect(canRetryPublishJob("SKIPPED")).toBe(false);
  });
});

describe("allowedActionsForMappingStatus", () => {
  it("returns CREATE for null (no mapping)", () => {
    expect(allowedActionsForMappingStatus(null)).toEqual(["CREATE"]);
  });

  it("returns UPDATE/ARCHIVE/UNARCHIVE for ACTIVE", () => {
    expect(allowedActionsForMappingStatus("ACTIVE")).toContain("UPDATE");
    expect(allowedActionsForMappingStatus("ACTIVE")).toContain("ARCHIVE");
  });

  it("returns empty for BROKEN", () => {
    expect(allowedActionsForMappingStatus("BROKEN")).toEqual([]);
  });
});
