import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    recipeCategory: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import {
  listRecipeCategories,
  createRecipeCategory,
  updateRecipeCategory,
  deleteRecipeCategory,
} from "@/services/admin/admin-recipe-categories.service";

const mockPrisma = prisma as unknown as {
  recipeCategory: {
    findMany: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
};

const ACTOR = "admin-user-1";
const CAT_ID = "cat-1";

const mockCategory = {
  id: CAT_ID,
  name: "Bakery",
  displayOrder: 0,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  _count: { recipes: 3 },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listRecipeCategories ──────────────────────────────────────────────────────

describe("listRecipeCategories", () => {
  it("returns all categories ordered by displayOrder and name", async () => {
    mockPrisma.recipeCategory.findMany.mockResolvedValueOnce([mockCategory]);

    const result = await listRecipeCategories();

    expect(mockPrisma.recipeCategory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ displayOrder: "asc" }, { name: "asc" }],
      })
    );
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      id: CAT_ID,
      name: "Bakery",
      displayOrder: 0,
      recipeCount: 3,
    });
  });

  it("returns empty array when no categories exist", async () => {
    mockPrisma.recipeCategory.findMany.mockResolvedValueOnce([]);
    const result = await listRecipeCategories();
    expect(result).toEqual([]);
  });
});

// ─── createRecipeCategory ──────────────────────────────────────────────────────

describe("createRecipeCategory", () => {
  it("creates a category with default displayOrder", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(null);
    mockPrisma.recipeCategory.create.mockResolvedValueOnce(mockCategory);

    const result = await createRecipeCategory(ACTOR, "Bakery");

    expect(mockPrisma.recipeCategory.findUnique).toHaveBeenCalledWith({
      where: { name: "Bakery" },
    });
    expect(mockPrisma.recipeCategory.create).toHaveBeenCalledWith({
      data: { name: "Bakery", displayOrder: 0 },
    });
    expect(result).toMatchObject({ id: CAT_ID, name: "Bakery", displayOrder: 0, recipeCount: 0 });
  });

  it("creates a category with custom displayOrder", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(null);
    mockPrisma.recipeCategory.create.mockResolvedValueOnce({ ...mockCategory, displayOrder: 5 });

    const result = await createRecipeCategory(ACTOR, "Bakery", 5);

    expect(mockPrisma.recipeCategory.create).toHaveBeenCalledWith({
      data: { name: "Bakery", displayOrder: 5 },
    });
    expect(result.displayOrder).toBe(5);
  });

  it("trims whitespace from the name", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(null);
    mockPrisma.recipeCategory.create.mockResolvedValueOnce(mockCategory);

    await createRecipeCategory(ACTOR, "  Bakery  ");

    expect(mockPrisma.recipeCategory.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Bakery" }) })
    );
  });

  it("throws if a category with the same name already exists", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(mockCategory);

    await expect(createRecipeCategory(ACTOR, "Bakery")).rejects.toThrow(
      "A category with this name already exists"
    );
    expect(mockPrisma.recipeCategory.create).not.toHaveBeenCalled();
  });
});

// ─── updateRecipeCategory ──────────────────────────────────────────────────────

describe("updateRecipeCategory", () => {
  it("updates the category name", async () => {
    const updated = { ...mockCategory, name: "Pastry", _count: { recipes: 3 } };
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(mockCategory);
    mockPrisma.recipeCategory.findFirst.mockResolvedValueOnce(null); // no conflict
    mockPrisma.recipeCategory.update.mockResolvedValueOnce(updated);

    const result = await updateRecipeCategory(CAT_ID, ACTOR, { name: "Pastry" });

    expect(mockPrisma.recipeCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: CAT_ID },
        data: { name: "Pastry" },
      })
    );
    expect(result.name).toBe("Pastry");
    expect(result.recipeCount).toBe(3);
  });

  it("updates displayOrder without changing name", async () => {
    const updated = { ...mockCategory, displayOrder: 10, _count: { recipes: 3 } };
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(mockCategory);
    mockPrisma.recipeCategory.update.mockResolvedValueOnce(updated);

    const result = await updateRecipeCategory(CAT_ID, ACTOR, { displayOrder: 10 });

    expect(mockPrisma.recipeCategory.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { displayOrder: 10 },
      })
    );
    expect(result.displayOrder).toBe(10);
  });

  it("throws if category not found", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(null);

    await expect(updateRecipeCategory("nonexistent", ACTOR, { name: "X" })).rejects.toThrow(
      "Recipe category not found"
    );
  });

  it("throws if another category has the same name", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(mockCategory);
    mockPrisma.recipeCategory.findFirst.mockResolvedValueOnce({ id: "cat-2", name: "Pastry" });

    await expect(updateRecipeCategory(CAT_ID, ACTOR, { name: "Pastry" })).rejects.toThrow(
      "A category with this name already exists"
    );
    expect(mockPrisma.recipeCategory.update).not.toHaveBeenCalled();
  });
});

// ─── deleteRecipeCategory ──────────────────────────────────────────────────────

describe("deleteRecipeCategory", () => {
  it("deletes the category successfully", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(mockCategory);
    mockPrisma.recipeCategory.delete.mockResolvedValueOnce(mockCategory);

    await deleteRecipeCategory(CAT_ID, ACTOR);

    expect(mockPrisma.recipeCategory.delete).toHaveBeenCalledWith({ where: { id: CAT_ID } });
  });

  it("throws if category not found", async () => {
    mockPrisma.recipeCategory.findUnique.mockResolvedValueOnce(null);

    await expect(deleteRecipeCategory("nonexistent", ACTOR)).rejects.toThrow(
      "Recipe category not found"
    );
    expect(mockPrisma.recipeCategory.delete).not.toHaveBeenCalled();
  });
});
