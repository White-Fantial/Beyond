import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredientRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createIngredientRequest,
  listIngredientRequests,
  getUserIngredientRequests,
  getIngredientRequest,
  reviewIngredientRequest,
} from "@/services/marketplace/ingredient-requests.service";

const mockPrisma = prisma as unknown as {
  ingredientRequest: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = "user-1";
const MODERATOR_ID = "mod-1";
const REQUEST_ID = "req-1";
const PI_ID = "pi-1";

const mockRow = {
  id: REQUEST_ID,
  requestedByUserId: USER_ID,
  name: "트러플 오일",
  description: "고급 요리용 오일",
  category: "오일",
  unit: "ML",
  notes: "파스타에 마무리로 사용",
  status: "PENDING",
  resolvedPlatformIngredientId: null,
  reviewedByUserId: null,
  reviewNotes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  requestedBy: { name: "홍길동" },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createIngredientRequest ─────────────────────────────────────────────────

describe("createIngredientRequest", () => {
  it("creates a PENDING request with trimmed fields", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue(mockRow);

    const result = await createIngredientRequest(USER_ID, {
      name: "  트러플 오일  ",
      category: "오일",
      unit: "ML",
      notes: "파스타에 마무리로 사용",
    });

    expect(result.name).toBe("트러플 오일");
    expect(result.status).toBe("PENDING");
    expect(result.requestedByName).toBe("홍길동");
    expect(mockPrisma.ingredientRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedByUserId: USER_ID,
          name: "트러플 오일",
          status: "PENDING",
        }),
      })
    );
  });

  it("defaults unit to GRAM when not provided", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue({
      ...mockRow,
      unit: "GRAM",
    });

    await createIngredientRequest(USER_ID, { name: "새우" });

    expect(mockPrisma.ingredientRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: "GRAM" }),
      })
    );
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue(mockRow);

    const result = await createIngredientRequest(USER_ID, { name: "된장" });

    expect(typeof result.createdAt).toBe("string");
    expect(result.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ─── listIngredientRequests ──────────────────────────────────────────────────

describe("listIngredientRequests", () => {
  it("returns paginated results", async () => {
    mockPrisma.ingredientRequest.findMany.mockResolvedValue([mockRow]);
    mockPrisma.ingredientRequest.count.mockResolvedValue(1);

    const result = await listIngredientRequests();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("트러플 오일");
  });

  it("filters by status", async () => {
    mockPrisma.ingredientRequest.findMany.mockResolvedValue([]);
    mockPrisma.ingredientRequest.count.mockResolvedValue(0);

    await listIngredientRequests({ status: "PENDING" });

    expect(mockPrisma.ingredientRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ status: "PENDING" }),
      })
    );
  });

  it("filters by requestedByUserId", async () => {
    mockPrisma.ingredientRequest.findMany.mockResolvedValue([]);
    mockPrisma.ingredientRequest.count.mockResolvedValue(0);

    await listIngredientRequests({ requestedByUserId: USER_ID });

    expect(mockPrisma.ingredientRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ requestedByUserId: USER_ID }),
      })
    );
  });
});

// ─── getUserIngredientRequests ───────────────────────────────────────────────

describe("getUserIngredientRequests", () => {
  it("returns only requests by the given user", async () => {
    mockPrisma.ingredientRequest.findMany.mockResolvedValue([mockRow]);
    mockPrisma.ingredientRequest.count.mockResolvedValue(1);

    const result = await getUserIngredientRequests(USER_ID);

    expect(result.items).toHaveLength(1);
    expect(mockPrisma.ingredientRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { requestedByUserId: USER_ID },
      })
    );
  });
});

// ─── getIngredientRequest ────────────────────────────────────────────────────

describe("getIngredientRequest", () => {
  it("returns the request", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);

    const result = await getIngredientRequest(REQUEST_ID);

    expect(result.id).toBe(REQUEST_ID);
    expect(result.name).toBe("트러플 오일");
  });

  it("throws when not found", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(null);

    await expect(getIngredientRequest("nonexistent")).rejects.toThrow(
      "IngredientRequest nonexistent not found"
    );
  });
});

// ─── reviewIngredientRequest ─────────────────────────────────────────────────

describe("reviewIngredientRequest", () => {
  it("approves a PENDING request with resolvedPlatformIngredientId", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.ingredientRequest.update.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
      resolvedPlatformIngredientId: PI_ID,
      reviewedByUserId: MODERATOR_ID,
      reviewNotes: "등록 완료",
    });

    const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
      status: "APPROVED",
      resolvedPlatformIngredientId: PI_ID,
      reviewNotes: "등록 완료",
    });

    expect(result.status).toBe("APPROVED");
    expect(result.resolvedPlatformIngredientId).toBe(PI_ID);
    expect(mockPrisma.ingredientRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          resolvedPlatformIngredientId: PI_ID,
          reviewedByUserId: MODERATOR_ID,
        }),
      })
    );
  });

  it("rejects a PENDING request without resolvedPlatformIngredientId", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.ingredientRequest.update.mockResolvedValue({
      ...mockRow,
      status: "REJECTED",
      reviewedByUserId: MODERATOR_ID,
      reviewNotes: "이미 비슷한 재료가 있음",
    });

    const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
      status: "REJECTED",
      reviewNotes: "이미 비슷한 재료가 있음",
    });

    expect(result.status).toBe("REJECTED");
  });

  it("marks as DUPLICATE with resolvedPlatformIngredientId", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);
    mockPrisma.ingredientRequest.update.mockResolvedValue({
      ...mockRow,
      status: "DUPLICATE",
      resolvedPlatformIngredientId: PI_ID,
      reviewedByUserId: MODERATOR_ID,
    });

    const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
      status: "DUPLICATE",
      resolvedPlatformIngredientId: PI_ID,
    });

    expect(result.status).toBe("DUPLICATE");
    expect(result.resolvedPlatformIngredientId).toBe(PI_ID);
  });

  it("throws when request not found", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(null);

    await expect(
      reviewIngredientRequest("nonexistent", MODERATOR_ID, {
        status: "REJECTED",
      })
    ).rejects.toThrow("IngredientRequest nonexistent not found");
  });

  it("throws when request is already reviewed", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue({
      ...mockRow,
      status: "APPROVED",
    });

    await expect(
      reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, { status: "REJECTED" })
    ).rejects.toThrow("has already been reviewed");
  });

  it("throws when APPROVED without resolvedPlatformIngredientId", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);

    await expect(
      reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, { status: "APPROVED" })
    ).rejects.toThrow("resolvedPlatformIngredientId is required");
  });

  it("throws when DUPLICATE without resolvedPlatformIngredientId", async () => {
    mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);

    await expect(
      reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, { status: "DUPLICATE" })
    ).rejects.toThrow("resolvedPlatformIngredientId is required");
  });
});
