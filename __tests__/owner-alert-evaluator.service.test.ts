import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    alertRule: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
    },
    connection: {
      count: vi.fn(),
    },
    catalogProduct: {
      count: vi.fn(),
    },
    membership: {
      findMany: vi.fn(),
    },
    notification: {
      create: vi.fn(),
    },
  },
}));

// Also mock the createNotification from notification service since evaluator imports it
vi.mock("@/services/owner/owner-notification.service", () => ({
  createNotification: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { createNotification } from "@/services/owner/owner-notification.service";
import { evaluateAlertRules } from "@/services/owner/owner-alert-evaluator.service";

const mockPrisma = prisma as unknown as {
  alertRule: {
    findMany: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  order: {
    count: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  store: {
    findMany: ReturnType<typeof vi.fn>;
  };
  connection: {
    count: ReturnType<typeof vi.fn>;
  };
  catalogProduct: {
    count: ReturnType<typeof vi.fn>;
  };
  membership: {
    findMany: ReturnType<typeof vi.fn>;
  };
  notification: {
    create: ReturnType<typeof vi.fn>;
  };
};

const mockCreateNotification = createNotification as ReturnType<typeof vi.fn>;

const TENANT_A = "tenant-aaa";
const RULE_1 = "rule-001";
const USER_1 = "user-001";

function makeRule(overrides: Partial<{
  id: string;
  tenantId: string;
  storeId: string | null;
  metricType: string;
  threshold: { toNumber: () => number };
  windowMinutes: number;
  enabled: boolean;
  store: { id: string; name: string } | null;
  tenant: { id: string };
}> = {}) {
  return {
    id: RULE_1,
    tenantId: TENANT_A,
    storeId: null,
    metricType: "CANCELLATION_RATE",
    threshold: { toNumber: () => 20 },
    windowMinutes: 60,
    enabled: true,
    store: null,
    tenant: { id: TENANT_A },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default membership
  mockPrisma.membership.findMany.mockResolvedValue([{ userId: USER_1 }]);
  mockPrisma.alertRule.update.mockResolvedValue({});
  mockCreateNotification.mockResolvedValue({});
});

// ─── evaluateAlertRules ───────────────────────────────────────────────────────

describe("evaluateAlertRules", () => {
  it("returns zero counts when no rules exist", async () => {
    mockPrisma.alertRule.findMany.mockResolvedValue([]);

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.rulesEvaluated).toBe(0);
    expect(result.notificationsCreated).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("does not create notification when threshold is not breached", async () => {
    const rule = makeRule(); // threshold 20%
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    // 10 orders, 1 cancelled = 10% cancellation < 20%
    mockPrisma.order.count
      .mockResolvedValueOnce(10) // total
      .mockResolvedValueOnce(1); // cancelled

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.rulesEvaluated).toBe(1);
    expect(result.notificationsCreated).toBe(0);
    expect(mockCreateNotification).not.toHaveBeenCalled();
  });

  it("creates notification when cancellation rate exceeds threshold", async () => {
    const rule = makeRule(); // threshold 20%
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    // 10 orders, 3 cancelled = 30% > 20%
    mockPrisma.order.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3);

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(1);
    expect(mockCreateNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "ALERT_TRIGGERED",
        tenantId: TENANT_A,
        userId: USER_1,
      })
    );
  });

  it("updates lastFiredAt on the rule when threshold is breached", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.order.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);

    await evaluateAlertRules(TENANT_A);

    expect(mockPrisma.alertRule.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RULE_1 },
        data: { lastFiredAt: expect.any(Date) },
      })
    );
  });

  it("notifies all OWNER and ADMIN members", async () => {
    const rule = makeRule();
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.order.count.mockResolvedValueOnce(10).mockResolvedValueOnce(4);
    mockPrisma.membership.findMany.mockResolvedValue([
      { userId: "user-001" },
      { userId: "user-002" },
    ]);

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(2);
    expect(mockCreateNotification).toHaveBeenCalledTimes(2);
  });

  it("handles SOLD_OUT_COUNT metric", async () => {
    const rule = makeRule({ metricType: "SOLD_OUT_COUNT", threshold: { toNumber: () => 3 } });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.store.findMany.mockResolvedValue([{ id: "store-001" }]);
    mockPrisma.catalogProduct.count.mockResolvedValue(5); // 5 > 3

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(1);
  });

  it("handles POS_DISCONNECT metric with threshold=0", async () => {
    const rule = makeRule({
      metricType: "POS_DISCONNECT",
      threshold: { toNumber: () => 0 },
    });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.connection.count.mockResolvedValue(1); // 1 > 0

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(1);
  });

  it("does not breach when POS_DISCONNECT count is 0 with threshold 0", async () => {
    const rule = makeRule({
      metricType: "POS_DISCONNECT",
      threshold: { toNumber: () => 0 },
    });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    mockPrisma.connection.count.mockResolvedValue(0); // 0 is NOT > 0

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(0);
  });

  it("handles REVENUE_DROP metric (negative threshold breached when value is below)", async () => {
    // threshold -30 means: alert when drop is more than 30%
    const rule = makeRule({
      metricType: "REVENUE_DROP",
      threshold: { toNumber: () => -30 },
    });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    // current period: 500, prior period: 1000 → -50% drop < -30% threshold
    mockPrisma.order.findMany
      .mockResolvedValueOnce([{ totalAmountMinor: 500 }])   // current
      .mockResolvedValueOnce([{ totalAmountMinor: 1000 }]); // prior

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(1);
  });

  it("does not breach REVENUE_DROP when drop is within threshold", async () => {
    const rule = makeRule({
      metricType: "REVENUE_DROP",
      threshold: { toNumber: () => -30 },
    });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule]);
    // -10% drop is above -30% threshold (no breach)
    mockPrisma.order.findMany
      .mockResolvedValueOnce([{ totalAmountMinor: 900 }])
      .mockResolvedValueOnce([{ totalAmountMinor: 1000 }]);

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.notificationsCreated).toBe(0);
  });

  it("captures errors per rule and continues evaluating others", async () => {
    const rule1 = makeRule({ id: "rule-001" });
    const rule2 = makeRule({ id: "rule-002", metricType: "SOLD_OUT_COUNT", threshold: { toNumber: () => 5 } });
    mockPrisma.alertRule.findMany.mockResolvedValue([rule1, rule2]);

    // rule1 throws during metric evaluation
    mockPrisma.order.count.mockRejectedValueOnce(new Error("DB error"));

    // rule2 evaluates fine: 10 sold out > 5
    mockPrisma.store.findMany.mockResolvedValue([{ id: "store-001" }]);
    mockPrisma.catalogProduct.count.mockResolvedValue(10);

    const result = await evaluateAlertRules(TENANT_A);

    expect(result.rulesEvaluated).toBe(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain("rule-001");
    expect(result.notificationsCreated).toBe(1);
  });

  it("scopes query to tenantId when provided", async () => {
    mockPrisma.alertRule.findMany.mockResolvedValue([]);

    await evaluateAlertRules(TENANT_A);

    expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enabled: true, tenantId: TENANT_A },
      })
    );
  });

  it("queries all tenants when no scopedTenantId provided", async () => {
    mockPrisma.alertRule.findMany.mockResolvedValue([]);

    await evaluateAlertRules();

    expect(mockPrisma.alertRule.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { enabled: true },
      })
    );
  });
});
