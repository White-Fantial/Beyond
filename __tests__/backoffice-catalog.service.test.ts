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
  it("creates a category with sourceType LOCAL", async () => {
    mockPrisma.catalogCategory.create.mockResolvedValue(LOCAL_CATEGORY);

    const result = await createBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Burgers",
    });

    expect(mockPrisma.catalogCategory.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogCategory.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.storeId).toBe(STORE_ID);
    expect(callArg.data.tenantId).toBe(TENANT_ID);
    expect(result.name).toBe("Burgers");
  });
});

describe("updateBackofficeCategory", () => {
  it("updates name for LOCAL category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
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

  it("throws when attempting to change name of POS category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, POS_CATEGORY.id, {
        name: "Should Fail",
      })
    ).rejects.toThrow("Cannot edit name");
  });

  it("allows visibility update for POS category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
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
      sourceType: "LOCAL",
    });

    await expect(
      updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-001", { name: "X" })
    ).rejects.toThrow("does not belong");
  });
});

describe("deleteBackofficeCategory", () => {
  it("soft-deletes a LOCAL category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
    });
    mockPrisma.catalogCategory.update.mockResolvedValue({});

    await deleteBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-001");

    const updateCall = mockPrisma.catalogCategory.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("throws when trying to delete a POS category", async () => {
    mockPrisma.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      deleteBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, POS_CATEGORY.id)
    ).rejects.toThrow("Cannot delete POS-sourced");
  });
});

// ─── Product tests ────────────────────────────────────────────────────────────

describe("createBackofficeProduct", () => {
  it("creates a product with sourceType LOCAL and correct price", async () => {
    mockPrisma.catalogProduct.create.mockResolvedValue(LOCAL_PRODUCT);

    const result = await createBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Burger",
      basePriceAmount: 1200,
    });

    expect(mockPrisma.catalogProduct.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogProduct.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(callArg.data.basePriceAmount).toBe(1200);
    expect(result.basePriceAmount).toBe(1200);
  });
});

describe("updateBackofficeProduct", () => {
  it("updates price for LOCAL product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
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

  it("throws when attempting to change price of POS product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, POS_PRODUCT.id, {
        basePriceAmount: 999,
      })
    ).rejects.toThrow("Cannot edit");
  });

  it("allows isSoldOut update for POS product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
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
  it("soft-deletes a LOCAL product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
    });
    mockPrisma.catalogProduct.update.mockResolvedValue({});

    await deleteBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-001");

    const updateCall = mockPrisma.catalogProduct.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("throws when trying to delete a POS product", async () => {
    mockPrisma.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      deleteBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, POS_PRODUCT.id)
    ).rejects.toThrow("Cannot delete POS-sourced");
  });
});

// ─── Modifier Group tests ─────────────────────────────────────────────────────

describe("createBackofficeModifierGroup", () => {
  it("creates a modifier group with sourceType LOCAL", async () => {
    mockPrisma.catalogModifierGroup.create.mockResolvedValue(LOCAL_GROUP);

    const result = await createBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, {
      name: "Extras",
    });

    expect(mockPrisma.catalogModifierGroup.create).toHaveBeenCalledOnce();
    const callArg = mockPrisma.catalogModifierGroup.create.mock.calls[0][0];
    expect(callArg.data.sourceType).toBe("LOCAL");
    expect(result.name).toBe("Extras");
  });
});

describe("updateBackofficeModifierGroup", () => {
  it("updates a LOCAL modifier group name", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
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
  it("soft-deletes a LOCAL modifier group", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
    });
    mockPrisma.catalogModifierGroup.update.mockResolvedValue({});

    await deleteBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, LOCAL_GROUP.id);

    const updateCall = mockPrisma.catalogModifierGroup.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("throws when trying to delete a POS modifier group", async () => {
    mockPrisma.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      deleteBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, "grp-pos")
    ).rejects.toThrow("Cannot delete POS-sourced");
  });
});

// ─── Modifier Option tests ────────────────────────────────────────────────────

describe("createBackofficeModifierOption", () => {
  it("creates an option with sourceType LOCAL", async () => {
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
    expect(callArg.data.modifierGroupId).toBe(LOCAL_GROUP.id);
    expect(result.name).toBe("Extra Cheese");
  });
});

describe("updateBackofficeModifierOption", () => {
  it("updates price delta for LOCAL option", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
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

  it("allows isSoldOut update regardless of sourceType", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
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
  it("soft-deletes a LOCAL option", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "LOCAL",
    });
    mockPrisma.catalogModifierOption.update.mockResolvedValue({});

    await deleteBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, LOCAL_OPTION.id);

    const updateCall = mockPrisma.catalogModifierOption.update.mock.calls[0][0];
    expect(updateCall.data.deletedAt).toBeInstanceOf(Date);
  });

  it("throws when trying to delete a POS option", async () => {
    mockPrisma.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
      sourceType: "POS",
    });

    await expect(
      deleteBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, "opt-pos")
    ).rejects.toThrow("Cannot delete POS-sourced");
  });
});
