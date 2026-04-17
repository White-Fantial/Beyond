import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogCategory: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    catalogProduct: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    catalogModifierGroup: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    catalogModifierOption: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    store: {
      findUniqueOrThrow: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({ logAuditEvent: vi.fn() }));

import { prisma } from "@/lib/prisma";
import {
  createBackofficeCategory,
  updateBackofficeCategory,
  deleteBackofficeCategory,
  createBackofficeProduct,
  updateBackofficeProduct,
  deleteBackofficeProduct,
  createBackofficeModifierGroup,
  updateBackofficeModifierGroup,
  deleteBackofficeModifierGroup,
  createBackofficeModifierOption,
  updateBackofficeModifierOption,
  deleteBackofficeModifierOption,
  bulkRestoreAvailability,
  reorderCategories,
} from "@/services/backoffice/backoffice-catalog.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

type MockPrisma = {
  catalogCategory: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  catalogProduct: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  catalogModifierGroup: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  catalogModifierOption: {
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    findUniqueOrThrow: ReturnType<typeof vi.fn>;
  };
  store: { findUniqueOrThrow: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const mockPrisma = prisma as unknown as MockPrisma;

// ─── Test constants ───────────────────────────────────────────────────────────

const STORE_ID = "store-001";
const TENANT_ID = "tenant-001";
const ACTOR_ID = "user-001";

const LOCAL_CATEGORY = {
  id: "cat-001",
  storeId: STORE_ID,
  tenantId: TENANT_ID,
  sourceType: "LOCAL",
  name: "Burgers",
  description: null,
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
  isVisibleOnSubscription: false,
  imageUrl: null,
  isActive: true,
  deletedAt: null,
};

const POS_CATEGORY = { ...LOCAL_CATEGORY, id: "cat-pos", sourceType: "POS" };

const LOCAL_PRODUCT = {
  id: "prod-001",
  storeId: STORE_ID,
  tenantId: TENANT_ID,
  sourceType: "LOCAL",
  name: "Burger",
  description: null,
  basePriceAmount: 1200,
  currency: "NZD",
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
  isVisibleOnSubscription: false,
  isFeatured: false,
  isSoldOut: false,
  isActive: true,
  deletedAt: null,
};

const POS_PRODUCT = { ...LOCAL_PRODUCT, id: "prod-pos", sourceType: "POS" };

const LOCAL_GROUP = {
  id: "grp-001",
  storeId: STORE_ID,
  tenantId: TENANT_ID,
  sourceType: "LOCAL",
  name: "Extras",
  description: null,
  selectionMin: 0,
  selectionMax: null,
  isRequired: false,
  displayOrder: 0,
  isVisibleOnOnlineOrder: true,
  isActive: true,
  deletedAt: null,
};

const LOCAL_OPTION = {
  id: "opt-001",
  storeId: STORE_ID,
  tenantId: TENANT_ID,
  modifierGroupId: LOCAL_GROUP.id,
  sourceType: "LOCAL",
  name: "Extra Cheese",
  description: null,
  priceDeltaAmount: 150,
  currency: "NZD",
  displayOrder: 0,
  isDefault: false,
  isActive: true,
  isSoldOut: false,
  deletedAt: null,
};

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Category tests ───────────────────────────────────────────────────────────

describe("createBackofficeCategory", () => {
  it("creates a category with sourceType LOCAL and originType BEYOND_CREATED", async () => {
    mockPrisma.catalogCategory.create.mockResolvedValue(LOCAL_CATEGORY);

    const result = await createBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Burgers",
    });

    expect(mockPrisma.catalogCategory.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogCategory.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.originType).toBe("BEYOND_CREATED");
    expect(callArg.data.storeId).toBe(STORE_ID);
    expect(callArg.data.tenantId).toBe(TENANT_ID);
    expect(result.name).toBe("Burgers");
  });
});

