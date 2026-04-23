import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenantIngredientSelection: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    ingredient: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listIngredients,
  getIngredient,
  selectPlatformIngredient,
  unselectPlatformIngredient,
  searchPlatformIngredients,
} from "@/services/owner/owner-ingredients.service";

const mockPrisma = prisma as unknown as {
  tenantIngredientSelection: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    upsert: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  ingredient: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";

const mockIngredient = {
  id: "ing-1",
  name: "Bread Flour",
  description: null,
  category: null,
  unit: "GRAM",
  isActive: true,
  createdByUserId: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockPlatformIngredient = {
  ...mockIngredient,
  id: "plat-1",
  name: "Salt",
  category: "Seasoning",
};

const mockSelection = {
  id: "sel-1",
  tenantId: TENANT,
  ingredientId: mockIngredient.id,
  isActive: true,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  ingredient: mockIngredient,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listIngredients ──────────────────────────────────────────────────────────

describe("listIngredients", () => {
  it("returns paginated ingredients", async () => {
    mockPrisma.tenantIngredientSelection.findMany.mockResolvedValue([mockSelection]);
    mockPrisma.tenantIngredientSelection.count.mockResolvedValue(1);

    const result = await listIngredients(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Bread Flour");
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.tenantIngredientSelection.findMany.mockResolvedValue([mockSelection]);
    mockPrisma.tenantIngredientSelection.count.mockResolvedValue(1);

    const result = await listIngredients(TENANT);
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("filters by category", async () => {
    mockPrisma.tenantIngredientSelection.findMany.mockResolvedValue([]);
    mockPrisma.tenantIngredientSelection.count.mockResolvedValue(0);

    await listIngredients(TENANT, { category: "Grains" });

    expect(mockPrisma.tenantIngredientSelection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: TENANT,
          ingredient: expect.objectContaining({ category: "Grains" }),
        }),
      })
    );
  });

  it("defaults to page 1, pageSize 50", async () => {
    mockPrisma.tenantIngredientSelection.findMany.mockResolvedValue([]);
    mockPrisma.tenantIngredientSelection.count.mockResolvedValue(0);

    const result = await listIngredients(TENANT);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("only returns active tenant selections", async () => {
    mockPrisma.tenantIngredientSelection.findMany.mockResolvedValue([]);
    mockPrisma.tenantIngredientSelection.count.mockResolvedValue(0);

    await listIngredients(TENANT);

    expect(mockPrisma.tenantIngredientSelection.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: TENANT, isActive: true }),
      })
    );
  });
});

// ─── getIngredient ────────────────────────────────────────────────────────────

describe("getIngredient", () => {
  it("returns a single ingredient", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue(mockSelection);

    const result = await getIngredient(TENANT, "ing-1");

    expect(result.id).toBe("ing-1");
    expect(result.unit).toBe("GRAM");
  });

  it("throws if not found", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue(null);

    await expect(getIngredient(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── selectPlatformIngredient ─────────────────────────────────────────────────

describe("selectPlatformIngredient", () => {
  it("adds a platform ingredient to the tenant selection list", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockPlatformIngredient);
    mockPrisma.tenantIngredientSelection.upsert.mockResolvedValue({});

    const result = await selectPlatformIngredient(TENANT, "plat-1");

    expect(result.name).toBe("Salt");
    expect(mockPrisma.tenantIngredientSelection.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          tenantId: TENANT,
          ingredientId: "plat-1",
          isActive: true,
        }),
        update: { isActive: true },
      })
    );
  });

  it("throws if platform ingredient not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(selectPlatformIngredient(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── unselectPlatformIngredient ───────────────────────────────────────────────

describe("unselectPlatformIngredient", () => {
  it("marks the tenant selection inactive", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue({ id: "sel-1" });
    mockPrisma.tenantIngredientSelection.update.mockResolvedValue({});

    await unselectPlatformIngredient(TENANT, "ing-1");

    expect(mockPrisma.tenantIngredientSelection.update).toHaveBeenCalledWith({
      where: { id: "sel-1" },
      data: { isActive: false },
    });
  });

  it("throws if ingredient not found", async () => {
    mockPrisma.tenantIngredientSelection.findFirst.mockResolvedValue(null);

    await expect(unselectPlatformIngredient(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── searchPlatformIngredients ────────────────────────────────────────────────

describe("searchPlatformIngredients", () => {
  it("searches platform ingredients by name keyword", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockPlatformIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await searchPlatformIngredients({ q: "Salt" });

    expect(result.items).toHaveLength(1);
    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          name: expect.objectContaining({ contains: "Salt" }),
        }),
      })
    );
  });

  it("filters by category when provided", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    await searchPlatformIngredients({ category: "Dairy" });

    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ category: "Dairy" }),
      })
    );
  });

  it("only returns active, non-deleted ingredients", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    await searchPlatformIngredients();

    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true, deletedAt: null }),
      })
    );
  });

  it("returns paginated results", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    const result = await searchPlatformIngredients({ page: 2, pageSize: 10 });

    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 10, take: 10 })
    );
  });
});
