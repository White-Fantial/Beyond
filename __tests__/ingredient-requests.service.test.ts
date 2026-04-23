import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    ingredientRequest: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    ingredient: {
      create: vi.fn(),
      update: vi.fn(),
    },
    recipeIngredient: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
    marketplaceRecipeIngredient: {
      updateMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  createIngredientRequest,
  listIngredientRequests,
  getUserIngredientRequests,
  getTenantIngredientRequests,
  getIngredientRequest,
  reviewIngredientRequest,
  markRequestsSeen,
  countUnseenRequests,
  getRecipesByIngredient,
} from "@/services/marketplace/ingredient-requests.service";

const mockPrisma = prisma as unknown as {
  ingredientRequest: {
    create: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  ingredient: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  recipeIngredient: {
    findMany: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  marketplaceRecipeIngredient: {
    updateMany: ReturnType<typeof vi.fn>;
  };
};

const USER_ID = "user-1";
const TENANT_ID = "tenant-1";
const MODERATOR_ID = "mod-1";
const REQUEST_ID = "req-1";
const PI_ID = "pi-1";
const NEW_PI_ID = "pi-new";
const TEMP_ID = "temp-ing-1";

const mockRow = {
  id: REQUEST_ID,
  requestedByUserId: USER_ID,
  tenantId: null,
  name: "Truffle Oil",
  description: "Premium truffle-infused olive oil",
  category: "Oils",
  unit: "ML",
  notes: "Used as finishing oil for pasta",
  status: "PENDING",
  resolvedIngredientId: null,
  tempIngredientId: null,
  reviewedByUserId: null,
  reviewNotes: null,
  ownerSeenAt: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
  requestedBy: { name: "Jane Chef" },
  resolvedIngredient: null,
};

const mockRowWithTenant = {
  ...mockRow,
  tenantId: TENANT_ID,
  tempIngredientId: TEMP_ID,
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── createIngredientRequest ─────────────────────────────────────────────────

describe("createIngredientRequest", () => {
  it("creates a PENDING request with trimmed fields (no tenantId)", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue(mockRow);

    const result = await createIngredientRequest(USER_ID, {
      name: "  Truffle Oil  ",
      category: "Oils",
      unit: "ML",
      notes: "Used as finishing oil for pasta",
    });

    expect(result.name).toBe("Truffle Oil");
    expect(result.status).toBe("PENDING");
    expect(result.requestedByName).toBe("Jane Chef");
    expect(result.tempIngredientId).toBeNull();
    expect(mockPrisma.ingredientRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          requestedByUserId: USER_ID,
          name: "Truffle Oil",
          status: "PENDING",
        }),
      })
    );
    // No temp ingredient created when tenantId not provided
    expect(mockPrisma.ingredient.create).not.toHaveBeenCalled();
  });

  it("creates a temp STORE-scope ingredient when tenantId is provided", async () => {
    // First create returns the base request, second update returns with tempIngredientId
    mockPrisma.ingredientRequest.create.mockResolvedValue(mockRow);
    mockPrisma.ingredient.create.mockResolvedValue({ id: TEMP_ID });
    mockPrisma.ingredientRequest.update.mockResolvedValue(mockRowWithTenant);

    const result = await createIngredientRequest(USER_ID, {
      name: "Truffle Oil",
      category: "Oils",
      unit: "ML",
      tenantId: TENANT_ID,
    });

    expect(result.tempIngredientId).toBe(TEMP_ID);
    expect(result.tenantId).toBe(TENANT_ID);
    expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scope: "STORE",
          tenantId: TENANT_ID,
          name: "Truffle Oil",
          unit: "ML",
          isActive: true,
        }),
      })
    );
    expect(mockPrisma.ingredientRequest.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tempIngredientId: TEMP_ID },
      })
    );
  });

  it("defaults unit to GRAM when not provided", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue({
      ...mockRow,
      unit: "GRAM",
    });

    await createIngredientRequest(USER_ID, { name: "Salt" });

    expect(mockPrisma.ingredientRequest.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ unit: "GRAM" }),
      })
    );
  });

  it("serialises dates to ISO strings", async () => {
    mockPrisma.ingredientRequest.create.mockResolvedValue(mockRow);

    const result = await createIngredientRequest(USER_ID, { name: "Miso" });

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
    expect(result.items[0].name).toBe("Truffle Oil");
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

// ─── getTenantIngredientRequests ─────────────────────────────────────────────

describe("getTenantIngredientRequests", () => {
  it("returns only requests for the given tenant", async () => {
    mockPrisma.ingredientRequest.findMany.mockResolvedValue([mockRowWithTenant]);
    mockPrisma.ingredientRequest.count.mockResolvedValue(1);

    const result = await getTenantIngredientRequests(TENANT_ID);

    expect(result.items).toHaveLength(1);
    expect(mockPrisma.ingredientRequest.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: TENANT_ID },
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
    expect(result.name).toBe("Truffle Oil");
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
  describe("APPROVED", () => {
    it("auto-creates PLATFORM ingredient from request data (no temp ingredient)", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);
      mockPrisma.ingredient.create.mockResolvedValue({ id: NEW_PI_ID });
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRow,
        status: "APPROVED",
        resolvedIngredientId: NEW_PI_ID,
        reviewedByUserId: MODERATOR_ID,
      });

      const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "APPROVED",
      });

      expect(result.status).toBe("APPROVED");
      expect(mockPrisma.ingredient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scope: "PLATFORM",
            name: "Truffle Oil",
            unit: "ML",
            tenantId: null,
            storeId: null,
            createdByUserId: MODERATOR_ID,
          }),
        })
      );
      // No migration needed (no temp ingredient)
      expect(mockPrisma.recipeIngredient.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.marketplaceRecipeIngredient.updateMany).not.toHaveBeenCalled();
      expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
    });

    it("migrates RecipeIngredient refs from temp ingredient on APPROVED", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRowWithTenant);
      mockPrisma.ingredient.create.mockResolvedValue({ id: NEW_PI_ID });
      mockPrisma.recipeIngredient.updateMany.mockResolvedValue({ count: 3 });
      mockPrisma.marketplaceRecipeIngredient.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.ingredient.update.mockResolvedValue({});
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRowWithTenant,
        status: "APPROVED",
        resolvedIngredientId: NEW_PI_ID,
        reviewedByUserId: MODERATOR_ID,
        tempIngredientId: TEMP_ID,
      });

      await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "APPROVED",
        reviewNotes: "Approved and migrated",
      });

      expect(mockPrisma.recipeIngredient.updateMany).toHaveBeenCalledWith({
        where: { ingredientId: TEMP_ID },
        data: { ingredientId: NEW_PI_ID },
      });
      expect(mockPrisma.marketplaceRecipeIngredient.updateMany).toHaveBeenCalledWith({
        where: { ingredientId: TEMP_ID },
        data: { ingredientId: NEW_PI_ID },
      });
      // Soft-delete the temp ingredient
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEMP_ID },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
  });

  describe("DUPLICATE", () => {
    it("migrates temp ingredient refs to existing PLATFORM ingredient on DUPLICATE", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRowWithTenant);
      mockPrisma.recipeIngredient.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.marketplaceRecipeIngredient.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.ingredient.update.mockResolvedValue({});
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRowWithTenant,
        status: "DUPLICATE",
        resolvedIngredientId: PI_ID,
        reviewedByUserId: MODERATOR_ID,
      });

      const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "DUPLICATE",
        resolvedIngredientId: PI_ID,
      });

      expect(result.status).toBe("DUPLICATE");
      expect(mockPrisma.recipeIngredient.updateMany).toHaveBeenCalledWith({
        where: { ingredientId: TEMP_ID },
        data: { ingredientId: PI_ID },
      });
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEMP_ID },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });

    it("throws when DUPLICATE without resolvedIngredientId", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);

      await expect(
        reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, { status: "DUPLICATE" })
      ).rejects.toThrow("resolvedIngredientId is required");
    });
  });

  describe("REJECTED", () => {
    it("deactivates temp ingredient on REJECTED", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRowWithTenant);
      mockPrisma.ingredient.update.mockResolvedValue({});
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRowWithTenant,
        status: "REJECTED",
        reviewedByUserId: MODERATOR_ID,
        reviewNotes: "Not a valid ingredient",
      });

      const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "REJECTED",
        reviewNotes: "Not a valid ingredient",
      });

      expect(result.status).toBe("REJECTED");
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith({
        where: { id: TEMP_ID },
        data: { isActive: false },
      });
    });

    it("does not call ingredient.update on REJECTED when no temp ingredient", async () => {
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRow);
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRow,
        status: "REJECTED",
        reviewedByUserId: MODERATOR_ID,
        reviewNotes: "Not needed",
      });

      await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "REJECTED",
        reviewNotes: "Not needed",
      });

      expect(mockPrisma.ingredient.update).not.toHaveBeenCalled();
    });

    it("migrates refs to suggestedIngredientId and soft-deletes temp on REJECTED with suggestion", async () => {
      const SUGGESTED_ID = "suggested-ing-1";
      mockPrisma.ingredientRequest.findUnique.mockResolvedValue(mockRowWithTenant);
      mockPrisma.recipeIngredient.updateMany.mockResolvedValue({ count: 2 });
      mockPrisma.marketplaceRecipeIngredient.updateMany.mockResolvedValue({ count: 0 });
      mockPrisma.ingredient.update.mockResolvedValue({});
      mockPrisma.ingredientRequest.update.mockResolvedValue({
        ...mockRowWithTenant,
        status: "REJECTED",
        resolvedIngredientId: SUGGESTED_ID,
        reviewedByUserId: MODERATOR_ID,
        reviewNotes: "Use existing ingredient",
        resolvedIngredient: { name: "Existing Ingredient" },
      });

      const result = await reviewIngredientRequest(REQUEST_ID, MODERATOR_ID, {
        status: "REJECTED",
        reviewNotes: "Use existing ingredient",
        suggestedIngredientId: SUGGESTED_ID,
      });

      expect(result.status).toBe("REJECTED");
      expect(result.resolvedIngredientId).toBe(SUGGESTED_ID);
      expect(mockPrisma.recipeIngredient.updateMany).toHaveBeenCalledWith({
        where: { ingredientId: TEMP_ID },
        data: { ingredientId: SUGGESTED_ID },
      });
      expect(mockPrisma.ingredient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEMP_ID },
          data: expect.objectContaining({ isActive: false }),
        })
      );
    });
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
});

