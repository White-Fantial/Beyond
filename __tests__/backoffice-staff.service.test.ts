import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    storeMembership: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    storeHours: {
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listStaffMembers,
  updateStaffMember,
  getScheduleData,
} from "@/services/backoffice/backoffice-staff.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  storeMembership: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  storeHours: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const STORE_ID = "store-001";
const MEMBERSHIP_ID = "sm-001";

function makeStoreMembershipRow(overrides: Partial<{
  id: string;
  membershipId: string;
  role: string;
  status: string;
  membership: {
    id: string;
    userId: string;
    joinedAt: Date | null;
    user: { name: string; email: string; lastLoginAt: Date | null };
  };
}> = {}) {
  return {
    id: "sm-001",
    membershipId: "mem-001",
    role: "STAFF",
    status: "ACTIVE",
    membership: {
      id: "mem-001",
      userId: "user-001",
      joinedAt: new Date("2024-01-15T00:00:00.000Z"),
      user: {
        name: "Alice Smith",
        email: "alice@example.com",
        lastLoginAt: new Date("2024-06-01T10:00:00.000Z"),
      },
    },
    ...overrides,
  };
}

function makeStoreHoursRow(dayOfWeek: number, overrides: Partial<{
  id: string;
  isOpen: boolean;
  openTimeLocal: string;
  closeTimeLocal: string;
  pickupStartTimeLocal: string | null;
  pickupEndTimeLocal: string | null;
}> = {}) {
  return {
    id: `hours-${dayOfWeek}`,
    dayOfWeek,
    isOpen: true,
    openTimeLocal: "09:00",
    closeTimeLocal: "17:00",
    pickupStartTimeLocal: null,
    pickupEndTimeLocal: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listStaffMembers ─────────────────────────────────────────────────────────

describe("listStaffMembers", () => {
  it("returns mapped staff members with correct fields", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([makeStoreMembershipRow()]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.total).toBe(1);
    expect(result.items[0]).toMatchObject({
      membershipId: "mem-001",
      storeMembershipId: "sm-001",
      userId: "user-001",
      name: "Alice Smith",
      email: "alice@example.com",
      role: "STAFF",
      status: "ACTIVE",
    });
  });

  it("queries with storeId and excludes REMOVED status", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([]);

    await listStaffMembers(STORE_ID);

    expect(mockPrisma.storeMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: STORE_ID, status: { not: "REMOVED" } },
      })
    );
  });

  it("returns empty list when no staff found", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it("maps joinedAt to ISO string", async () => {
    const joinedAt = new Date("2024-03-10T08:00:00.000Z");
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      makeStoreMembershipRow({ membership: { id: "mem-001", userId: "user-001", joinedAt, user: { name: "Bob", email: "bob@example.com", lastLoginAt: null } } }),
    ]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.items[0].joinedAt).toBe("2024-03-10T08:00:00.000Z");
  });

  it("maps joinedAt to null when not set", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      makeStoreMembershipRow({ membership: { id: "mem-001", userId: "user-001", joinedAt: null, user: { name: "Bob", email: "bob@example.com", lastLoginAt: null } } }),
    ]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.items[0].joinedAt).toBeNull();
  });

  it("maps lastLoginAt to ISO string", async () => {
    const lastLoginAt = new Date("2024-06-15T12:30:00.000Z");
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      makeStoreMembershipRow({ membership: { id: "mem-001", userId: "user-001", joinedAt: null, user: { name: "Carol", email: "carol@example.com", lastLoginAt } } }),
    ]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.items[0].lastLoginAt).toBe("2024-06-15T12:30:00.000Z");
  });

  it("maps lastLoginAt to null when not set", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      makeStoreMembershipRow({ membership: { id: "mem-001", userId: "user-001", joinedAt: null, user: { name: "Dan", email: "dan@example.com", lastLoginAt: null } } }),
    ]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.items[0].lastLoginAt).toBeNull();
  });

  it("returns multiple staff members with correct total count", async () => {
    mockPrisma.storeMembership.findMany.mockResolvedValue([
      makeStoreMembershipRow({ id: "sm-001", membershipId: "mem-001" }),
      makeStoreMembershipRow({ id: "sm-002", membershipId: "mem-002", role: "MANAGER" }),
    ]);

    const result = await listStaffMembers(STORE_ID);

    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });
});

// ─── updateStaffMember ────────────────────────────────────────────────────────

