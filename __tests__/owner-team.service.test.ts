import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    membership: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    storeMembership: {
      create: vi.fn(),
      createMany: vi.fn(),
      updateMany: vi.fn(),
      findMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    store: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  listOwnerTeamMembers,
  getOwnerTeamMember,
  inviteOwnerTeamMember,
  updateOwnerTeamMember,
  removeOwnerTeamMember,
} from "@/services/owner/owner-team.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

const mockPrisma = prisma as unknown as {
  membership: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  storeMembership: {
    create: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  store: {
    findMany: ReturnType<typeof vi.fn>;
  };
};

const mockAudit = logAuditEvent as ReturnType<typeof vi.fn>;

// ─── Constants ────────────────────────────────────────────────────────────────

const TENANT_ID = "tenant-001";
const USER_ID = "user-001";
const MEMBERSHIP_ID = "membership-001";
const STORE_ID = "store-001";
const STORE_MEMBERSHIP_ID = "sm-001";
const ACTOR_ID = "actor-001";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeMembershipRow(overrides: Partial<{
  id: string; role: string; status: string;
  joinedAt: Date | null; createdAt: Date;
}> = {}) {
  return {
    id: MEMBERSHIP_ID,
    role: "STAFF",
    status: "ACTIVE",
    joinedAt: new Date("2024-01-15T00:00:00Z"),
    createdAt: new Date("2024-01-01T00:00:00Z"),
    user: {
      id: USER_ID,
      name: "Alice Smith",
      email: "alice@example.com",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
    storeMemberships: [
      {
        id: STORE_MEMBERSHIP_ID,
        storeId: STORE_ID,
        role: "STAFF",
        status: "ACTIVE",
        store: { id: STORE_ID, name: "Main Store" },
      },
    ],
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe("listOwnerTeamMembers", () => {
  it("returns formatted team members", async () => {
    mockPrisma.membership.findMany.mockResolvedValue([makeMembershipRow()]);

    const result = await listOwnerTeamMembers(TENANT_ID);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      membershipId: MEMBERSHIP_ID,
      userId: USER_ID,
      name: "Alice Smith",
      email: "alice@example.com",
      role: "STAFF",
      status: "ACTIVE",
    });
  });

  it("includes store assignments", async () => {
    mockPrisma.membership.findMany.mockResolvedValue([makeMembershipRow()]);

    const result = await listOwnerTeamMembers(TENANT_ID);

    expect(result[0].storeAssignments).toHaveLength(1);
    expect(result[0].storeAssignments[0]).toMatchObject({
      storeMembershipId: STORE_MEMBERSHIP_ID,
      storeId: STORE_ID,
      storeName: "Main Store",
      storeRole: "STAFF",
    });
  });

  it("returns empty array when no members", async () => {
    mockPrisma.membership.findMany.mockResolvedValue([]);

    const result = await listOwnerTeamMembers(TENANT_ID);

    expect(result).toHaveLength(0);
  });

  it("sets invitedAt for INVITED members, null for others", async () => {
    const invited = makeMembershipRow({ status: "INVITED" });
    mockPrisma.membership.findMany.mockResolvedValue([invited]);

    const result = await listOwnerTeamMembers(TENANT_ID);

    expect(result[0].invitedAt).toBe(invited.createdAt.toISOString());
  });

  it("sets invitedAt to null for ACTIVE members", async () => {
    mockPrisma.membership.findMany.mockResolvedValue([makeMembershipRow({ status: "ACTIVE" })]);

    const result = await listOwnerTeamMembers(TENANT_ID);

    expect(result[0].invitedAt).toBeNull();
  });
});

describe("getOwnerTeamMember", () => {
  it("returns member with store assignments", async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(makeMembershipRow());

    const result = await getOwnerTeamMember(MEMBERSHIP_ID, TENANT_ID);

    expect(result).not.toBeNull();
    expect(result!.membershipId).toBe(MEMBERSHIP_ID);
    expect(result!.storeAssignments).toHaveLength(1);
  });

  it("returns null when member not found", async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    const result = await getOwnerTeamMember("nonexistent", TENANT_ID);

    expect(result).toBeNull();
  });
});