// ─── markRequestsSeen ────────────────────────────────────────────────────────

describe("markRequestsSeen", () => {
  it("bulk-updates non-PENDING requests with null ownerSeenAt", async () => {
    mockPrisma.ingredientRequest.updateMany.mockResolvedValue({ count: 3 });

    await markRequestsSeen(TENANT_ID);

    expect(mockPrisma.ingredientRequest.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        status: { not: "PENDING" },
        ownerSeenAt: null,
      },
      data: expect.objectContaining({ ownerSeenAt: expect.any(Date) }),
    });
  });
});

// ─── countUnseenRequests ─────────────────────────────────────────────────────

describe("countUnseenRequests", () => {
  it("returns count of unseen reviewed requests", async () => {
    mockPrisma.ingredientRequest.count.mockResolvedValue(2);

    const count = await countUnseenRequests(TENANT_ID);

    expect(count).toBe(2);
    expect(mockPrisma.ingredientRequest.count).toHaveBeenCalledWith({
      where: {
        tenantId: TENANT_ID,
        status: { not: "PENDING" },
        ownerSeenAt: null,
      },
    });
  });
});

// ─── getRecipesByIngredient ───────────────────────────────────────────────────

describe("getRecipesByIngredient", () => {
  it("returns deduplicated recipe list for an ingredient", async () => {
    mockPrisma.recipeIngredient.findMany.mockResolvedValue([
      { recipe: { id: "r-1", name: "Pasta" } },
      { recipe: { id: "r-2", name: "Pizza" } },
      { recipe: { id: "r-1", name: "Pasta" } }, // duplicate
    ]);

    const result = await getRecipesByIngredient(TENANT_ID, TEMP_ID);

    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("r-1");
    expect(result[1].id).toBe("r-2");
  });

  it("returns empty array when no recipes use the ingredient", async () => {
    mockPrisma.recipeIngredient.findMany.mockResolvedValue([]);

    const result = await getRecipesByIngredient(TENANT_ID, TEMP_ID);

    expect(result).toHaveLength(0);
  });
});
