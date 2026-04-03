import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    customerAddress: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    customerNotification: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import {
  listCustomerAddresses,
  createCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
  listCustomerNotifications,
  getCustomerUnreadNotificationCount,
  markCustomerNotificationRead,
  markAllCustomerNotificationsRead,
  createCustomerNotification,
  CustomerAddressNotFoundError,
  CustomerAddressValidationError,
  CustomerNotificationNotFoundError,
} from "@/services/customer.service";

const mockPrisma = prisma as unknown as {
  customerAddress: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  customerNotification: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const USER_ID = "user-001";
const ADDR_ID = "addr-001";
const NOTIF_ID = "notif-001";
const NOW = new Date("2026-01-15T10:00:00.000Z");

function baseAddress(overrides = {}) {
  return {
    id: ADDR_ID,
    userId: USER_ID,
    label: "Home",
    line1: "123 Main St",
    line2: null,
    city: "Auckland",
    region: null,
    postalCode: "1010",
    country: "NZ",
    isDefault: false,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function baseNotification(overrides = {}) {
  return {
    id: NOTIF_ID,
    userId: USER_ID,
    type: "GENERAL",
    title: "Test notification",
    body: "This is a test.",
    entityType: null,
    entityId: null,
    readAt: null,
    createdAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listCustomerAddresses ────────────────────────────────────────────────────

describe("listCustomerAddresses", () => {
  it("returns mapped addresses ordered by default then created", async () => {
    const rows = [
      baseAddress({ id: "addr-001", isDefault: true }),
      baseAddress({ id: "addr-002", isDefault: false }),
    ];
    mockPrisma.customerAddress.findMany.mockResolvedValue(rows);

    const result = await listCustomerAddresses(USER_ID);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("addr-001");
    expect(result[0].isDefault).toBe(true);
    expect(result[0].createdAt).toBe(NOW.toISOString());
  });

  it("returns empty array when no addresses", async () => {
    mockPrisma.customerAddress.findMany.mockResolvedValue([]);
    const result = await listCustomerAddresses(USER_ID);
    expect(result).toEqual([]);
  });
});

// ─── createCustomerAddress ────────────────────────────────────────────────────

describe("createCustomerAddress", () => {
  it("creates address and sets isDefault=true when first address", async () => {
    mockPrisma.customerAddress.count.mockResolvedValue(0);
    const created = baseAddress({ isDefault: true });
    mockPrisma.customerAddress.create.mockResolvedValue(created);

    const result = await createCustomerAddress(USER_ID, { line1: "123 Main St", city: "Auckland" });
    expect(result.isDefault).toBe(true);
    expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: true }) })
    );
  });

  it("sets isDefault=false when addresses already exist", async () => {
    mockPrisma.customerAddress.count.mockResolvedValue(2);
    const created = baseAddress({ isDefault: false });
    mockPrisma.customerAddress.create.mockResolvedValue(created);

    await createCustomerAddress(USER_ID, { line1: "456 Other St", city: "Wellington" });
    expect(mockPrisma.customerAddress.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ isDefault: false }) })
    );
  });

  it("trims and defaults label to 'Home' when empty", async () => {
    mockPrisma.customerAddress.count.mockResolvedValue(0);
    mockPrisma.customerAddress.create.mockResolvedValue(baseAddress({ label: "Home" }));

    await createCustomerAddress(USER_ID, { line1: "1 St", city: "Auckland", label: "  " });
    const call = mockPrisma.customerAddress.create.mock.calls[0][0];
    expect(call.data.label).toBe("Home");
  });

  it("throws CustomerAddressValidationError when line1 is missing", async () => {
    await expect(
      createCustomerAddress(USER_ID, { line1: "", city: "Auckland" })
    ).rejects.toThrow(CustomerAddressValidationError);
  });

  it("throws CustomerAddressValidationError when city is missing", async () => {
    await expect(
      createCustomerAddress(USER_ID, { line1: "123 Main St", city: "" })
    ).rejects.toThrow(CustomerAddressValidationError);
  });
});

// ─── updateCustomerAddress ────────────────────────────────────────────────────

