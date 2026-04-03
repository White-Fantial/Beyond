import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  getStaffActivityFeed,
  getRoleChangeHistory,
  getSettingsChangeLog,
  getIntegrationChangeLog,
} from "@/services/owner/owner-activity.service";

const mockPrisma = prisma as unknown as {
  auditLog: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const TENANT_A = "tenant-aaa";
const TENANT_B = "tenant-bbb";
const STORE_1 = "store-111";
const STORE_2 = "store-222";
const USER_1 = "user-001";
const USER_2 = "user-002";

function makeLog(overrides: Partial<{
  id: string;
  tenantId: string;
  storeId: string | null;
  actorUserId: string | null;
  action: string;
  targetType: string;
  targetId: string;
  metadataJson: unknown;
  createdAt: Date;
  actorUser: { id: string; name: string; email: string } | null;
  store: { id: string; name: string } | null;
}> = {}) {
  return {
    id: "log-001",
    tenantId: TENANT_A,
    storeId: STORE_1,
    actorUserId: USER_1,
    action: "OWNER_STAFF_INVITED",
    targetType: "StoreMembership",
    targetId: "sm-001",
    metadataJson: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    actorUser: { id: USER_1, name: "Alice", email: "alice@example.com" },
    store: { id: STORE_1, name: "Store One" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── getStaffActivityFeed ─────────────────────────────────────────────────────

describe("getStaffActivityFeed", () => {
  it("returns paginated items and total", async () => {
    const log = makeLog();
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getStaffActivityFeed(TENANT_A, { page: 1, pageSize: 50 });

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].action).toBe("OWNER_STAFF_INVITED");
    expect(result.items[0].actorName).toBe("Alice");
    expect(result.items[0].storeName).toBe("Store One");
  });

  it("scopes query to tenantId", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getStaffActivityFeed(TENANT_A, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.tenantId).toBe(TENANT_A);
  });

  it("applies storeId filter when provided", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getStaffActivityFeed(TENANT_A, { storeId: STORE_2 });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.storeId).toBe(STORE_2);
  });

  it("applies actorUserId filter when provided", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getStaffActivityFeed(TENANT_A, { actorUserId: USER_2 });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.actorUserId).toBe(USER_2);
  });

  it("applies date range filters when provided", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getStaffActivityFeed(TENANT_A, {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.createdAt).toBeDefined();
    expect(whereArg.createdAt.gte).toEqual(new Date("2026-01-01"));
  });

  it("does not include storeId filter when not provided", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getStaffActivityFeed(TENANT_A, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.storeId).toBeUndefined();
  });

  it("maps actorUser as null when missing", async () => {
    const log = makeLog({ actorUser: null, actorUserId: null });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getStaffActivityFeed(TENANT_A, {});
    expect(result.items[0].actorName).toBeNull();
    expect(result.items[0].actorEmail).toBeNull();
  });

  it("returns empty result when no logs exist", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const result = await getStaffActivityFeed(TENANT_A, {});
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});

// ─── getRoleChangeHistory ─────────────────────────────────────────────────────

describe("getRoleChangeHistory", () => {
  it("filters to role-change action types", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getRoleChangeHistory(TENANT_A, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.action).toBeDefined();
    expect(whereArg.action.in).toContain("OWNER_STAFF_ROLE_UPDATED");
    expect(whereArg.action.in).toContain("OWNER_STAFF_INVITED");
    expect(whereArg.action.in).toContain("STORE_MEMBERSHIP_UPDATED");
  });

  it("scopes to tenantId", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getRoleChangeHistory(TENANT_B, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.tenantId).toBe(TENANT_B);
  });

  it("extracts previousRole and newRole from metadata", async () => {
    const log = makeLog({
      action: "OWNER_STAFF_ROLE_UPDATED",
      metadataJson: { previousRole: "STAFF", newRole: "MANAGER" },
    });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getRoleChangeHistory(TENANT_A, {});
    expect(result.items[0].previousRole).toBe("STAFF");
    expect(result.items[0].newRole).toBe("MANAGER");
  });

  it("returns null roles when metadata is absent", async () => {
    const log = makeLog({ action: "OWNER_STAFF_INVITED", metadataJson: null });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getRoleChangeHistory(TENANT_A, {});
    expect(result.items[0].previousRole).toBeNull();
    expect(result.items[0].newRole).toBeNull();
  });

  it("includes pagination metadata", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([makeLog()]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getRoleChangeHistory(TENANT_A, { page: 2, pageSize: 10 });
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
  });
});