describe("inviteOwnerTeamMember", () => {
  it("creates new user and membership when user does not exist", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({
      id: USER_ID,
      email: "new@example.com",
      name: "New User",
      status: "INVITED",
      createdAt: new Date(),
    });
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(null)  // first call: check existing membership
      .mockResolvedValueOnce(makeMembershipRow()); // second call: getOwnerTeamMember
    mockPrisma.membership.create.mockResolvedValue({ id: MEMBERSHIP_ID });
    mockPrisma.membership.findMany.mockResolvedValue([]);

    await inviteOwnerTeamMember({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      email: "new@example.com",
    });

    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@example.com", status: "INVITED" }),
      })
    );
    expect(mockPrisma.membership.create).toHaveBeenCalled();
  });

  it("reuses existing user when user already exists", async () => {
    const existingUser = { id: USER_ID, email: "alice@example.com", name: "Alice", status: "ACTIVE" };
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(null)  // first call: check existing membership
      .mockResolvedValueOnce(makeMembershipRow()); // second call: getOwnerTeamMember
    mockPrisma.membership.create.mockResolvedValue({ id: MEMBERSHIP_ID });

    await inviteOwnerTeamMember({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      email: "alice@example.com",
    });

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
    expect(mockPrisma.membership.create).toHaveBeenCalled();
  });

  it("does not create duplicate membership when membership already exists", async () => {
    const existingUser = { id: USER_ID, email: "alice@example.com", name: "Alice" };
    const existingMembership = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, userId: USER_ID, role: "STAFF" };
    mockPrisma.user.findUnique.mockResolvedValue(existingUser);
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(existingMembership) // first call: existing membership found
      .mockResolvedValueOnce(makeMembershipRow()); // second call: getOwnerTeamMember
    mockAudit.mockResolvedValue(undefined);

    await inviteOwnerTeamMember({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      email: "alice@example.com",
    });

    expect(mockPrisma.membership.create).not.toHaveBeenCalled();
  });

  it("logs audit event on invite", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.user.create.mockResolvedValue({ id: USER_ID, email: "new@example.com", name: "New" });
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeMembershipRow());
    mockPrisma.membership.create.mockResolvedValue({ id: MEMBERSHIP_ID });

    await inviteOwnerTeamMember({
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      email: "new@example.com",
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_TEAM_MEMBER_INVITED",
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
      })
    );
  });
});

describe("updateOwnerTeamMember", () => {
  it("updates role successfully", async () => {
    const membershipRow = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "STAFF", status: "ACTIVE" };
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(membershipRow)   // initial fetch
      .mockResolvedValueOnce(makeMembershipRow({ role: "MANAGER" })); // re-fetch after update
    mockPrisma.membership.update.mockResolvedValue({ ...membershipRow, role: "MANAGER" });
    mockAudit.mockResolvedValue(undefined);

    const result = await updateOwnerTeamMember({
      membershipId: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      role: "MANAGER",
    });

    expect(mockPrisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBERSHIP_ID },
        data: expect.objectContaining({ role: "MANAGER" }),
      })
    );
    expect(result).toBeDefined();
  });

  it("blocks demoting last OWNER", async () => {
    const ownerMembership = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "OWNER", status: "ACTIVE" };
    mockPrisma.membership.findFirst.mockResolvedValueOnce(ownerMembership);
    mockPrisma.membership.count.mockResolvedValue(0); // no other owners

    await expect(
      updateOwnerTeamMember({
        membershipId: MEMBERSHIP_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
        role: "ADMIN",
      })
    ).rejects.toThrow("LAST_OWNER_DEMOTION_BLOCKED");
  });

  it("allows changing role when other owners exist", async () => {
    const ownerMembership = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "OWNER", status: "ACTIVE" };
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(ownerMembership)
      .mockResolvedValueOnce(makeMembershipRow({ role: "ADMIN" }));
    mockPrisma.membership.count.mockResolvedValue(1); // another owner exists
    mockPrisma.membership.update.mockResolvedValue({ ...ownerMembership, role: "ADMIN" });
    mockAudit.mockResolvedValue(undefined);

    await expect(
      updateOwnerTeamMember({
        membershipId: MEMBERSHIP_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
        role: "ADMIN",
      })
    ).resolves.toBeDefined();
  });

  it("deactivates a member", async () => {
    const membershipRow = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "STAFF", status: "ACTIVE" };
    mockPrisma.membership.findFirst
      .mockResolvedValueOnce(membershipRow)
      .mockResolvedValueOnce(makeMembershipRow({ status: "INACTIVE" }));
    mockPrisma.membership.update.mockResolvedValue({ ...membershipRow, status: "INACTIVE" });
    mockAudit.mockResolvedValue(undefined);

    await updateOwnerTeamMember({
      membershipId: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
      status: "INACTIVE",
    });

    expect(mockPrisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "INACTIVE" }),
      })
    );
  });

  it("throws MEMBERSHIP_NOT_FOUND when membership does not belong to tenant", async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      updateOwnerTeamMember({
        membershipId: "nonexistent",
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
        role: "ADMIN",
      })
    ).rejects.toThrow("MEMBERSHIP_NOT_FOUND");
  });
});