describe("updateCustomerAddress", () => {
  it("updates address fields", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress());
    mockPrisma.customerAddress.update.mockResolvedValue(baseAddress({ city: "Wellington" }));

    await updateCustomerAddress(USER_ID, ADDR_ID, { city: "Wellington" });
    expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ city: "Wellington" }) })
    );
  });

  it("throws CustomerAddressNotFoundError when not found", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(null);
    await expect(
      updateCustomerAddress(USER_ID, ADDR_ID, { city: "Wellington" })
    ).rejects.toThrow(CustomerAddressNotFoundError);
  });

  it("throws CustomerAddressNotFoundError when address belongs to another user", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(
      baseAddress({ userId: "other-user" })
    );
    await expect(
      updateCustomerAddress(USER_ID, ADDR_ID, { city: "Wellington" })
    ).rejects.toThrow(CustomerAddressNotFoundError);
  });
});

// ─── deleteCustomerAddress ────────────────────────────────────────────────────

describe("deleteCustomerAddress", () => {
  it("deletes address without promoting when not default", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress({ isDefault: false }));
    mockPrisma.customerAddress.delete.mockResolvedValue(baseAddress());

    await deleteCustomerAddress(USER_ID, ADDR_ID);
    expect(mockPrisma.customerAddress.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ADDR_ID } })
    );
    expect(mockPrisma.customerAddress.update).not.toHaveBeenCalled();
  });

  it("promotes oldest address to default when the default is deleted", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress({ isDefault: true }));
    mockPrisma.customerAddress.delete.mockResolvedValue(baseAddress());
    const nextAddr = baseAddress({ id: "addr-002" });
    mockPrisma.customerAddress.findFirst.mockResolvedValue(nextAddr);
    mockPrisma.customerAddress.update.mockResolvedValue(nextAddr);

    await deleteCustomerAddress(USER_ID, ADDR_ID);
    expect(mockPrisma.customerAddress.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "addr-002" }, data: { isDefault: true } })
    );
  });

  it("does not promote when no remaining addresses after deleting default", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress({ isDefault: true }));
    mockPrisma.customerAddress.delete.mockResolvedValue(baseAddress());
    mockPrisma.customerAddress.findFirst.mockResolvedValue(null);

    await deleteCustomerAddress(USER_ID, ADDR_ID);
    expect(mockPrisma.customerAddress.update).not.toHaveBeenCalled();
  });

  it("throws CustomerAddressNotFoundError when not found", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(null);
    await expect(deleteCustomerAddress(USER_ID, ADDR_ID)).rejects.toThrow(
      CustomerAddressNotFoundError
    );
  });
});

// ─── setDefaultCustomerAddress ────────────────────────────────────────────────

describe("setDefaultCustomerAddress", () => {
  it("runs transaction to unset old default and set new default", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(baseAddress());
    mockPrisma.$transaction.mockResolvedValue([]);

    await setDefaultCustomerAddress(USER_ID, ADDR_ID);
    expect(mockPrisma.$transaction).toHaveBeenCalledWith(
      expect.arrayContaining([expect.anything(), expect.anything()])
    );
  });

  it("throws CustomerAddressNotFoundError when not found", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(null);
    await expect(setDefaultCustomerAddress(USER_ID, ADDR_ID)).rejects.toThrow(
      CustomerAddressNotFoundError
    );
  });

  it("throws CustomerAddressNotFoundError when address belongs to another user", async () => {
    mockPrisma.customerAddress.findUnique.mockResolvedValue(
      baseAddress({ userId: "other-user" })
    );
    await expect(setDefaultCustomerAddress(USER_ID, ADDR_ID)).rejects.toThrow(
      CustomerAddressNotFoundError
    );
  });
});

// ─── listCustomerNotifications ────────────────────────────────────────────────