// ─── getSettingsChangeLog ─────────────────────────────────────────────────────

describe("getSettingsChangeLog", () => {
  it("filters to settings-change action types", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getSettingsChangeLog(TENANT_A, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.action.in).toContain("OWNER_STORE_SETTINGS_UPDATED");
    expect(whereArg.action.in).toContain("OWNER_STORE_HOURS_UPDATED");
    expect(whereArg.action.in).toContain("OWNER_PRODUCT_UPDATED");
  });

  it("resolves catalog category correctly", async () => {
    const log = makeLog({ action: "OWNER_PRODUCT_UPDATED", targetType: "CatalogProduct" });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getSettingsChangeLog(TENANT_A, {});
    expect(result.items[0].category).toBe("catalog");
  });

  it("resolves store_profile category for OWNER_STORE_SETTINGS_UPDATED", async () => {
    const log = makeLog({ action: "OWNER_STORE_SETTINGS_UPDATED", targetType: "Store" });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getSettingsChangeLog(TENANT_A, {});
    expect(result.items[0].category).toBe("store_profile");
  });

  it("resolves store_hours category for OWNER_STORE_HOURS_UPDATED", async () => {
    const log = makeLog({ action: "OWNER_STORE_HOURS_UPDATED", targetType: "Store" });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getSettingsChangeLog(TENANT_A, {});
    expect(result.items[0].category).toBe("store_hours");
  });

  it("scopes to tenantId", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getSettingsChangeLog(TENANT_B, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.tenantId).toBe(TENANT_B);
  });

  it("applies storeId filter", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getSettingsChangeLog(TENANT_A, { storeId: STORE_1 });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.storeId).toBe(STORE_1);
  });
});

// ─── getIntegrationChangeLog ──────────────────────────────────────────────────

describe("getIntegrationChangeLog", () => {
  it("filters to integration-change action types", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getIntegrationChangeLog(TENANT_A, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.action.in).toContain("integration.connected");
    expect(whereArg.action.in).toContain("integration.disconnected");
    expect(whereArg.action.in).toContain("connection_credential.rotated");
    expect(whereArg.action.in).toContain("OWNER_CATALOG_SYNC_REQUESTED");
  });

  it("extracts provider from metadata", async () => {
    const log = makeLog({
      action: "integration.connected",
      targetType: "Connection",
      metadataJson: { provider: "LOYVERSE" },
    });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getIntegrationChangeLog(TENANT_A, {});
    expect(result.items[0].provider).toBe("LOYVERSE");
  });

  it("returns null provider when metadata lacks it", async () => {
    const log = makeLog({ action: "connection.created", metadataJson: null });
    mockPrisma.auditLog.findMany.mockResolvedValue([log]);
    mockPrisma.auditLog.count.mockResolvedValue(1);

    const result = await getIntegrationChangeLog(TENANT_A, {});
    expect(result.items[0].provider).toBeNull();
  });

  it("scopes to tenantId", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getIntegrationChangeLog(TENANT_B, {});

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.tenantId).toBe(TENANT_B);
  });

  it("applies date range filter", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    await getIntegrationChangeLog(TENANT_A, {
      startDate: "2026-02-01",
      endDate: "2026-02-28",
    });

    const whereArg = mockPrisma.auditLog.findMany.mock.calls[0][0].where;
    expect(whereArg.createdAt).toBeDefined();
    expect(whereArg.createdAt.lte).toBeDefined();
  });

  it("returns correct pagination defaults", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.auditLog.count.mockResolvedValue(0);

    const result = await getIntegrationChangeLog(TENANT_A, {});
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });
});
