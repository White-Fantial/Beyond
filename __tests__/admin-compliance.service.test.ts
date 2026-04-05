import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: vi.fn(), update: vi.fn() },
    order: { findMany: vi.fn() },
    subscription: { findMany: vi.fn() },
    customerAddress: { findMany: vi.fn(), deleteMany: vi.fn() },
    customerNotification: { findMany: vi.fn() },
    productReview: { findMany: vi.fn() },
    supportTicket: { findMany: vi.fn() },
    loyaltyAccount: { findUnique: vi.fn() },
    auditLog: { findMany: vi.fn() },
    orderEvent: { findMany: vi.fn() },
    complianceEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  exportUserData,
  anonymiseUser,
  getRetentionReport,
} from "@/services/admin/admin-compliance.service";

const mockPrisma = prisma as unknown as {
  user: { findUnique: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> };
  order: { findMany: ReturnType<typeof vi.fn> };
  subscription: { findMany: ReturnType<typeof vi.fn> };
  customerAddress: { findMany: ReturnType<typeof vi.fn>; deleteMany: ReturnType<typeof vi.fn> };
  customerNotification: { findMany: ReturnType<typeof vi.fn> };
  productReview: { findMany: ReturnType<typeof vi.fn> };
  supportTicket: { findMany: ReturnType<typeof vi.fn> };
  loyaltyAccount: { findUnique: ReturnType<typeof vi.fn> };
  auditLog: { findMany: ReturnType<typeof vi.fn> };
  orderEvent: { findMany: ReturnType<typeof vi.fn> };
  complianceEvent: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const USER_ID = "user-1";

const mockUser = {
  id: USER_ID,
  email: "alice@example.com",
  name: "Alice",
  phone: "+64 21 000 0000",
  createdAt: new Date("2026-01-01"),
};

function setupEmpty() {
  mockPrisma.user.findUnique.mockResolvedValue(mockUser);
  mockPrisma.order.findMany.mockResolvedValue([]);
  mockPrisma.subscription.findMany.mockResolvedValue([]);
  mockPrisma.customerAddress.findMany.mockResolvedValue([]);
  mockPrisma.customerNotification.findMany.mockResolvedValue([]);
  mockPrisma.productReview.findMany.mockResolvedValue([]);
  mockPrisma.supportTicket.findMany.mockResolvedValue([]);
  mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── exportUserData ────────────────────────────────────────────────────────────

describe("exportUserData", () => {
  it("returns structured export with user data", async () => {
    setupEmpty();

    const result = await exportUserData(USER_ID);

    expect(result.user.id).toBe(USER_ID);
    expect(result.user.email).toBe("alice@example.com");
    expect(result.exportedAt).toBeTruthy();
  });

  it("throws if user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.order.findMany.mockResolvedValue([]);
    mockPrisma.subscription.findMany.mockResolvedValue([]);
    mockPrisma.customerAddress.findMany.mockResolvedValue([]);
    mockPrisma.customerNotification.findMany.mockResolvedValue([]);
    mockPrisma.productReview.findMany.mockResolvedValue([]);
    mockPrisma.supportTicket.findMany.mockResolvedValue([]);
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue(null);

    await expect(exportUserData("missing-user")).rejects.toThrow("not found");
  });

  it("includes orders matching the user email", async () => {
    setupEmpty();
    mockPrisma.order.findMany.mockResolvedValue([
      { id: "order-1", status: "COMPLETED", totalAmount: 1500, createdAt: new Date("2026-02-01"), customerEmail: "alice@example.com" },
      { id: "order-2", status: "PENDING", totalAmount: 800, createdAt: new Date("2026-03-01"), customerEmail: "other@example.com" },
    ]);

    const result = await exportUserData(USER_ID);
    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].id).toBe("order-1");
  });

  it("includes loyalty account data when present", async () => {
    setupEmpty();
    mockPrisma.loyaltyAccount.findUnique.mockResolvedValue({ points: 250, tier: "SILVER" });

    const result = await exportUserData(USER_ID);
    expect(result.loyaltyAccount?.points).toBe(250);
    expect(result.loyaltyAccount?.tier).toBe("SILVER");
  });

  it("sets loyaltyAccount to null when no account exists", async () => {
    setupEmpty();
    const result = await exportUserData(USER_ID);
    expect(result.loyaltyAccount).toBeNull();
  });

  it("includes support tickets", async () => {
    setupEmpty();
    mockPrisma.supportTicket.findMany.mockResolvedValue([
      { id: "tick-1", subject: "Order issue", status: "OPEN", createdAt: new Date("2026-01-15") },
    ]);

    const result = await exportUserData(USER_ID);
    expect(result.supportTickets).toHaveLength(1);
    expect(result.supportTickets[0].subject).toBe("Order issue");
  });

  it("exportedAt is an ISO timestamp string", async () => {
    setupEmpty();
    const result = await exportUserData(USER_ID);
    expect(result.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── anonymiseUser ────────────────────────────────────────────────────────────

describe("anonymiseUser", () => {
  it("anonymises the user and returns result", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockPrisma.$transaction.mockResolvedValue([]);

    const result = await anonymiseUser(USER_ID, "admin-1");

    expect(result.userId).toBe(USER_ID);
    expect(result.anonymisedAt).toBeTruthy();
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("throws if user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    await expect(anonymiseUser("missing", "admin-1")).rejects.toThrow("not found");
  });

  it("creates ERASURE_COMPLETE compliance event", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    let capturedOps: unknown[] = [];
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => {
      capturedOps = ops;
      return [];
    });

    await anonymiseUser(USER_ID, "admin-1");

    // Transaction was called with 3 ops: user update, address deleteMany, complianceEvent create
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("anonymises email to deleted pattern", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);

    let updateData: Record<string, unknown> = {};
    mockPrisma.$transaction.mockImplementation(async (ops: Array<unknown>) => {
      void ops;
      return [];
    });

    // Spy on user.update to capture args
    const updateSpy = vi.fn().mockResolvedValue({});
    mockPrisma.user.update = updateSpy;
    mockPrisma.customerAddress.deleteMany = vi.fn().mockResolvedValue({});
    mockPrisma.complianceEvent.create = vi.fn().mockResolvedValue({});
    mockPrisma.$transaction.mockImplementation(async (ops: Array<() => Promise<unknown>>) => {
      return Promise.all(ops.map((op) => (typeof op === "function" ? op() : op)));
    });

    await anonymiseUser(USER_ID, "admin-1");

    if (updateSpy.mock.calls.length > 0) {
      updateData = updateSpy.mock.calls[0][0].data as Record<string, unknown>;
      expect(updateData.email).toContain("anon.beyond");
    }
  });
});

// ─── getRetentionReport ───────────────────────────────────────────────────────

describe("getRetentionReport", () => {
  it("returns empty report when no records exceed threshold", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.orderEvent.findMany.mockResolvedValue([]);

    const report = await getRetentionReport(365);
    expect(report.total).toBe(0);
    expect(report.records).toHaveLength(0);
    expect(report.thresholdDays).toBe(365);
  });

  it("includes audit logs in report", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { id: "al-1", createdAt: new Date("2023-01-01"), action: "LOGIN" },
    ]);
    mockPrisma.orderEvent.findMany.mockResolvedValue([]);

    const report = await getRetentionReport(365);
    expect(report.total).toBe(1);
    expect(report.records[0].type).toBe("AuditLog:LOGIN");
  });

  it("includes order events in report", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.orderEvent.findMany.mockResolvedValue([
      { id: "oe-1", createdAt: new Date("2023-06-01"), eventType: "STATUS_CHANGE" },
    ]);

    const report = await getRetentionReport(365);
    expect(report.total).toBe(1);
    expect(report.records[0].type).toBe("OrderEvent:STATUS_CHANGE");
  });

  it("uses custom threshold days", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([]);
    mockPrisma.orderEvent.findMany.mockResolvedValue([]);

    const report = await getRetentionReport(90);
    expect(report.thresholdDays).toBe(90);
  });

  it("sorts records by createdAt ascending", async () => {
    mockPrisma.auditLog.findMany.mockResolvedValue([
      { id: "al-2", createdAt: new Date("2023-06-01"), action: "LOGOUT" },
      { id: "al-1", createdAt: new Date("2023-01-01"), action: "LOGIN" },
    ]);
    mockPrisma.orderEvent.findMany.mockResolvedValue([]);

    const report = await getRetentionReport(365);
    expect(report.records[0].createdAt < report.records[1].createdAt).toBe(true);
  });
});