describe("updateBackofficeCategory", () => {
  it("updates name for any category (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({
      ...LOCAL_CATEGORY,
      name: "Chicken Burgers",
    });

    const result = await updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-001", {
      name: "Chicken Burgers",
    });

    expect(result.name).toBe("Chicken Burgers");
    expect(mockPrisma.catalogCategory.update).toHaveBeenCalledOnce();
  });

  it("allows updating name for POS-originated category (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({
      ...POS_CATEGORY,
      name: "Updated POS Name",
    });

    const result = await updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, POS_CATEGORY.id, {
      name: "Updated POS Name",
    });

    expect(result.name).toBe("Updated POS Name");
  });

  it("allows visibility update for POS-originated category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({
      ...POS_CATEGORY,
      isVisibleOnOnlineOrder: false,
    });

    const result = await updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, POS_CATEGORY.id, {
      isVisibleOnOnlineOrder: false,
    });

    expect(result.isVisibleOnOnlineOrder).toBe(false);
  });

  it("throws when category does not belong to store", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: "other-store",
    });

    await expect(
      updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-001", { name: "X" })
    ).rejects.toThrow("does not belong");
  });
});

describe("deleteBackofficeCategory", () => {
  it("soft-deletes a category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    await deleteBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-001");

    const updateCall = mockPrisma.catalogCategory.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("soft-deletes a POS-originated category (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    await deleteBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, POS_CATEGORY.id);

    const updateCall = mockPrisma.catalogCategory.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── Product tests ────────────────────────────────────────────────────────────

describe("createBackofficeProduct", () => {
  it("creates a product with sourceType LOCAL, originType BEYOND_CREATED, and correct price", async () => {
    mockPrisma.catalogProduct.create.mockResolvedValue(LOCAL_PRODUCT);

    const result = await createBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Burger",
      basePriceAmount: 1200,
    });

    expect(mockPrisma.catalogProduct.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogProduct.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.originType).toBe("BEYOND_CREATED");
    expect(callArg.data.basePriceAmount).toBe(1200);
    expect(result.basePriceAmount).toBe(1200);
  });
});

describe("updateBackofficeProduct", () => {
  it("updates price for any product (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({
      ...LOCAL_PRODUCT,
      basePriceAmount: 1500,
    });

    const result = await updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-001", {
      basePriceAmount: 1500,
    });

    expect(result.basePriceAmount).toBe(1500);
  });

  it("allows updating price for POS-originated product (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({
      ...POS_PRODUCT,
      basePriceAmount: 999,
    });

    const result = await updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, POS_PRODUCT.id, {
      basePriceAmount: 999,
    });

    expect(result.basePriceAmount).toBe(999);
  });

  it("allows isSoldOut update for any product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({
      ...POS_PRODUCT,
      isSoldOut: true,
    });

    const result = await updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, POS_PRODUCT.id, {
      isSoldOut: true,
    });

    expect(result.isSoldOut).toBe(true);
  });
});

describe("deleteBackofficeProduct", () => {
  it("soft-deletes a product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({});

    await deleteBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-001");

    const updateCall = mockPrisma.catalogProduct.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("soft-deletes a POS-originated product (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({});

    await deleteBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, POS_PRODUCT.id);

    const updateCall = mockPrisma.catalogProduct.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── Modifier Group tests ─────────────────────────────────────────────────────

describe("createBackofficeModifierGroup", () => {
  it("creates a modifier group with sourceType LOCAL and originType BEYOND_CREATED", async () => {
    mockPrisma.catalogModifierGroup.create.mockResolvedValue(LOCAL_GROUP);

    const result = await createBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Extras",
    });

    expect(mockPrisma.catalogModifierGroup.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogModifierGroup.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.originType).toBe("BEYOND_CREATED");
    expect(result.name).toBe("Extras");
  });
});

describe("updateBackofficeModifierGroup", () => {
  it("updates a modifier group name (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierGroup.update.mockResolvedValue({
      ...LOCAL_GROUP,
      name: "Toppings",
    });

    const result = await updateBackofficeModifierGroup(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      LOCAL_GROUP.id,
      { name: "Toppings" }
    );

    expect(result.name).toBe("Toppings");
  });
});

