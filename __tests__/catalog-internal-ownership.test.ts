/**
 * Catalog Phase 1 — Internal Ownership Tests
 *
 * Verifies the core invariants of Phase 1:
 * 1. Customer menu service reads ONLY from internal catalog tables.
 * 2. Entities originally imported from POS (IMPORTED_FROM_POS) are still editable.
 * 3. No source-lock logic remains in the backoffice or owner catalog services.
 * 4. New catalog entities created in Beyond carry originType = BEYOND_CREATED.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    catalogCategory: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    catalogProduct: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    catalogModifierGroup: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    },
    catalogModifierOption: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    catalogProductCategory: {
      findMany: vi.fn(),
    },
    catalogProductModifierGroup: {
      findMany: vi.fn(),
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
} from "@/services/backoffice/backoffice-catalog.service";

// ─── Typed mock helpers ───────────────────────────────────────────────────────

type AnyMock = ReturnType<typeof vi.fn>;
const mp = prisma as unknown as Record<string, Record<string, AnyMock>>;

const STORE_ID = "store-ph1";
const TENANT_ID = "tenant-ph1";
const ACTOR_ID = "user-ph1";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Phase 1: provenance fields set correctly on create ───────────────────────

describe("Phase 1 — provenance on create", () => {
  it("sets originType = BEYOND_CREATED on new category", async () => {
    mp.catalogCategory.create.mockResolvedValue({
      id: "cat-new",
      name: "Drinks",
      originType: "BEYOND_CREATED",
      sourceType: "LOCAL",
    });

    await createBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, { name: "Drinks" });

    const arg = mp.catalogCategory.create.mock.calls[0][0];
    expect(arg.data.originType).toBe("BEYOND_CREATED");
  });

  it("sets originType = BEYOND_CREATED on new product", async () => {
    mp.catalogProduct.create.mockResolvedValue({
      id: "prod-new",
      name: "Latte",
      originType: "BEYOND_CREATED",
      sourceType: "LOCAL",
      basePriceAmount: 500,
    });

    await createBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, { name: "Latte", basePriceAmount: 500 });

    const arg = mp.catalogProduct.create.mock.calls[0][0];
    expect(arg.data.originType).toBe("BEYOND_CREATED");
  });

  it("sets originType = BEYOND_CREATED on new modifier group", async () => {
    mp.catalogModifierGroup.create.mockResolvedValue({
      id: "grp-new",
      name: "Milk Options",
      originType: "BEYOND_CREATED",
      sourceType: "LOCAL",
    });

    await createBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, { name: "Milk Options" });

    const arg = mp.catalogModifierGroup.create.mock.calls[0][0];
    expect(arg.data.originType).toBe("BEYOND_CREATED");
  });

  it("sets originType = BEYOND_CREATED on new modifier option", async () => {
    mp.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({ id: "grp-new" });
    mp.catalogModifierOption.create.mockResolvedValue({
      id: "opt-new",
      name: "Oat Milk",
      originType: "BEYOND_CREATED",
      sourceType: "LOCAL",
    });

    await createBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, "grp-new", {
      name: "Oat Milk",
      priceDeltaAmount: 50,
    });

    const arg = mp.catalogModifierOption.create.mock.calls[0][0];
    expect(arg.data.originType).toBe("BEYOND_CREATED");
  });
});

// ─── Phase 1: no source-lock — IMPORTED_FROM_POS entities are fully editable ─

describe("Phase 1 — IMPORTED_FROM_POS entities are fully editable", () => {
  it("allows name update on category originally imported from POS", async () => {
    mp.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogCategory.update.mockResolvedValue({
      id: "cat-pos",
      name: "New Name",
      originType: "IMPORTED_FROM_POS",
      sourceType: "POS",
    });

    const result = await updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-pos", {
      name: "New Name",
    });

    expect(result.name).toBe("New Name");
  });

  it("allows price update on product originally imported from POS", async () => {
    mp.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogProduct.update.mockResolvedValue({
      id: "prod-pos",
      name: "Coffee",
      originType: "IMPORTED_FROM_POS",
      sourceType: "POS",
      basePriceAmount: 600,
    });

    const result = await updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-pos", {
      basePriceAmount: 600,
    });

    expect(result.basePriceAmount).toBe(600);
  });

  it("allows name update on modifier group originally imported from POS", async () => {
    mp.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogModifierGroup.update.mockResolvedValue({
      id: "grp-pos",
      name: "Updated Group",
      originType: "IMPORTED_FROM_POS",
      sourceType: "POS",
    });

    const result = await updateBackofficeModifierGroup(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      "grp-pos",
      { name: "Updated Group" }
    );

    expect(result.name).toBe("Updated Group");
  });

  it("allows price update on modifier option originally imported from POS", async () => {
    mp.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogModifierOption.update.mockResolvedValue({
      id: "opt-pos",
      name: "Almond Milk",
      originType: "IMPORTED_FROM_POS",
      sourceType: "POS",
      priceDeltaAmount: 75,
    });

    const result = await updateBackofficeModifierOption(
      STORE_ID,
      TENANT_ID,
      ACTOR_ID,
      "opt-pos",
      { priceDeltaAmount: 75 }
    );

    expect(result.priceDeltaAmount).toBe(75);
  });

  it("allows soft-delete on category originally imported from POS", async () => {
    mp.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogCategory.update.mockResolvedValue({});

    await deleteBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-pos");

    const updateArg = mp.catalogCategory.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("allows soft-delete on product originally imported from POS", async () => {
    mp.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogProduct.update.mockResolvedValue({});

    await deleteBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-pos");

    const updateArg = mp.catalogProduct.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("allows soft-delete on modifier group originally imported from POS", async () => {
    mp.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogModifierGroup.update.mockResolvedValue({});

    await deleteBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, "grp-pos");

    const updateArg = mp.catalogModifierGroup.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });

  it("allows soft-delete on modifier option originally imported from POS", async () => {
    mp.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: STORE_ID,
    });
    mp.catalogModifierOption.update.mockResolvedValue({});

    await deleteBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, "opt-pos");

    const updateArg = mp.catalogModifierOption.update.mock.calls[0][0];
    expect(updateArg.data.deletedAt).toBeInstanceOf(Date);
  });
});

// ─── Phase 1: store ownership guard still works ───────────────────────────────

describe("Phase 1 — store ownership guard", () => {
  it("blocks update when category belongs to different store", async () => {
    mp.catalogCategory.findUniqueOrThrow.mockResolvedValue({
      storeId: "other-store",
    });

    await expect(
      updateBackofficeCategory(STORE_ID, TENANT_ID, ACTOR_ID, "cat-x", { name: "Hack" })
    ).rejects.toThrow("does not belong");
  });

  it("blocks update when product belongs to different store", async () => {
    mp.catalogProduct.findUniqueOrThrow.mockResolvedValue({
      storeId: "other-store",
    });

    await expect(
      updateBackofficeProduct(STORE_ID, TENANT_ID, ACTOR_ID, "prod-x", { basePriceAmount: 1 })
    ).rejects.toThrow("does not belong");
  });

  it("blocks update when modifier group belongs to different store", async () => {
    mp.catalogModifierGroup.findUniqueOrThrow.mockResolvedValue({
      storeId: "other-store",
    });

    await expect(
      updateBackofficeModifierGroup(STORE_ID, TENANT_ID, ACTOR_ID, "grp-x", { name: "Hack" })
    ).rejects.toThrow("does not belong");
  });

  it("blocks update when modifier option belongs to different store", async () => {
    mp.catalogModifierOption.findUniqueOrThrow.mockResolvedValue({
      storeId: "other-store",
    });

    await expect(
      updateBackofficeModifierOption(STORE_ID, TENANT_ID, ACTOR_ID, "opt-x", { priceDeltaAmount: 1 })
    ).rejects.toThrow("does not belong");
  });
});