describe("updateStaffMember", () => {
  it("updates role and returns mapped member", async () => {
    mockPrisma.storeMembership.findFirst.mockResolvedValue({ id: MEMBERSHIP_ID, storeId: STORE_ID });
    mockPrisma.storeMembership.update.mockResolvedValue(
      makeStoreMembershipRow({ role: "MANAGER" })
    );

    const result = await updateStaffMember(STORE_ID, MEMBERSHIP_ID, { role: "MANAGER" });

    expect(result.role).toBe("MANAGER");
    expect(mockPrisma.storeMembership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBERSHIP_ID },
        data: expect.objectContaining({ role: "MANAGER" }),
      })
    );
  });

  it("updates status and returns mapped member", async () => {
    mockPrisma.storeMembership.findFirst.mockResolvedValue({ id: MEMBERSHIP_ID, storeId: STORE_ID });
    mockPrisma.storeMembership.update.mockResolvedValue(
      makeStoreMembershipRow({ status: "INACTIVE" })
    );

    const result = await updateStaffMember(STORE_ID, MEMBERSHIP_ID, { status: "INACTIVE" });

    expect(result.status).toBe("INACTIVE");
  });

  it("throws error when staff member not found in store", async () => {
    mockPrisma.storeMembership.findFirst.mockResolvedValue(null);

    await expect(
      updateStaffMember(STORE_ID, "nonexistent-id", { role: "ADMIN" })
    ).rejects.toThrow("not found in store");
  });

  it("checks storeId scope when finding existing member", async () => {
    mockPrisma.storeMembership.findFirst.mockResolvedValue(null);

    await expect(
      updateStaffMember(STORE_ID, MEMBERSHIP_ID, { role: "MANAGER" })
    ).rejects.toThrow();

    expect(mockPrisma.storeMembership.findFirst).toHaveBeenCalledWith({
      where: { id: MEMBERSHIP_ID, storeId: STORE_ID },
    });
  });

  it("does not include role key when role not provided", async () => {
    mockPrisma.storeMembership.findFirst.mockResolvedValue({ id: MEMBERSHIP_ID, storeId: STORE_ID });
    mockPrisma.storeMembership.update.mockResolvedValue(
      makeStoreMembershipRow({ status: "INACTIVE" })
    );

    await updateStaffMember(STORE_ID, MEMBERSHIP_ID, { status: "INACTIVE" });

    const callData = mockPrisma.storeMembership.update.mock.calls[0][0].data;
    expect(callData).not.toHaveProperty("role");
    expect(callData).toHaveProperty("status", "INACTIVE");
  });
});

// ─── getScheduleData ──────────────────────────────────────────────────────────

describe("getScheduleData", () => {
  it("returns storeId and mapped hours", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([
      makeStoreHoursRow(1),
      makeStoreHoursRow(2),
    ]);

    const result = await getScheduleData(STORE_ID);

    expect(result.storeId).toBe(STORE_ID);
    expect(result.hours).toHaveLength(2);
  });

  it("maps dayOfWeek to correct dayLabel", async () => {
    const days = [
      { dayOfWeek: 0, expected: "Sun" },
      { dayOfWeek: 1, expected: "Mon" },
      { dayOfWeek: 2, expected: "Tue" },
      { dayOfWeek: 3, expected: "Wed" },
      { dayOfWeek: 4, expected: "Thu" },
      { dayOfWeek: 5, expected: "Fri" },
      { dayOfWeek: 6, expected: "Sat" },
    ];

    for (const { dayOfWeek, expected } of days) {
      mockPrisma.storeHours.findMany.mockResolvedValue([makeStoreHoursRow(dayOfWeek)]);
      const result = await getScheduleData(STORE_ID);
      expect(result.hours[0].dayLabel).toBe(expected);
    }
  });

  it("returns empty hours array when no schedule configured", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([]);

    const result = await getScheduleData(STORE_ID);

    expect(result.hours).toEqual([]);
  });

  it("maps isOpen, openTimeLocal, closeTimeLocal correctly", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([
      makeStoreHoursRow(1, { isOpen: false, openTimeLocal: "10:00", closeTimeLocal: "22:00" }),
    ]);

    const result = await getScheduleData(STORE_ID);
    const h = result.hours[0];

    expect(h.isOpen).toBe(false);
    expect(h.openTimeLocal).toBe("10:00");
    expect(h.closeTimeLocal).toBe("22:00");
  });

  it("maps pickup window times when set", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([
      makeStoreHoursRow(3, { pickupStartTimeLocal: "11:00", pickupEndTimeLocal: "15:00" }),
    ]);

    const result = await getScheduleData(STORE_ID);
    const h = result.hours[0];

    expect(h.pickupStartTimeLocal).toBe("11:00");
    expect(h.pickupEndTimeLocal).toBe("15:00");
  });

  it("maps pickup window times to null when not set", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([
      makeStoreHoursRow(4, { pickupStartTimeLocal: null, pickupEndTimeLocal: null }),
    ]);

    const result = await getScheduleData(STORE_ID);
    const h = result.hours[0];

    expect(h.pickupStartTimeLocal).toBeNull();
    expect(h.pickupEndTimeLocal).toBeNull();
  });

  it("queries hours ordered by dayOfWeek ascending", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([]);

    await getScheduleData(STORE_ID);

    expect(mockPrisma.storeHours.findMany).toHaveBeenCalledWith({
      where: { storeId: STORE_ID },
      orderBy: { dayOfWeek: "asc" },
    });
  });

  it("uses '?' as dayLabel for out-of-range dayOfWeek", async () => {
    mockPrisma.storeHours.findMany.mockResolvedValue([
      makeStoreHoursRow(99),
    ]);

    const result = await getScheduleData(STORE_ID);

    expect(result.hours[0].dayLabel).toBe("?");
  });
});
