import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantSubscription: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    plan: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    billingInvoice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    billingInvoiceLine: {
      findMany: vi.fn(),
    },
    paymentAttempt: {
      findMany: vi.fn(),
    },
    subscriptionChangeRequest: {
      create: vi.fn(),
      update: vi.fn(),
    },
    billingEventLog: {
      create: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
    tenantSubscriptionEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/billing/usage", () => ({
  calculateTenantCurrentUsage: vi.fn(),
}));

vi.mock("@/adapters/billing", () => ({
  mockBillingAdapter: {
    getSubscription: vi.fn(),
    listInvoices: vi.fn(),
    previewPlanChange: vi.fn().mockResolvedValue({ prorationMinor: null, effectiveAt: null, previewLines: [] }),
    applyPlanChange: vi.fn().mockResolvedValue(true),
    retryInvoicePayment: vi.fn().mockResolvedValue(true),
    getPaymentMethodSummary: vi.fn().mockResolvedValue(null),
  },
}));

import { prisma } from "@/lib/prisma";
import { calculateTenantCurrentUsage } from "@/lib/billing/usage";
import {
  getUsageVsLimits,
  previewPlanChange,
  getBillingAlerts,
} from "@/services/owner/owner-billing.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

type MockPrisma = {
  tenantSubscription: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  plan: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  billingInvoice: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  billingInvoiceLine: { findMany: ReturnType<typeof vi.fn> };
  paymentAttempt: { findMany: ReturnType<typeof vi.fn> };
  subscriptionChangeRequest: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  billingEventLog: { create: ReturnType<typeof vi.fn> };
  auditLog: { create: ReturnType<typeof vi.fn> };
  tenantSubscriptionEvent: { create: ReturnType<typeof vi.fn> };
};

const mockPrisma = prisma as unknown as MockPrisma;
const mockCalculateUsage = calculateTenantCurrentUsage as ReturnType<typeof vi.fn>;

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const TENANT_ID = "tenant-001";

const baseUsage = {
  tenantId: TENANT_ID,
  storesCount: 1,
  usersCount: 3,
  activeIntegrationsCount: 2,
  ordersCount: 100,
  subscriptionsCount: 10,
  capturedAt: new Date(),
};

const growthPlan = {
  id: "plan-growth",
  code: "growth",
  name: "Growth",
  description: null,
  billingInterval: "MONTHLY",
  priceAmountMinor: 14900,
  currencyCode: "NZD",
  isDefault: false,
  sortOrder: 2,
  trialDays: 14,
  limits: [
    { key: "stores.max", valueInt: 5, valueText: null, valueBool: null, unit: "stores" },
    { key: "staff.max", valueInt: 20, valueText: null, valueBool: null, unit: "users" },
    { key: "channels.max", valueInt: 10, valueText: null, valueBool: null, unit: "channels" },
    { key: "orders.monthly", valueInt: 5000, valueText: null, valueBool: null, unit: "orders" },
    { key: "subscriptions.monthly", valueInt: 500, valueText: null, valueBool: null, unit: "subscriptions" },
  ],
  features: [
    { key: "analytics.advanced", enabled: true },
    { key: "multi_store", enabled: true },
  ],
};

const starterPlan = {
  id: "plan-starter",
  code: "starter",
  name: "Starter",
  description: null,
  billingInterval: "MONTHLY",
  priceAmountMinor: 4900,
  currencyCode: "NZD",
  isDefault: true,
  sortOrder: 1,
  trialDays: 14,
  limits: [
    { key: "stores.max", valueInt: 1, valueText: null, valueBool: null, unit: "stores" },
    { key: "staff.max", valueInt: 5, valueText: null, valueBool: null, unit: "users" },
    { key: "channels.max", valueInt: 2, valueText: null, valueBool: null, unit: "channels" },
    { key: "orders.monthly", valueInt: 500, valueText: null, valueBool: null, unit: "orders" },
    { key: "subscriptions.monthly", valueInt: 50, valueText: null, valueBool: null, unit: "subscriptions" },
  ],
  features: [
    { key: "analytics.advanced", enabled: false },
    { key: "multi_store", enabled: false },
  ],
};

const scalePlan = {
  id: "plan-scale",
  code: "scale",
  name: "Scale",
  description: null,
  billingInterval: "MONTHLY",
  priceAmountMinor: 39900,
  currencyCode: "NZD",
  isDefault: false,
  sortOrder: 3,
  trialDays: 14,
  limits: [
    { key: "stores.max", valueInt: null, valueText: null, valueBool: null, unit: "stores" },
    { key: "staff.max", valueInt: null, valueText: null, valueBool: null, unit: "users" },
    { key: "channels.max", valueInt: null, valueText: null, valueBool: null, unit: "channels" },
    { key: "orders.monthly", valueInt: null, valueText: null, valueBool: null, unit: "orders" },
    { key: "subscriptions.monthly", valueInt: null, valueText: null, valueBool: null, unit: "subscriptions" },
  ],
  features: [
    { key: "analytics.advanced", enabled: true },
    { key: "priority_support", enabled: true },
    { key: "multi_store", enabled: true },
  ],
};

