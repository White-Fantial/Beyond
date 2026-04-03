import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alertRule: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    store: {
      findFirst: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listAlertRules,
  getAlertRule,
  createAlertRule,
  updateAlertRule,
  toggleAlertRule,
  deleteAlertRule,
} from "@/services/owner/owner-alert-rule.service";

const mockPrisma = prisma as unknown as {
  alertRule: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  store: {
    findFirst: ReturnType<typeof vi.fn>;
  };
};

const TENANT_A = "tenant-aaa";
const RULE_1 = "rule-001";
const STORE_1 = "store-111";
const USER_1 = "user-001";

function makeRule(overrides: Partial<{
  id: string;
  tenantId: string;
  storeId: string | null;
  metricType: string;
  threshold: { toNumber: () => number };
  windowMinutes: number;
  enabled: boolean;
  lastFiredAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  store: { id: string; name: string } | null;
  createdByUser: { id: string; name: string } | null;
}> = {}) {
  return {
    id: RULE_1,
    tenantId: TENANT_A,
    storeId: null,
    metricType: "CANCELLATION_RATE",
    threshold: { toNumber: () => 20 },
    windowMinutes: 60,
    enabled: true,
    lastFiredAt: null,
    createdBy: USER_1,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    store: null,
    createdByUser: { id: USER_1, name: "Alice" },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listAlertRules ───────────────────────────────────────────────────────────

describe("listAlertRules", () => {
  it("returns paginated rules for tenant", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.alertRule.count.mockResolvedValue(1);

    const result = await listAlertRules(TENANT_A, 1, 50);

    expect(result.total).toBe(1);
    expect(result.page).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].metricType).toBe("CANCELLATION_RATE");
    expect(result.items[0].threshold).toBe(20);
  });

  it("passes tenantId filter to Prisma", async () => {
    mockPrisma.alertRule.findMany.mockResolvedValue([]);
    mockPrisma.alertRule.count.mockResolvedValue(0);

    await listAlertRules(TENANT_A);

    expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: TENANT_A } })
    );
  });

  it("returns empty list when no rules exist", async () => {
    mockPrisma.alertRule.findMany.mockResolvedValue([]);
    mockPrisma.alertRule.count.mockResolvedValue(0);

    const result = await listAlertRules(TENANT_A);
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it("maps store name correctly", async () => {
    const rule = makeRule({ storeId: STORE_1, store: { id: STORE_1, name: "Addington" } });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.alertRule.count.mockResolvedValue(1);

    const result = await listAlertRules(TENANT_A);
    expect(result.items[0].storeName).toBe("Addington");
  });
});

// ─── getAlertRule ─────────────────────────────────────────────────────────────

describe("getAlertRule", () => {
  it("returns rule when found", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.findFirst.mockResolvedValue(rule);

    const result = await getAlertRule(TENANT_A, RULE_1);
    expect(result).not.toBeNull();
    expect(result!.id).toBe(RULE_1);
  });

  it("returns null when rule not found", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue(null);

    const result = await getAlertRule(TENANT_A, "nonexistent");
    expect(result).toBeNull();
  });

  it("includes tenantId in query", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue(null);

    await getAlertRule(TENANT_A, RULE_1);

    expect(mockPrisma.alertRule.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: RULE_1, tenantId: TENANT_A } })
    );
  });
});

// ─── createAlertRule ──────────────────────────────────────────────────────────

