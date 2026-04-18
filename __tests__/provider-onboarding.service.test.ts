import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    providerOnboardingApplication: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  applyForProvider,
  getUserApplication,
  listApplications,
  getApplication,
  reviewApplication,
  getProviderStripeStatus,
} from "@/services/provider/provider-onboarding.service";

const mockPrisma = prisma as unknown as {
  providerOnboardingApplication: {
    create: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  user: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = "user-1";
const ADMIN_ID = "admin-1";
const APP_ID = "app-1";

const mockRow = {
  id: APP_ID,
  userId: USER_ID,
  businessName: "홍길동 요리연구소",
  businessType: "INDIVIDUAL",
  taxId: null,
  portfolioUrl: "https://example.com",
  introduction: "레시피 전문가입니다.",
  status: "PENDING",
  adminNotes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  reviewedAt: null,
  reviewedByUserId: null,
  applicant: { name: "홍길동", email: "hong@example.com" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── applyForProvider ─────────────────────────────────────────────────────────

describe("applyForProvider", () => {
  it("creates a PENDING application and timestamps the user", async () => {
    mockPrisma.providerOnboardingApplication.findFirst.mockResolvedValue(null);
    mockPrisma.providerOnboardingApplication.create.mockResolvedValue(mockRow);
    mockPrisma.user.update.mockResolvedValue({});

    const result = await applyForProvider(USER_ID, {
      businessName: "  홍길동 요리연구소  ",
      portfolioUrl: "https://example.com",
    });

    expect(result.status).toBe("PENDING");
    expect(result.businessName).toBe("홍길동 요리연구소");
    expect(result.applicantName).toBe("홍길동");
    expect(mockPrisma.providerOnboardingApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: USER_ID,
          businessName: "홍길동 요리연구소",
          businessType: "INDIVIDUAL",
        }),
      })
    );
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({ providerAppliedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when a PENDING application already exists", async () => {
    mockPrisma.providerOnboardingApplication.findFirst.mockResolvedValue({
      ...mockRow,
      status: "PENDING",
    });

    await expect(
      applyForProvider(USER_ID, { businessName: "새 신청" })
    ).rejects.toThrow("A pending application already exists");
  });

  it("throws when user is already an approved provider", async () => {
    mockPrisma.providerOnboardingApplication.findFirst.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
    });

    await expect(
      applyForProvider(USER_ID, { businessName: "새 신청" })
    ).rejects.toThrow("already an approved recipe provider");
  });
});

// ─── getUserApplication ───────────────────────────────────────────────────────

describe("getUserApplication", () => {
  it("returns the most recent application", async () => {
    mockPrisma.providerOnboardingApplication.findFirst.mockResolvedValue(mockRow);

    const result = await getUserApplication(USER_ID);

    expect(result?.id).toBe(APP_ID);
    expect(result?.status).toBe("PENDING");
    expect(mockPrisma.providerOnboardingApplication.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID } })
    );
  });

  it("returns null when no application exists", async () => {
    mockPrisma.providerOnboardingApplication.findFirst.mockResolvedValue(null);

    const result = await getUserApplication(USER_ID);

    expect(result).toBeNull();
  });
});

// ─── listApplications ─────────────────────────────────────────────────────────

describe("listApplications", () => {
  it("returns paginated results", async () => {
    mockPrisma.providerOnboardingApplication.findMany.mockResolvedValue([mockRow]);
    mockPrisma.providerOnboardingApplication.count.mockResolvedValue(1);

    const result = await listApplications();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].businessName).toBe("홍길동 요리연구소");
  });

  it("filters by status", async () => {
    mockPrisma.providerOnboardingApplication.findMany.mockResolvedValue([]);
    mockPrisma.providerOnboardingApplication.count.mockResolvedValue(0);

    await listApplications({ status: "PENDING" });

    expect(mockPrisma.providerOnboardingApplication.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: "PENDING" } })
    );
  });
});

// ─── getApplication ───────────────────────────────────────────────────────────

describe("getApplication", () => {
  it("returns the application by ID", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue(mockRow);

    const result = await getApplication(APP_ID);

    expect(result.id).toBe(APP_ID);
  });

  it("throws when not found", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue(null);

    await expect(getApplication("nonexistent")).rejects.toThrow(
      "ProviderOnboardingApplication nonexistent not found"
    );
  });
});

// ─── reviewApplication ────────────────────────────────────────────────────────

describe("reviewApplication", () => {
  it("approves a PENDING application and upgrades platformRole", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue({
      id: APP_ID,
      status: "PENDING",
      userId: USER_ID,
    });
    mockPrisma.providerOnboardingApplication.update.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
      reviewedByUserId: ADMIN_ID,
      reviewedAt: new Date(),
    });
    mockPrisma.user.update.mockResolvedValue({});

    const result = await reviewApplication(APP_ID, ADMIN_ID, {
      status: "APPROVED",
    });

    expect(result.status).toBe("APPROVED");
    expect(mockPrisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          platformRole: "RECIPE_PROVIDER",
          providerApprovedAt: expect.any(Date),
        }),
      })
    );
  });

  it("rejects a PENDING application without changing platformRole", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue({
      id: APP_ID,
      status: "PENDING",
      userId: USER_ID,
    });
    mockPrisma.providerOnboardingApplication.update.mockResolvedValue({
      ...mockRow,
      status: "REJECTED",
      adminNotes: "포트폴리오 불충분",
      reviewedByUserId: ADMIN_ID,
    });

    const result = await reviewApplication(APP_ID, ADMIN_ID, {
      status: "REJECTED",
      adminNotes: "포트폴리오 불충분",
    });

    expect(result.status).toBe("REJECTED");
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  it("throws when application not found", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue(null);

    await expect(
      reviewApplication("nonexistent", ADMIN_ID, { status: "APPROVED" })
    ).rejects.toThrow("not found");
  });

  it("throws when application already reviewed", async () => {
    mockPrisma.providerOnboardingApplication.findUnique.mockResolvedValue({
      id: APP_ID,
      status: "APPROVED",
      userId: USER_ID,
    });

    await expect(
      reviewApplication(APP_ID, ADMIN_ID, { status: "REJECTED" })
    ).rejects.toThrow("already been reviewed");
  });
});

// ─── getProviderStripeStatus ──────────────────────────────────────────────────

describe("getProviderStripeStatus", () => {
  it("returns status when user has no Connect account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: null,
      stripeConnectOnboarded: false,
      stripeConnectPayoutsEnabled: false,
    });

    const result = await getProviderStripeStatus(USER_ID);

    expect(result.hasAccount).toBe(false);
    expect(result.payoutsEnabled).toBe(false);
  });

  it("returns status when user has a Connect account", async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      stripeConnectAccountId: "acct_test",
      stripeConnectOnboarded: true,
      stripeConnectPayoutsEnabled: true,
    });

    const result = await getProviderStripeStatus(USER_ID);

    expect(result.hasAccount).toBe(true);
    expect(result.accountId).toBe("acct_test");
    expect(result.payoutsEnabled).toBe(true);
  });

  it("throws when user not found", async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(getProviderStripeStatus("nonexistent")).rejects.toThrow(
      "User nonexistent not found"
    );
  });
});