const baseSubscription = {
  id: "sub-001",
  tenantId: TENANT_ID,
  planId: growthPlan.id,
  status: "ACTIVE",
  billingInterval: "MONTHLY",
  currentPeriodStart: new Date("2026-04-01"),
  currentPeriodEnd: new Date("2026-04-30"),
  nextBillingAt: new Date("2026-05-01"),
  trialStart: null,
  trialEnd: null,
  cancelAtPeriodEnd: false,
  cancelledAt: null,
  providerSubscriptionId: null,
  plan: growthPlan,
};

beforeEach(() => {
  vi.clearAllMocks();
  mockCalculateUsage.mockResolvedValue(baseUsage);
  mockPrisma.tenantSubscription.findFirst.mockResolvedValue(baseSubscription);
  mockPrisma.plan.findFirst.mockResolvedValue(null);
  mockPrisma.billingInvoice.count.mockResolvedValue(0);
  mockPrisma.billingInvoice.findMany.mockResolvedValue([]);
  mockPrisma.billingInvoice.findFirst.mockResolvedValue(null);
  mockPrisma.subscriptionChangeRequest.create.mockResolvedValue({ id: "cr-001", status: "CONFIRMED" });
  mockPrisma.subscriptionChangeRequest.update.mockResolvedValue({ id: "cr-001", status: "APPLIED" });
  mockPrisma.billingEventLog.create.mockResolvedValue({});
  mockPrisma.auditLog.create.mockResolvedValue({});
  mockPrisma.tenantSubscriptionEvent.create.mockResolvedValue({});
  mockPrisma.tenantSubscription.update.mockResolvedValue({ ...baseSubscription, planId: scalePlan.id });
});

// ─── getUsageVsLimits ─────────────────────────────────────────────────────────

describe("getUsageVsLimits", () => {
  it("returns NORMAL status when all usage is below 80% of limits", async () => {
    // Usage well below limits: 1/5 stores, 3/20 staff, 2/10 channels, 100/5000 orders
    mockCalculateUsage.mockResolvedValue({ ...baseUsage });

    const metrics = await getUsageVsLimits(TENANT_ID);

    expect(metrics.length).toBeGreaterThan(0);
    const storeMetric = metrics.find((m) => m.metricKey === "stores.max");
    const staffMetric = metrics.find((m) => m.metricKey === "staff.max");
    const ordersMetric = metrics.find((m) => m.metricKey === "orders.monthly");

    expect(storeMetric?.status).toBe("NORMAL");
    expect(staffMetric?.status).toBe("NORMAL");
    expect(ordersMetric?.status).toBe("NORMAL");
  });

  it("returns NEAR_LIMIT when usage is >= 80% and < 100% of limit", async () => {
    // 4/5 stores = 80% → NEAR_LIMIT
    mockCalculateUsage.mockResolvedValue({ ...baseUsage, storesCount: 4 });

    const metrics = await getUsageVsLimits(TENANT_ID);

    const storeMetric = metrics.find((m) => m.metricKey === "stores.max");
    expect(storeMetric?.status).toBe("NEAR_LIMIT");
    expect(storeMetric?.utilizationPercent).toBe(80);
  });

  it("returns REACHED when usage exactly equals the limit", async () => {
    // 5/5 stores = 100% → REACHED
    mockCalculateUsage.mockResolvedValue({ ...baseUsage, storesCount: 5 });

    const metrics = await getUsageVsLimits(TENANT_ID);

    const storeMetric = metrics.find((m) => m.metricKey === "stores.max");
    expect(storeMetric?.status).toBe("REACHED");
    expect(storeMetric?.currentValue).toBe(5);
    expect(storeMetric?.limitValue).toBe(5);
  });

  it("returns EXCEEDED when usage exceeds the limit", async () => {
    // 7/5 stores → EXCEEDED
    mockCalculateUsage.mockResolvedValue({ ...baseUsage, storesCount: 7 });

    const metrics = await getUsageVsLimits(TENANT_ID);

    const storeMetric = metrics.find((m) => m.metricKey === "stores.max");
    expect(storeMetric?.status).toBe("EXCEEDED");
    expect(storeMetric?.currentValue).toBe(7);
    expect(storeMetric?.showUpgradeCta).toBe(true);
  });

  it("returns null limitValue (unlimited) for metrics with no plan limit", async () => {
    // Scale plan has null limits (unlimited)
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      plan: scalePlan,
    });

    const metrics = await getUsageVsLimits(TENANT_ID);

    const storeMetric = metrics.find((m) => m.metricKey === "stores.max");
    expect(storeMetric?.limitValue).toBeNull();
    expect(storeMetric?.utilizationPercent).toBeNull();
    expect(storeMetric?.status).toBe("NORMAL");
  });
});

// ─── previewPlanChange ────────────────────────────────────────────────────────