describe("createAlertRule", () => {
  it("creates a rule with defaults", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.create.mockResolvedValue(rule);

    const result = await createAlertRule(TENANT_A, USER_1, {
      metricType: "CANCELLATION_RATE",
      threshold: 20,
    });

    expect(result.metricType).toBe("CANCELLATION_RATE");
    expect(mockPrisma.alertRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          metricType: "CANCELLATION_RATE",
          threshold: 20,
          windowMinutes: 60,
          enabled: true,
        }),
      })
    );
  });

  it("validates storeId belongs to tenant", async () => {
    mockPrisma.store.findFirst.mockResolvedValue(null);

    await expect(
      createAlertRule(TENANT_A, USER_1, {
        metricType: "SOLD_OUT_COUNT",
        threshold: 5,
        storeId: "other-store",
      })
    ).rejects.toThrow("Store not found");
  });

  it("skips store validation when storeId is not provided", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.create.mockResolvedValue(rule);

    await createAlertRule(TENANT_A, USER_1, {
      metricType: "CANCELLATION_RATE",
      threshold: 20,
    });

    expect(mockPrisma.store.findFirst).not.toHaveBeenCalled();
  });

  it("uses provided windowMinutes", async () => {
    const rule = makeRule({ windowMinutes: 120 });
    mockPrisma.alertRule.create.mockResolvedValue(rule);

    await createAlertRule(TENANT_A, USER_1, {
      metricType: "CANCELLATION_RATE",
      threshold: 20,
      windowMinutes: 120,
    });

    expect(mockPrisma.alertRule.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ windowMinutes: 120 }),
      })
    );
  });
});

// ─── updateAlertRule ──────────────────────────────────────────────────────────

describe("updateAlertRule", () => {
  it("returns null when rule not found in tenant", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue(null);

    const result = await updateAlertRule(TENANT_A, RULE_1, { enabled: false });
    expect(result).toBeNull();
  });

  it("updates the rule when found", async () => {
    const rule = makeRule({ enabled: false });
    mockPrisma.alertRule.findFirst.mockResolvedValue({ id: RULE_1 });
    mockPrisma.alertRule.update.mockResolvedValue(rule);

    const result = await updateAlertRule(TENANT_A, RULE_1, { enabled: false });
    expect(result).not.toBeNull();
    expect(mockPrisma.alertRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RULE_1 },
        data: expect.objectContaining({ enabled: false }),
      })
    );
  });

  it("validates new storeId when provided", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue({ id: RULE_1 });
    mockPrisma.store.findFirst.mockResolvedValue(null);

    await expect(
      updateAlertRule(TENANT_A, RULE_1, { storeId: "bad-store" })
    ).rejects.toThrow("Store not found");
  });
});

// ─── toggleAlertRule ──────────────────────────────────────────────────────────

describe("toggleAlertRule", () => {
  it("disables a rule", async () => {
    const rule = makeRule({ enabled: false });
    mockPrisma.alertRule.findFirst.mockResolvedValue({ id: RULE_1 });
    mockPrisma.alertRule.update.mockResolvedValue(rule);

    const result = await toggleAlertRule(TENANT_A, RULE_1, false);
    expect(result!.enabled).toBe(false);
  });

  it("enables a rule", async () => {
    const rule = makeRule({ enabled: true });
    mockPrisma.alertRule.findFirst.mockResolvedValue({ id: RULE_1 });
    mockPrisma.alertRule.update.mockResolvedValue(rule);

    const result = await toggleAlertRule(TENANT_A, RULE_1, true);
    expect(result!.enabled).toBe(true);
  });
});

// ─── deleteAlertRule ──────────────────────────────────────────────────────────

describe("deleteAlertRule", () => {
  it("returns false when rule not found", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue(null);

    const result = await deleteAlertRule(TENANT_A, RULE_1);
    expect(result).toBe(false);
    expect(mockPrisma.alertRule.delete).not.toHaveBeenCalled();
  });

  it("deletes and returns true when found", async () => {
    mockPrisma.alertRule.findFirst.mockResolvedValue({ id: RULE_1 });
    mockPrisma.alertRule.delete.mockResolvedValue({});

    const result = await deleteAlertRule(TENANT_A, RULE_1);
    expect(result).toBe(true);
    expect(mockPrisma.alertRule.delete).toHaveBeenCalledWith({ where: { id: RULE_1 } });
  });
});