describe("listCustomerNotifications", () => {
  it("returns paginated notifications with unread count", async () => {
    const rows = [baseNotification()];
    mockPrisma.customerNotification.findMany.mockResolvedValue(rows);
    mockPrisma.customerNotification.count
      .mockResolvedValueOnce(1)  // total
      .mockResolvedValueOnce(1); // unreadCount

    const result = await listCustomerNotifications(USER_ID, { page: 1, pageSize: 20 });
    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.unreadCount).toBe(1);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("filters by unreadOnly when specified", async () => {
    mockPrisma.customerNotification.findMany.mockResolvedValue([]);
    mockPrisma.customerNotification.count.mockResolvedValue(0);

    await listCustomerNotifications(USER_ID, { unreadOnly: true });
    const findManyCall = mockPrisma.customerNotification.findMany.mock.calls[0][0];
    expect(findManyCall.where).toMatchObject({ readAt: null });
  });

  it("maps readAt and createdAt to ISO strings", async () => {
    const readAt = new Date("2026-01-15T11:00:00.000Z");
    mockPrisma.customerNotification.findMany.mockResolvedValue([
      baseNotification({ readAt }),
    ]);
    mockPrisma.customerNotification.count.mockResolvedValue(1);

    const result = await listCustomerNotifications(USER_ID);
    expect(result.items[0].readAt).toBe(readAt.toISOString());
    expect(result.items[0].createdAt).toBe(NOW.toISOString());
  });
});

// ─── getCustomerUnreadNotificationCount ──────────────────────────────────────

describe("getCustomerUnreadNotificationCount", () => {
  it("returns count of unread notifications", async () => {
    mockPrisma.customerNotification.count.mockResolvedValue(5);
    const count = await getCustomerUnreadNotificationCount(USER_ID);
    expect(count).toBe(5);
    expect(mockPrisma.customerNotification.count).toHaveBeenCalledWith({
      where: { userId: USER_ID, readAt: null },
    });
  });
});

// ─── markCustomerNotificationRead ────────────────────────────────────────────

describe("markCustomerNotificationRead", () => {
  it("marks unread notification as read", async () => {
    mockPrisma.customerNotification.findUnique.mockResolvedValue(baseNotification());
    mockPrisma.customerNotification.update.mockResolvedValue(
      baseNotification({ readAt: NOW })
    );

    await markCustomerNotificationRead(USER_ID, NOTIF_ID);
    expect(mockPrisma.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: NOTIF_ID } })
    );
  });

  it("does nothing when notification is already read", async () => {
    mockPrisma.customerNotification.findUnique.mockResolvedValue(
      baseNotification({ readAt: NOW })
    );

    await markCustomerNotificationRead(USER_ID, NOTIF_ID);
    expect(mockPrisma.customerNotification.update).not.toHaveBeenCalled();
  });

  it("throws CustomerNotificationNotFoundError when not found", async () => {
    mockPrisma.customerNotification.findUnique.mockResolvedValue(null);
    await expect(
      markCustomerNotificationRead(USER_ID, NOTIF_ID)
    ).rejects.toThrow(CustomerNotificationNotFoundError);
  });

  it("throws CustomerNotificationNotFoundError when notification belongs to another user", async () => {
    mockPrisma.customerNotification.findUnique.mockResolvedValue(
      baseNotification({ userId: "other-user" })
    );
    await expect(
      markCustomerNotificationRead(USER_ID, NOTIF_ID)
    ).rejects.toThrow(CustomerNotificationNotFoundError);
  });
});

// ─── markAllCustomerNotificationsRead ────────────────────────────────────────

describe("markAllCustomerNotificationsRead", () => {
  it("marks all unread notifications for the user as read", async () => {
    mockPrisma.customerNotification.updateMany.mockResolvedValue({ count: 3 });

    await markAllCustomerNotificationsRead(USER_ID);
    expect(mockPrisma.customerNotification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: USER_ID, readAt: null },
        data: expect.objectContaining({ readAt: expect.any(Date) }),
      })
    );
  });
});

// ─── createCustomerNotification ──────────────────────────────────────────────

describe("createCustomerNotification", () => {
  it("creates and returns a notification", async () => {
    const row = baseNotification({ type: "ORDER_STATUS_UPDATE", title: "Order ready" });
    mockPrisma.customerNotification.create.mockResolvedValue(row);

    const result = await createCustomerNotification(USER_ID, {
      type: "ORDER_STATUS_UPDATE",
      title: "Order ready",
      body: "Your order is ready for pickup.",
    });
    expect(result.type).toBe("ORDER_STATUS_UPDATE");
    expect(result.title).toBe("Order ready");
    expect(result.readAt).toBeNull();
  });

  it("stores optional entityType and entityId", async () => {
    const row = baseNotification({ entityType: "Order", entityId: "order-123" });
    mockPrisma.customerNotification.create.mockResolvedValue(row);

    await createCustomerNotification(USER_ID, {
      type: "GENERAL",
      title: "Test",
      body: "Body",
      entityType: "Order",
      entityId: "order-123",
    });
    const createCall = mockPrisma.customerNotification.create.mock.calls[0][0];
    expect(createCall.data.entityType).toBe("Order");
    expect(createCall.data.entityId).toBe("order-123");
  });
});
