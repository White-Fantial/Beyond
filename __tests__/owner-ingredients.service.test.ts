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
  listIngredients,
  getIngredient,
  createIngredient,
  updateIngredient,
  deleteIngredient,
} from "@/services/owner/owner-ingredients.service";

const mockPrisma = prisma as unknown as {
  ingredient: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";
const STORE = "store-1";

const mockIngredient = {
  id: "ing-1",
  scope: "STORE",
  tenantId: TENANT,
  storeId: STORE,
  name: "Bread Flour",
  description: null,
  category: null,
  purchaseUnit: "KG",
  unit: "GRAM",
  unitCost: 5,
  currency: "KRW",
  isActive: true,
  createdByUserId: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listIngredients ──────────────────────────────────────────────────────────

describe("listIngredients", () => {
  it("returns paginated ingredients", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await listIngredients(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].name).toBe("Bread Flour");
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await listIngredients(TENANT);
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("filters by storeId", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    await listIngredients(TENANT, { storeId: STORE });

    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: STORE }),
      })
    );
  });

  it("defaults to page 1, pageSize 50", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    const result = await listIngredients(TENANT);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(50);
  });

  it("excludes soft-deleted ingredients", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([]);
    mockPrisma.ingredient.count.mockResolvedValue(0);

    await listIngredients(TENANT);

    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ deletedAt: null }),
      })
    );
  });
});

// ─── getIngredient ────────────────────────────────────────────────────────────

describe("getIngredient", () => {
  it("returns a single ingredient", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);

    const result = await getIngredient(TENANT, "ing-1");

    expect(result.id).toBe("ing-1");
    expect(result.purchaseUnit).toBe("KG");
    expect(result.unit).toBe("GRAM");
  });

  it("throws if not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(getIngredient(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── createIngredient ─────────────────────────────────────────────────────────

describe("createIngredient", () => {
  it("creates an ingredient with correct data", async () => {
    mockPrisma.ingredient.create.mockResolvedValue(mockIngredient);

    const result = await createIngredient(TENANT, {
      storeId: STORE,
      name: "Bread Flour",
      purchaseUnit: "KG",
      unit: "GRAM",
      unitCost: 5,
    });

    expect(result.name).toBe("Bread Flour");
    expect(result.unitCost).toBe(5);
    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: TENANT,
          storeId: STORE,
          purchaseUnit: "KG",
          unit: "GRAM",
          unitCost: 5,
        }),
      })
    );
  });

  it("defaults currency to KRW", async () => {
    mockPrisma.ingredient.create.mockResolvedValue(mockIngredient);

    await createIngredient(TENANT, {
      storeId: STORE,
      name: "Salt",
      purchaseUnit: "KG",
      unit: "GRAM",
      unitCost: 1,
    });

    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ currency: "KRW" }),
      })
    );
  });
});

// ─── updateIngredient ─────────────────────────────────────────────────────────

describe("updateIngredient", () => {
  it("updates ingredient fields", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.ingredient.update.mockResolvedValue({
      ...mockIngredient,
      unitCost: 10,
    });

    const result = await updateIngredient(TENANT, "ing-1", { unitCost: 10 });

    expect(result.unitCost).toBe(10);
    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ing-1" },
        data: expect.objectContaining({ unitCost: 10 }),
      })
    );
  });

  it("throws if ingredient not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(
      updateIngredient(TENANT, "missing", { unitCost: 10 })
    ).rejects.toThrow("not found");
  });
});

// ─── deleteIngredient ─────────────────────────────────────────────────────────

describe("deleteIngredient", () => {
  it("soft-deletes the ingredient", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.ingredient.update.mockResolvedValue({
      ...mockIngredient,
      deletedAt: new Date(),
    });

    await deleteIngredient(TENANT, "ing-1");

    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "ing-1" },
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });

  it("throws if ingredient not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(deleteIngredient(TENANT, "missing")).rejects.toThrow("not found");
  });
});
