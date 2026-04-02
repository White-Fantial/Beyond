import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    subscription: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  pauseOwnerSubscription,
  resumeOwnerSubscription,
  cancelOwnerSubscription,
  updateOwnerSubscriptionNextDate,
  updateOwnerSubscriptionNote,
  SubscriptionTransitionError,
} from "@/services/owner/subscription-management-service";

const mockPrisma = prisma as unknown as {
  subscription: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};
const mockAudit = logAuditEvent as ReturnType<typeof vi.fn>;

const TENANT_ID = "tenant-001";
const WRONG_TENANT_ID = "tenant-002";
const ACTOR = { userId: "user-001" };

const baseSub = (status = "ACTIVE", overrides = {}) => ({
  id: "sub-001",
  planId: "plan-001",
  customerId: "cust-001",
  status,
  startDate: new Date("2026-01-01"),
  nextBillingDate: new Date("2026-05-01"),
  nextOrderAt: null,
  cancelledAt: null,
  pausedAt: null,
  cancelReason: null,
  internalNote: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-04-01"),
  plan: {
    id: "plan-001",
    store: {
      id: "store-001",
      name: "Store Alpha",
      tenantId: TENANT_ID,
    },
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.subscription.update.mockResolvedValue({});
});

// ─── pauseOwnerSubscription ───────────────────────────────────────────────────

describe("pauseOwnerSubscription", () => {
  it("transitions ACTIVE → PAUSED successfully", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "sub-001" },
        data: expect.objectContaining({ status: "PAUSED" }),
      })
    );
  });

  it("logs OWNER_SUBSCRIPTION_PAUSED audit event", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR, "Holiday break");

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_SUBSCRIPTION_PAUSED",
        targetId: "sub-001",
        tenantId: TENANT_ID,
        actorUserId: ACTOR.userId,
        metadata: expect.objectContaining({
          reason: "Holiday break",
          before: { status: "ACTIVE" },
          after: { status: "PAUSED" },
        }),
      })
    );
  });

  it("throws SubscriptionTransitionError when already PAUSED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("PAUSED"));

    await expect(pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      SubscriptionTransitionError
    );
    await expect(pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      "already paused"
    );
  });

  it("throws SubscriptionTransitionError when CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("CANCELLED"));

    await expect(pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      SubscriptionTransitionError
    );
    await expect(pauseOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      "cancelled"
    );
  });

  it("throws CROSS_TENANT_ACCESS_DENIED for wrong tenant", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await expect(
      pauseOwnerSubscription("sub-001", WRONG_TENANT_ID, ACTOR)
    ).rejects.toThrow("CROSS_TENANT_ACCESS_DENIED");
  });

  it("throws SUBSCRIPTION_NOT_FOUND when subscription doesn't exist", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(null);

    await expect(pauseOwnerSubscription("nonexistent", TENANT_ID, ACTOR)).rejects.toThrow(
      "SUBSCRIPTION_NOT_FOUND"
    );
  });
});

// ─── resumeOwnerSubscription ──────────────────────────────────────────────────

describe("resumeOwnerSubscription", () => {
  it("transitions PAUSED → ACTIVE successfully", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("PAUSED"));

    await resumeOwnerSubscription("sub-001", TENANT_ID, ACTOR);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE", pausedAt: null }),
      })
    );
  });

  it("logs OWNER_SUBSCRIPTION_RESUMED audit event", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("PAUSED"));

    await resumeOwnerSubscription("sub-001", TENANT_ID, ACTOR);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_SUBSCRIPTION_RESUMED",
        tenantId: TENANT_ID,
      })
    );
  });

  it("throws SubscriptionTransitionError when CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("CANCELLED"));

    await expect(resumeOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      SubscriptionTransitionError
    );
  });

  it("throws SubscriptionTransitionError when already ACTIVE", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await expect(resumeOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      SubscriptionTransitionError
    );
    await expect(resumeOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      "already active"
    );
  });

  it("rejects cross-tenant access", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("PAUSED"));

    await expect(
      resumeOwnerSubscription("sub-001", WRONG_TENANT_ID, ACTOR)
    ).rejects.toThrow("CROSS_TENANT_ACCESS_DENIED");
  });
});

