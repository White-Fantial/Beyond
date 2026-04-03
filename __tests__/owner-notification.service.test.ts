import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  dismissNotification,
  createNotification,
} from "@/services/owner/owner-notification.service";

const mockPrisma = prisma as unknown as {
  notification: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const TENANT_A = "tenant-aaa";
const USER_1 = "user-001";
const NOTIF_1 = "notif-001";

function makeNotif(overrides: Partial<{
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: Date | null;
  dismissedAt: Date | null;
  createdAt: Date;
}> = {}) {
  return {
    id: NOTIF_1,
    tenantId: TENANT_A,
    userId: USER_1,
    type: "ALERT_TRIGGERED",
    title: "High cancellation rate",
    body: "Rate exceeded threshold.",
    entityType: "AlertRule",
    entityId: "rule-001",
    readAt: null,
    dismissedAt: null,
    createdAt: new Date("2026-01-15T10:00:00Z"),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listNotifications ────────────────────────────────────────────────────────

describe("listNotifications", () => {
  it("returns paginated items with unread count", async () => {
    const notif = makeNotif();
    mockPrisma.notification.findMany.mockResolvedValue([notif]);
    mockPrisma.notification.count
      .mockResolvedValueOnce(1)   // total
      .mockResolvedValueOnce(1);  // unreadCount

    const result = await listNotifications(TENANT_A, USER_1, { page: 1, pageSize: 50 });

    expect(result.total).toBe(1);
    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].readAt).toBeNull();
  });

  it("filters unread only when requested", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    await listNotifications(TENANT_A, USER_1, { unreadOnly: true });

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ readAt: null }),
      })
    );
  });

  it("excludes dismissed notifications", async () => {
    mockPrisma.notification.findMany.mockResolvedValue([]);
    mockPrisma.notification.count.mockResolvedValue(0);

    await listNotifications(TENANT_A, USER_1);

    expect(mockPrisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dismissedAt: null }),
      })
    );
  });

  it("maps notification fields correctly", async () => {
    const readAt = new Date("2026-01-16T00:00:00Z");
    const notif = makeNotif({ readAt });
    mockPrisma.notification.findMany.mockResolvedValue([notif]);
    mockPrisma.notification.count.mockResolvedValue(1).mockResolvedValueOnce(0);

    const result = await listNotifications(TENANT_A, USER_1);
    expect(result.items[0].readAt).toBe(readAt.toISOString());
    expect(result.items[0].type).toBe("ALERT_TRIGGERED");
  });
});

// ─── markNotificationRead ─────────────────────────────────────────────────────

describe("markNotificationRead", () => {
  it("returns null when notification not found", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue(null);

    const result = await markNotificationRead(TENANT_A, USER_1, "bad-id");
    expect(result).toBeNull();
  });

  it("updates readAt when unread", async () => {
    const notif = makeNotif();
    mockPrisma.notification.findFirst.mockResolvedValue({ id: NOTIF_1, readAt: null });
    mockPrisma.notification.update.mockResolvedValue({ ...notif, readAt: new Date() });

    const result = await markNotificationRead(TENANT_A, USER_1, NOTIF_1);
    expect(result).not.toBeNull();
    expect(mockPrisma.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTIF_1 },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      })
    );
  });

  it("returns current state without update when already read", async () => {
    const readAt = new Date("2026-01-16T00:00:00Z");
    const notif = makeNotif({ readAt });
    mockPrisma.notification.findFirst.mockResolvedValue({ id: NOTIF_1, readAt });
    mockPrisma.notification.findUnique.mockResolvedValue(notif);

    const result = await markNotificationRead(TENANT_A, USER_1, NOTIF_1);
    expect(result).not.toBeNull();
    expect(mockPrisma.notification.update).not.toHaveBeenCalled();
  });

  it("enforces tenant + userId scoping in query", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue(null);

    await markNotificationRead(TENANT_A, USER_1, NOTIF_1);

    expect(mockPrisma.notification.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: NOTIF_1, tenantId: TENANT_A, userId: USER_1 },
      })
    );
  });
});

// ─── markAllNotificationsRead ─────────────────────────────────────────────────

describe("markAllNotificationsRead", () => {
  it("updates all unread non-dismissed notifications", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 3 });

    const count = await markAllNotificationsRead(TENANT_A, USER_1);
    expect(count).toBe(3);
    expect(mockPrisma.notification.updateMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_A, userId: USER_1, readAt: null, dismissedAt: null },
      data: { readAt: expect.any(Date) },
    });
  });

  it("returns 0 when nothing to update", async () => {
    mockPrisma.notification.updateMany.mockResolvedValue({ count: 0 });

    const count = await markAllNotificationsRead(TENANT_A, USER_1);
    expect(count).toBe(0);
  });
});

// ─── dismissNotification ─────────────────────────────────────────────────────

describe("dismissNotification", () => {
  it("returns false when notification not found", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue(null);

    const result = await dismissNotification(TENANT_A, USER_1, NOTIF_1);
    expect(result).toBe(false);
  });

  it("sets dismissedAt and returns true when found", async () => {
    mockPrisma.notification.findFirst.mockResolvedValue({ id: NOTIF_1 });
    mockPrisma.notification.update.mockResolvedValue({});

    const result = await dismissNotification(TENANT_A, USER_1, NOTIF_1);
    expect(result).toBe(true);
    expect(mockPrisma.notification.update).toHaveBeenCalledWith({
      where: { id: NOTIF_1 },
      data: { dismissedAt: expect.any(Date) },
    });
  });
});

// ─── createNotification ───────────────────────────────────────────────────────

describe("createNotification", () => {
  it("creates a notification with all fields", async () => {
    const notif = makeNotif();
    mockPrisma.notification.create.mockResolvedValue(notif);

    const result = await createNotification({
      tenantId: TENANT_A,
      userId: USER_1,
      type: "ALERT_TRIGGERED",
      title: "High cancellation rate",
      body: "Rate exceeded threshold.",
      entityType: "AlertRule",
      entityId: "rule-001",
    });

    expect(result.title).toBe("High cancellation rate");
    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT_A,
          userId: USER_1,
          type: "ALERT_TRIGGERED",
        }),
      })
    );
  });

  it("defaults entityType and entityId to null when not provided", async () => {
    const notif = makeNotif({ entityType: null, entityId: null });
    mockPrisma.notification.create.mockResolvedValue(notif);

    await createNotification({
      tenantId: TENANT_A,
      userId: USER_1,
      type: "SYSTEM_INFO",
      title: "Info",
      body: "System message.",
    });

    expect(mockPrisma.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ entityType: null, entityId: null }),
      })
    );
  });
});
