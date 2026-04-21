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
  importPlatformIngredient,
  searchPlatformIngredients,
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
  purchaseQty: 1,
  unit: "GRAM",
  unitCost: 5,
  currency: "USD",
  isActive: true,
  createdByUserId: null,
  notes: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockPlatformIngredient = {
  ...mockIngredient,
  id: "plat-1",
  scope: "PLATFORM",
  tenantId: null,
  storeId: null,
  name: "Salt",
  category: "Seasoning",
  unitCost: 100,
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
      purchaseQty: 20,
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
          purchaseQty: 20,
          unit: "GRAM",
          unitCost: 5,
        }),
      })
    );
  });

  it("defaults purchaseQty to 1 when not provided", async () => {
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
        data: expect.objectContaining({ purchaseQty: 1 }),
      })
    );
  });

  it("defaults currency to USD", async () => {
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
        data: expect.objectContaining({ currency: "USD" }),
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

  it("persists purchaseQty when provided", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockIngredient);
    mockPrisma.ingredient.update.mockResolvedValue({
      ...mockIngredient,
      purchaseQty: 20,
      unitCost: 175,
    });

    const result = await updateIngredient(TENANT, "ing-1", { purchaseQty: 20, unitCost: 175 });

    expect(result.purchaseQty).toBe(20);
    expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ purchaseQty: 20 }),
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

// ─── importPlatformIngredient ─────────────────────────────────────────────────

describe("importPlatformIngredient", () => {
  it("creates a STORE-scope copy of a platform ingredient with owner's price", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockPlatformIngredient);
    const expectedRow = {
      ...mockIngredient,
      id: "new-ing",
      name: "Salt",
      category: "Seasoning",
      unitCost: 50000,
    };
    mockPrisma.ingredient.create.mockResolvedValue(expectedRow);

    const result = await importPlatformIngredient(TENANT, STORE, "plat-1", 50000);

    expect(result.name).toBe("Salt");
    expect(result.unitCost).toBe(50000);
    expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "plat-1", scope: "PLATFORM" }),
      })
    );
    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: "STORE",
          tenantId: TENANT,
          storeId: STORE,
          name: "Salt",
          unitCost: 50000,
        }),
      })
    );
  });

  it("uses the owner's unitCost, not the platform's default cost", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(mockPlatformIngredient);
    const ownUnitCost = 999999;
    mockPrisma.ingredient.create.mockResolvedValue({
      ...mockIngredient,
      unitCost: ownUnitCost,
    });

    await importPlatformIngredient(TENANT, STORE, "plat-1", ownUnitCost);

    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unitCost: ownUnitCost }),
      })
    );
  });

  it("throws if platform ingredient not found", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValue(null);

    await expect(
      importPlatformIngredient(TENANT, STORE, "missing", 100)
    ).rejects.toThrow("not found");
  });
});

// ─── searchPlatformIngredients ────────────────────────────────────────────────

describe("searchPlatformIngredients", () => {
  it("searches PLATFORM ingredients by name keyword", async () => {
    mockPrisma.ingredient.findMany.mockResolvedValue([mockPlatformIngredient]);
    mockPrisma.ingredient.count.mockResolvedValue(1);

    const result = await searchPlatformIngredients({ q: "Salt" });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].scope).toBe("PLATFORM");
    expect(mockPrisma.ingredient.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scope: "PLATFORM",
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
