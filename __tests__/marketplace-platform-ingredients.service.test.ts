import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredient: {
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
  ingredient: {
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
  name: "Salt",
  description: null,
  category: "Seasoning",
  unit: "GRAM",
  isActive: true,
  createdByUserId: CREATOR_ID,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listPlatformIngredients ──────────────────────────────────────────────────

describe("listPlatformIngredients", () => {
  it("returns paginated ingredients", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await listPlatformIngredients();

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Salt");
    expect(result.items[0].category).toBe("Seasoning");
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await listPlatformIngredients();
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("filters by isActive", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    const result = await listPlatformIngredients({ isActive: false });

    expect(result.items).toHaveLength(0);
    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: false }),
      })
    );
  });

  it("filters by category", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    await listPlatformIngredients({ category: "Seasoning" });

    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "Seasoning" }),
      })
    );
  });
});

// ─── getPlatformIngredient ────────────────────────────────────────────────────

describe("getPlatformIngredient", () => {
  it("returns ingredient by id", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);

    const result = await getPlatformIngredient("pi-1");
    expect(result.id).toBe("pi-1");
    expect(result.name).toBe("Salt");
  });

  it("throws when not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(getPlatformIngredient("nonexistent")).rejects.toThrow(
      "PlatformIngredient nonexistent not found"
    );
  });
});

// ─── createPlatformIngredient ─────────────────────────────────────────────────

describe("createPlatformIngredient", () => {
  it("creates an ingredient and returns it", async () => {
    mockPrisma.ingredient.create.mockResolvedValue(mockIngredient);

    const result = await createPlatformIngredient(CREATOR_ID, {
      name: "Salt",
      unit: "GRAM",
      category: "Seasoning",
    });

    expect(result.name).toBe("Salt");
    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Salt",
          createdByUserId: CREATOR_ID,
          unit: "GRAM",
        }),
      })
    );
  });

  it("defaults currency to USD", async () => {
    mockPrisma.ingredient.create.mockResolvedValue({
      ...mockIngredient,
      name: "Sugar",
    });

    const result = await createPlatformIngredient(CREATOR_ID, {
      name: "Sugar",
      unit: "GRAM",
    });

    expect(result.name).toBe("Sugar");
  });
});

// ─── updatePlatformIngredient ─────────────────────────────────────────────────

describe("updatePlatformIngredient", () => {
  it("updates and returns ingredient", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.ingredient.update.mockResolvedValue({
      ...mockIngredient,
      name: "Kosher Salt",
    });

    const result = await updatePlatformIngredient("pi-1", { name: "Kosher Salt" });
    expect(result.name).toBe("Kosher Salt");
  });

  it("throws when not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(
      updatePlatformIngredient("nonexistent", { name: "X" })
    ).rejects.toThrow("PlatformIngredient nonexistent not found");
  });
});

// ─── deletePlatformIngredient ─────────────────────────────────────────────────

describe("deletePlatformIngredient", () => {
  it("soft-deletes the ingredient", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.ingredient.update.mockResolvedValue({
      ...mockIngredient,
      deletedAt: new Date(),
    });

    await deletePlatformIngredient("pi-1");

    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "pi-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws when not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(deletePlatformIngredient("nonexistent")).rejects.toThrow(
      "PlatformIngredient nonexistent not found"
    );
  });
});