// ─── cancelOwnerSubscription ──────────────────────────────────────────────────

describe("cancelOwnerSubscription", () => {
  it("transitions ACTIVE → CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await cancelOwnerSubscription("sub-001", TENANT_ID, ACTOR, "Customer requested");

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "CANCELLED",
          cancelReason: "Customer requested",
        }),
      })
    );
  });

  it("transitions PAUSED → CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("PAUSED"));

    await cancelOwnerSubscription("sub-001", TENANT_ID, ACTOR);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CANCELLED" }),
      })
    );
  });

  it("logs OWNER_SUBSCRIPTION_CANCELLED audit event", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await cancelOwnerSubscription("sub-001", TENANT_ID, ACTOR, "Moved away");

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_SUBSCRIPTION_CANCELLED",
        metadata: expect.objectContaining({ reason: "Moved away" }),
      })
    );
  });

  it("throws SubscriptionTransitionError when already CANCELLED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("CANCELLED"));

    await expect(cancelOwnerSubscription("sub-001", TENANT_ID, ACTOR)).rejects.toThrow(
      SubscriptionTransitionError
    );
  });

  it("rejects cross-tenant access", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await expect(
      cancelOwnerSubscription("sub-001", WRONG_TENANT_ID, ACTOR)
    ).rejects.toThrow("CROSS_TENANT_ACCESS_DENIED");
  });
});

// ─── updateOwnerSubscriptionNextDate ─────────────────────────────────────────

describe("updateOwnerSubscriptionNextDate", () => {
  it("updates nextOrderAt and nextBillingDate", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await updateOwnerSubscriptionNextDate("sub-001", TENANT_ID, futureDate, ACTOR);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          nextOrderAt: futureDate,
          nextBillingDate: futureDate,
        }),
      })
    );
  });

  it("logs OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED audit event", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await updateOwnerSubscriptionNextDate("sub-001", TENANT_ID, futureDate, ACTOR);

    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_SUBSCRIPTION_NEXT_DATE_UPDATED",
      })
    );
  });

  it("throws when date is in the past", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));
    const pastDate = new Date(Date.now() - 1000);

    await expect(
      updateOwnerSubscriptionNextDate("sub-001", TENANT_ID, pastDate, ACTOR)
    ).rejects.toThrow("future");
  });

  it("throws SubscriptionTransitionError for CANCELLED subscription", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("CANCELLED"));
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await expect(
      updateOwnerSubscriptionNextDate("sub-001", TENANT_ID, futureDate, ACTOR)
    ).rejects.toThrow(SubscriptionTransitionError);
  });

  it("rejects cross-tenant access", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));
    const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await expect(
      updateOwnerSubscriptionNextDate("sub-001", WRONG_TENANT_ID, futureDate, ACTOR)
    ).rejects.toThrow("CROSS_TENANT_ACCESS_DENIED");
  });
});

// ─── updateOwnerSubscriptionNote ─────────────────────────────────────────────

describe("updateOwnerSubscriptionNote", () => {
  it("saves note and logs OWNER_SUBSCRIPTION_NOTE_UPDATED", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(
      baseSub("ACTIVE", { internalNote: "Old note" })
    );

    await updateOwnerSubscriptionNote("sub-001", TENANT_ID, "New note", ACTOR);

    expect(mockPrisma.subscription.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ internalNote: "New note" }),
      })
    );
    expect(mockAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "OWNER_SUBSCRIPTION_NOTE_UPDATED",
        metadata: expect.objectContaining({
          before: { note: "Old note" },
          after: { note: "New note" },
        }),
      })
    );
  });

  it("rejects cross-tenant access", async () => {
    mockPrisma.subscription.findUnique.mockResolvedValue(baseSub("ACTIVE"));

    await expect(
      updateOwnerSubscriptionNote("sub-001", WRONG_TENANT_ID, "note", ACTOR)
    ).rejects.toThrow("CROSS_TENANT_ACCESS_DENIED");
  });
});
