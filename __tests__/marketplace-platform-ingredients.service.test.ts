import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    platformIngredient: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listPlatformIngredients,
  getPlatformIngredient,
  createPlatformIngredient,
  updatePlatformIngredient,
  deletePlatformIngredient,
} from "@/services/marketplace/platform-ingredients.service";

const mockPrisma = prisma as unknown as {
  platformIngredient: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const CREATOR_ID = "user-mod-1";

const mockIngredient = {
  id: "pi-1",
  name: "소금",
  description: null,
  category: "조미료",
  unit: "GRAM",
  referenceUnitCost: 2,
  currency: "KRW",
  isActive: true,
  createdByUserId: CREATOR_ID,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listPlatformIngredients ──────────────────────────────────────────────────

describe("listPlatformIngredients", () => {
  it("returns paginated ingredients", async () => {
    mockPrisma.platformIngredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.platformIngredient.count.mockResolvedValue(1);

    const result = await listPlatformIngredients();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("소금");
    expect(result.items[0].category).toBe("조미료");
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.platformIngredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.platformIngredient.count.mockResolvedValue(1);

    const result = await listPlatformIngredients();
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("filters by isActive", async () => {
    mockPrisma.platformIngredient.findMany.mockResolvedValue([]);
    mockPrisma.platformIngredient.count.mockResolvedValue(0);

    const result = await listPlatformIngredients({ isActive: false });

    expect(result.items).toHaveLength(0);
    expect(mockPrisma.platformIngredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("filters by category", async () => {
    mockPrisma.platformIngredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.platformIngredient.count.mockResolvedValue(1);

    await listPlatformIngredients({ category: "조미료" });

    expect(mockPrisma.platformIngredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "조미료" }),
      })
    );
  });
});

// ─── getPlatformIngredient ────────────────────────────────────────────────────

describe("getPlatformIngredient", () => {
  it("returns ingredient by id", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(mockIngredient);

    const result = await getPlatformIngredient("pi-1");
    expect(result.id).toBe("pi-1");
    expect(result.name).toBe("소금");
  });

  it("throws when not found", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(null);

    await expect(getPlatformIngredient("nonexistent")).rejects.toThrow(
      "PlatformIngredient nonexistent not found"
    );
  });
});

// ─── createPlatformIngredient ─────────────────────────────────────────────────

describe("createPlatformIngredient", () => {
  it("creates an ingredient and returns it", async () => {
    mockPrisma.platformIngredient.create.mockResolvedValue(mockIngredient);

    const result = await createPlatformIngredient(CREATOR_ID, {
      name: "소금",
      unit: "GRAM",
      referenceUnitCost: 2,
      category: "조미료",
    });

    expect(result.name).toBe("소금");
    expect(mockPrisma.platformIngredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "소금",
          createdByUserId: CREATOR_ID,
          unit: "GRAM",
          referenceUnitCost: 2,
        }),
      })
    );
  });

  it("defaults currency to KRW", async () => {
    mockPrisma.platformIngredient.create.mockResolvedValue({
      ...mockIngredient,
      currency: "KRW",
    });

    const result = await createPlatformIngredient(CREATOR_ID, {
      name: "설탕",
      unit: "GRAM",
      referenceUnitCost: 3,
    });

    expect(result.currency).toBe("KRW");
  });
});

// ─── updatePlatformIngredient ─────────────────────────────────────────────────

describe("updatePlatformIngredient", () => {
  it("updates and returns ingredient", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.platformIngredient.update.mockResolvedValue({
      ...mockIngredient,
      name: "굵은 소금",
    });

    const result = await updatePlatformIngredient("pi-1", { name: "굵은 소금" });
    expect(result.name).toBe("굵은 소금");
  });

  it("throws when not found", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(null);

    await expect(
      updatePlatformIngredient("nonexistent", { name: "X" })
    ).rejects.toThrow("PlatformIngredient nonexistent not found");
  });
});

// ─── deletePlatformIngredient ─────────────────────────────────────────────────

describe("deletePlatformIngredient", () => {
  it("soft-deletes the ingredient", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.platformIngredient.update.mockResolvedValue({
      ...mockIngredient,
      deletedAt: new Date(),
    });

    await deletePlatformIngredient("pi-1");

    expect(mockPrisma.platformIngredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pi-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when not found", async () => {
    mockPrisma.platformIngredient.findFirst.mockResolvedValue(null);

    await expect(deletePlatformIngredient("nonexistent")).rejects.toThrow(
      "PlatformIngredient nonexistent not found"
    );
  });
});