describe("previewPlanChange", () => {
  it("detects UPGRADE when target plan has higher sortOrder", async () => {
    // Current: Growth (sortOrder 2), Target: Scale (sortOrder 3)
    mockPrisma.plan.findFirst.mockResolvedValue(scalePlan);

    const preview = await previewPlanChange(TENANT_ID, "scale");

    expect(preview.changeType).toBe("UPGRADE");
    expect(preview.effectiveMode).toBe("IMMEDIATE");
  });

  it("detects DOWNGRADE when target plan has lower sortOrder", async () => {
    // Current: Growth (sortOrder 2), Target: Starter (sortOrder 1)
    mockPrisma.plan.findFirst.mockResolvedValue(starterPlan);

    const preview = await previewPlanChange(TENANT_ID, "starter");

    expect(preview.changeType).toBe("DOWNGRADE");
    expect(preview.effectiveMode).toBe("NEXT_CYCLE");
  });

  it("blocks downgrade when current staff count exceeds target plan staff.max limit", async () => {
    // Current subscription on Growth (staff.max=20), downgrading to Starter (staff.max=5)
    // Current usage: 10 staff members > 5 limit
    mockCalculateUsage.mockResolvedValue({ ...baseUsage, usersCount: 10 });
    mockPrisma.plan.findFirst.mockResolvedValue(starterPlan);

    const preview = await previewPlanChange(TENANT_ID, "starter");

    expect(preview.isBlocked).toBe(true);
    const staffBlock = preview.blockingReasons.find((r) => r.metricKey === "staff.max");
    expect(staffBlock).toBeDefined();
    expect(staffBlock?.currentUsage).toBe(10);
    expect(staffBlock?.targetLimit).toBe(5);
  });

  it("returns isBlocked=true and populates blockingReasons when blocked", async () => {
    // Usage exceeds multiple starter limits
    mockCalculateUsage.mockResolvedValue({
      ...baseUsage,
      storesCount: 3,   // exceeds starter stores.max=1
      usersCount: 10,   // exceeds starter staff.max=5
    });
    mockPrisma.plan.findFirst.mockResolvedValue(starterPlan);

    const preview = await previewPlanChange(TENANT_ID, "starter");

    expect(preview.isBlocked).toBe(true);
    expect(preview.blockingReasons.length).toBeGreaterThanOrEqual(2);
    expect(preview.summaryText).toContain("Cannot downgrade");
  });

  it("sets effectiveMode to IMMEDIATE for upgrades, NEXT_CYCLE for downgrades", async () => {
    // Upgrade
    mockPrisma.plan.findFirst.mockResolvedValue(scalePlan);
    const upgradePreview = await previewPlanChange(TENANT_ID, "scale");
    expect(upgradePreview.effectiveMode).toBe("IMMEDIATE");

    // Downgrade
    mockPrisma.plan.findFirst.mockResolvedValue(starterPlan);
    const downgradePreview = await previewPlanChange(TENANT_ID, "starter");
    expect(downgradePreview.effectiveMode).toBe("NEXT_CYCLE");
  });
});

// ─── getBillingAlerts ─────────────────────────────────────────────────────────

describe("getBillingAlerts", () => {
  it("returns critical alert for PAST_DUE subscription", async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      status: "PAST_DUE",
    });

    const alerts = await getBillingAlerts(TENANT_ID);

    const alert = alerts.find((a) => a.id === "alert-past-due");
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("critical");
  });

  it("returns critical alert for INCOMPLETE subscription", async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      status: "INCOMPLETE",
    });

    const alerts = await getBillingAlerts(TENANT_ID);

    const alert = alerts.find((a) => a.id === "alert-incomplete");
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("critical");
  });

  it("returns warning alert when trial ends within 7 days", async () => {
    const trialEnd = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days from now
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      status: "TRIAL",
      trialEnd,
    });

    const alerts = await getBillingAlerts(TENANT_ID);

    const alert = alerts.find((a) => a.id === "alert-trial-ending");
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("warning");
    expect(alert?.message).toContain("3 days");
  });

  it("returns info alert when cancelAtPeriodEnd is true", async () => {
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      cancelAtPeriodEnd: true,
    });

    const alerts = await getBillingAlerts(TENANT_ID);

    const alert = alerts.find((a) => a.id === "alert-cancel-at-period-end");
    expect(alert).toBeDefined();
    expect(alert?.severity).toBe("info");
  });

  it("returns empty array for healthy ACTIVE subscription", async () => {
    // Default mock: ACTIVE subscription, no cancelAtPeriodEnd, no trialEnd
    // Low usage so no EXCEEDED/REACHED alerts either
    mockPrisma.tenantSubscription.findFirst.mockResolvedValue({
      ...baseSubscription,
      status: "ACTIVE",
      cancelAtPeriodEnd: false,
      trialEnd: null,
    });

    const alerts = await getBillingAlerts(TENANT_ID);

    const criticalOrWarning = alerts.filter(
      (a) => a.severity === "critical" || a.severity === "warning"
    );
    expect(criticalOrWarning).toHaveLength(0);
  });
});