describe("removeOwnerTeamMember", () => {
  it("soft deletes membership and store memberships", async () => {
    const membershipRow = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "STAFF", status: "ACTIVE" };
    mockPrisma.membership.findFirst.mockResolvedValue(membershipRow);
    mockPrisma.membership.update.mockResolvedValue({ ...membershipRow, status: "REMOVED" });
    mockPrisma.storeMembership.updateMany.mockResolvedValue({ count: 1 });
    mockAudit.mockResolvedValue(undefined);

    await removeOwnerTeamMember({
      membershipId: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
    });

    expect(mockPrisma.membership.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: MEMBERSHIP_ID },
        data: { status: "REMOVED" },
      })
    );
    expect(mockPrisma.storeMembership.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ membershipId: MEMBERSHIP_ID }),
        data: { status: "REMOVED" },
      })
    );
  });

  it("blocks removing the last OWNER", async () => {
    const ownerMembership = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "OWNER", status: "ACTIVE" };
    mockPrisma.membership.findFirst.mockResolvedValue(ownerMembership);
    mockPrisma.membership.count.mockResolvedValue(0); // no other owners

    await expect(
      removeOwnerTeamMember({
        membershipId: MEMBERSHIP_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
      })
    ).rejects.toThrow("LAST_OWNER_DEMOTION_BLOCKED");
  });

  it("allows removing OWNER when other owners exist", async () => {
    const ownerMembership = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "OWNER", status: "ACTIVE" };
    mockPrisma.membership.findFirst.mockResolvedValue(ownerMembership);
    mockPrisma.membership.count.mockResolvedValue(2); // 2 other owners
    mockPrisma.membership.update.mockResolvedValue({ ...ownerMembership, status: "REMOVED" });
    mockPrisma.storeMembership.updateMany.mockResolvedValue({ count: 0 });
    mockAudit.mockResolvedValue(undefined);

    await expect(
      removeOwnerTeamMember({
        membershipId: MEMBERSHIP_ID,
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
      })
    ).resolves.toBeUndefined();
  });

  it("logs OWNER_TEAM_MEMBER_REMOVED audit event", async () => {
    const membershipRow = { id: MEMBERSHIP_ID, tenantId: TENANT_ID, role: "STAFF", status: "ACTIVE" };
    mockPrisma.membership.findFirst.mockResolvedValue(membershipRow);
    mockPrisma.membership.update.mockResolvedValue({ ...membershipRow, status: "REMOVED" });
    mockPrisma.storeMembership.updateMany.mockResolvedValue({ count: 0 });
    mockAudit.mockResolvedValue(undefined);

    await removeOwnerTeamMember({
      membershipId: MEMBERSHIP_ID,
      tenantId: TENANT_ID,
      actorUserId: ACTOR_ID,
    });

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_TEAM_MEMBER_REMOVED",
        targetId: MEMBERSHIP_ID,
      })
    );
  });

  it("throws MEMBERSHIP_NOT_FOUND when membership not found", async () => {
    mockPrisma.membership.findFirst.mockResolvedValue(null);

    await expect(
      removeOwnerTeamMember({
        membershipId: "nonexistent",
        tenantId: TENANT_ID,
        actorUserId: ACTOR_ID,
      })
    ).rejects.toThrow("MEMBERSHIP_NOT_FOUND");
  });
});