describe("deleteBackofficeModifierGroup", () => {
  it("soft-deletes a modifier group", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierGroup.update.mockResolvedValue({});

    await deleteBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, LOCAL_GROUP.id);

    const updateCall = mockPrisma.catalogModifierGroup.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("soft-deletes a POS-originated modifier group (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierGroup.update.mockResolvedValue({});

    await deleteBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, "grp-pos");

    const updateCall = mockPrisma.catalogModifierGroup.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── Modifier Option tests ────────────────────────────────────────────────────

describe("createBackofficeModifierOption", () => {
  it("creates an option with sourceType LOCAL and originType BEYOND_CREATED", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({ id: LOCAL_GROUP.id });
    mockPrisma.catalogModifierOption.create.mockResolvedValue(LOCAL_OPTION);

    const result = await createBackofficeModifierOption(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      LOCAL_GROUP.id,
      { name: "Extra Cheese", priceDeltaAmount: 150 }
    );

    expect(mockPrisma.catalogModifierOption.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogModifierOption.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.originType).toBe("BEYOND_CREATED");
    expect(callArg.data.modifierGroupId).toBe(LOCAL_GROUP.id);
    expect(result.name).toBe("Extra Cheese");
  });
});

describe("updateBackofficeModifierOption", () => {
  it("updates price delta for any option (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({
      ...LOCAL_OPTION,
      priceDeltaAmount: 200,
    });

    const result = await updateBackofficeModifierOption(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      LOCAL_OPTION.id,
      { priceDeltaAmount: 200 }
    );

    expect(result.priceDeltaAmount).toBe(200);
  });

  it("allows updating price delta for POS-originated option (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({
      ...LOCAL_OPTION,
      sourceType: "POS",
      priceDeltaAmount: 300,
    });

    const result = await updateBackofficeModifierOption(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      LOCAL_OPTION.id,
      { priceDeltaAmount: 300 }
    );

    expect(result.priceDeltaAmount).toBe(300);
  });

  it("allows isSoldOut update for any option", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({
      ...LOCAL_OPTION,
      sourceType: "POS",
      isSoldOut: true,
    });

    const result = await updateBackofficeModifierOption(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      LOCAL_OPTION.id,
      { isSoldOut: true }
    );

    expect(result.isSoldOut).toBe(true);
  });
});

describe("deleteBackofficeModifierOption", () => {
  it("soft-deletes an option", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({});

    await deleteBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, LOCAL_OPTION.id);

    const updateCall = mockPrisma.catalogModifierOption.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("soft-deletes a POS-originated option (Phase 1: no source-lock)", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({});

    await deleteBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, "opt-pos");

    const updateCall = mockPrisma.catalogModifierOption.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── bulkRestoreAvailability tests ───────────────────────────────────────────

describe("bulkRestoreAvailability", () => {
  it("returns the count of restored products", async () => {
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 3 });

    const result = await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(result).toBe(3);
  });

  it("calls updateMany with correct where clause (storeId, isSoldOut, deletedAt)", async () => {
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 2 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    const call = mockPrisma.catalogProduct.updateMany.mock.calls[0][0];
    expect(call.where.storeId).toBe(STORE_ID);
    expect(call.where.isSoldOut).toBe(true);
    expect(call.where.deletedAt).toBeNull();
  });

  it("calls updateMany with data { isSoldOut: false }", async () => {
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 1 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    const call = mockPrisma.catalogProduct.updateMany.mock.calls[0][0];
    expect(call.data.isSoldOut).toBe(false);
  });

  it("logs audit event with action BACKOFFICE_BULK_RESTORE_AVAILABILITY", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 5 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "BACKOFFICE_BULK_RESTORE_AVAILABILITY",
        targetType: "CatalogProduct",
        targetId: STORE_ID,
      })
    );
  });

  it("includes restoredCount in audit metadata", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 7 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { restoredCount: 7 } })
    );
  });

  it("returns 0 when no products are sold out", async () => {
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 0 });

    const result = await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(result).toBe(0);
  });

  it("passes correct tenantId and actorUserId to audit log", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 1 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId: TENANT_ID, actorUserId: ACTOR_ID, storeId: STORE_ID })
    );
  });

  it("throws when prisma updateMany rejects", async () => {
    mockPrisma.catalogProduct.updateMany.mockRejectedValue(new Error("DB error"));

    await expect(bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID)).rejects.toThrow("DB error");
  });

  it("does not call logAuditEvent when updateMany throws", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.catalogProduct.updateMany.mockRejectedValue(new Error("DB error"));

    await expect(bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID)).rejects.toThrow();
    expect(logAuditEvent).not.toHaveBeenCalled();
  });

  it("calls updateMany exactly once", async () => {
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 4 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(mockPrisma.catalogProduct.updateMany).toHaveBeenCalledOnce();
  });

  it("calls logAuditEvent exactly once on success", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.catalogProduct.updateMany.mockResolvedValue({ count: 2 });

    await bulkRestoreAvailability(STORE_ID, TENANT_ID, ACTOR_ID);

    expect(logAuditEvent).toHaveBeenCalledOnce();
  });
});

// ─── reorderCategories tests ─────────────────────────────────────────────────

describe("reorderCategories", () => {
  it("calls $transaction with the correct number of updates", async () => {
    mockPrisma.$transaction.mockResolvedValue([]);

    const items = [
      { id: "cat-001", displayOrder: 0 },
      { id: "cat-002", displayOrder: 1 },
    ];
    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, items);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
  });

  it("calls catalogCategory.update for each item", async () => {
    // Simulate $transaction by calling the array of promises
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    const items = [
      { id: "cat-001", displayOrder: 0 },
      { id: "cat-002", displayOrder: 1 },
      { id: "cat-003", displayOrder: 2 },
    ];
    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, items);

    expect(mockPrisma.catalogCategory.update).toHaveBeenCalledTimes(3);
  });

  it("passes correct displayOrder to each update", async () => {
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    const items = [
      { id: "cat-001", displayOrder: 5 },
      { id: "cat-002", displayOrder: 10 },
    ];
    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, items);

    const calls = mockPrisma.catalogCategory.update.mock.calls;
    expect(calls[0][0].data.displayOrder).toBe(5);
    expect(calls[1][0].data.displayOrder).toBe(10);
  });

  it("passes correct id in where clause for each update", async () => {
    mockPrisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    const items = [
      { id: "cat-A", displayOrder: 0 },
      { id: "cat-B", displayOrder: 1 },
    ];
    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, items);

    const calls = mockPrisma.catalogCategory.update.mock.calls;
    expect(calls[0][0].where.id).toBe("cat-A");
    expect(calls[1][0].where.id).toBe("cat-B");
  });

  it("logs audit event with action BACKOFFICE_CATEGORIES_REORDERED", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.$transaction.mockResolvedValue([]);

    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, [{ id: "cat-001", displayOrder: 0 }]);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ action: "BACKOFFICE_CATEGORIES_REORDERED" })
    );
  });

  it("includes count in audit metadata", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.$transaction.mockResolvedValue([]);

    const items = [
      { id: "cat-001", displayOrder: 0 },
      { id: "cat-002", displayOrder: 1 },
    ];
    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, items);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { count: 2 } })
    );
  });

  it("handles empty items array (calls $transaction with empty array)", async () => {
    mockPrisma.$transaction.mockResolvedValue([]);

    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, []);

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce();
    const arg = mockPrisma.$transaction.mock.calls[0][0];
    expect(arg).toHaveLength(0);
  });

  it("passes correct storeId and tenantId to audit log", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.$transaction.mockResolvedValue([]);

    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, []);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: STORE_ID, tenantId: TENANT_ID, actorUserId: ACTOR_ID })
    );
  });

  it("uses storeId as targetId in audit log", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.$transaction.mockResolvedValue([]);

    await reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, []);

    expect(logAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({ targetId: STORE_ID, targetType: "CatalogCategory" })
    );
  });

  it("throws when $transaction rejects", async () => {
    mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

    await expect(
      reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, [{ id: "cat-001", displayOrder: 0 }])
    ).rejects.toThrow("Transaction failed");
  });

  it("does not call logAuditEvent when $transaction throws", async () => {
    const { logAuditEvent } = await import("@/lib/audit");
    mockPrisma.$transaction.mockRejectedValue(new Error("Transaction failed"));

    await expect(
      reorderCategories(STORE_ID, TENANT_ID, ACTOR_ID, [{ id: "cat-001", displayOrder: 0 }])
    ).rejects.toThrow();
    expect(logAuditEvent).not.toHaveBeenCalled();
  });
});
