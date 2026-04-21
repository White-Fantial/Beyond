import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    supplierContractPrice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    supplierPriceRecord: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
    },
    supplierProduct: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listContractPrices,
  createContractPrice,
  endContractPrice,
  getCurrentContractPrice,
  listPriceRecords,
  createManualPriceRecord,
  resolveEffectiveCost,
  resolveEffectiveCostsBulk,
} from "@/services/owner/owner-supplier-prices.service";

const mockPrisma = prisma as unknown as {
  supplierContractPrice: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    updateMany: ReturnType<typeof vi.fn>;
  };
  supplierPriceRecord: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  supplierProduct: {
    findFirst: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
};

const TENANT = "tenant-1";
const PRODUCT_ID = "sp-1";

function makeMockProduct() {
  return {
    id: PRODUCT_ID,
    supplierId: "sup-1",
    deletedAt: null,
    supplier: { tenantId: TENANT, deletedAt: null },
  };
}

function makeMockContractPrice(overrides: Partial<{
  id: string; price: number; effectiveTo: Date | null;
}> = {}) {
  return {
    id: overrides.id ?? "cp-1",
    supplierProductId: PRODUCT_ID,
    tenantId: TENANT,
    price: overrides.price ?? 100000,
    effectiveFrom: new Date("2026-01-01"),
    effectiveTo: overrides.effectiveTo ?? null,
    contractRef: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };
}

function makeMockPriceRecord(overrides: Partial<{ id: string; observedPrice: number }> = {}) {
  return {
    id: overrides.id ?? "pr-1",
    supplierProductId: PRODUCT_ID,
    tenantId: TENANT,
    observedPrice: overrides.observedPrice ?? 95000,
    source: "MANUAL_ENTRY",
    credentialId: null,
    observedAt: new Date("2026-01-02"),
    notes: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listContractPrices ───────────────────────────────────────────────────────

describe("listContractPrices", () => {
  it("returns contract prices with dates serialised to ISO strings", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(makeMockProduct());
    mockPrisma.supplierContractPrice.findMany.mockResolvedValue([makeMockContractPrice()]);

    const result = await listContractPrices(TENANT, PRODUCT_ID);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(typeof result.items[0].effectiveFrom).toBe("string");
    expect(result.items[0].effectiveTo).toBeNull();
    expect(result.items[0].price).toBe(100000);
  });

  it("throws if supplier product not found for tenant", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(listContractPrices(TENANT, PRODUCT_ID)).rejects.toThrow("not found");
  });
});

// ─── createContractPrice ──────────────────────────────────────────────────────

describe("createContractPrice", () => {
  it("ends the current active contract price and creates a new one", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(makeMockProduct());
    mockPrisma.supplierContractPrice.updateMany.mockResolvedValue({ count: 1 });
    mockPrisma.supplierContractPrice.create.mockResolvedValue(makeMockContractPrice({ price: 120000 }));

    const result = await createContractPrice(TENANT, PRODUCT_ID, { price: 120000 });

    expect(result.price).toBe(120000);
    expect(mockPrisma.supplierContractPrice.updateMany).toHaveBeenCalledWith({
      where: { supplierProductId: PRODUCT_ID, tenantId: TENANT, effectiveTo: null },
      data: { effectiveTo: expect.any(Date) },
    });
    expect(mockPrisma.supplierContractPrice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierProductId: PRODUCT_ID,
          tenantId: TENANT,
          price: 120000,
        }),
      })
    );
  });

  it("supports optional contractRef and notes", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(makeMockProduct());
    mockPrisma.supplierContractPrice.updateMany.mockResolvedValue({ count: 0 });
    const expected = { ...makeMockContractPrice(), contractRef: "PO-2026-001", notes: "Annual contract" };
    mockPrisma.supplierContractPrice.create.mockResolvedValue(expected);

    const result = await createContractPrice(TENANT, PRODUCT_ID, {
      price: 100000,
      contractRef: "PO-2026-001",
      notes: "Annual contract",
    });

    expect(result.contractRef).toBe("PO-2026-001");
    expect(result.notes).toBe("Annual contract");
  });

  it("throws if supplier product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(
      createContractPrice(TENANT, PRODUCT_ID, { price: 100000 })
    ).rejects.toThrow("not found");
  });
});

// ─── endContractPrice ─────────────────────────────────────────────────────────

describe("endContractPrice", () => {
  it("sets effectiveTo to now on the active contract price", async () => {
    const activePrice = makeMockContractPrice({ id: "cp-1", effectiveTo: null });
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(activePrice);
    const endedPrice = { ...activePrice, effectiveTo: new Date() };
    mockPrisma.supplierContractPrice.update.mockResolvedValue(endedPrice);

    const result = await endContractPrice(TENANT, "cp-1");

    expect(result.effectiveTo).not.toBeNull();
    expect(mockPrisma.supplierContractPrice.update).toHaveBeenCalledWith({
      where: { id: "cp-1" },
      data: { effectiveTo: expect.any(Date) },
    });
  });

  it("throws if no active contract price found", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(null);

    await expect(endContractPrice(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── getCurrentContractPrice ──────────────────────────────────────────────────

describe("getCurrentContractPrice", () => {
  it("returns the active contract price (effectiveTo IS NULL)", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(makeMockContractPrice());

    const result = await getCurrentContractPrice(TENANT, PRODUCT_ID);

    expect(result).not.toBeNull();
    expect(result!.effectiveTo).toBeNull();
    expect(result!.price).toBe(100000);
  });

  it("returns null when no active contract price exists", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(null);

    const result = await getCurrentContractPrice(TENANT, PRODUCT_ID);

    expect(result).toBeNull();
  });
});

// ─── listPriceRecords ─────────────────────────────────────────────────────────

describe("listPriceRecords", () => {
  it("returns paginated price records newest-first", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(makeMockProduct());
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([makeMockPriceRecord()]);
    mockPrisma.supplierPriceRecord.count.mockResolvedValue(1);

    const result = await listPriceRecords(TENANT, PRODUCT_ID);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].source).toBe("MANUAL_ENTRY");
    expect(typeof result.items[0].observedAt).toBe("string");
  });

  it("throws if supplier product not found", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(null);

    await expect(listPriceRecords(TENANT, PRODUCT_ID)).rejects.toThrow("not found");
  });
});

// ─── createManualPriceRecord ──────────────────────────────────────────────────

describe("createManualPriceRecord", () => {
  it("creates a MANUAL_ENTRY price record", async () => {
    mockPrisma.supplierProduct.findFirst.mockResolvedValue(makeMockProduct());
    mockPrisma.supplierPriceRecord.create.mockResolvedValue(makeMockPriceRecord({ observedPrice: 88000 }));

    const result = await createManualPriceRecord(TENANT, PRODUCT_ID, { observedPrice: 88000 });

    expect(result.observedPrice).toBe(88000);
    expect(mockPrisma.supplierPriceRecord.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          supplierProductId: PRODUCT_ID,
          tenantId: TENANT,
          observedPrice: 88000,
          source: "MANUAL_ENTRY",
        }),
      })
    );
  });
});

// ─── resolveEffectiveCost ─────────────────────────────────────────────────────

describe("resolveEffectiveCost", () => {
  it("returns active contract price (step 1)", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(makeMockContractPrice({ price: 100000 }));

    const result = await resolveEffectiveCost(TENANT, PRODUCT_ID);

    expect(result.price).toBe(100000);
    expect(result.resolved).toBe(true);
    expect(mockPrisma.supplierPriceRecord.findFirst).not.toHaveBeenCalled();
  });

  it("falls back to latest price record when no contract price (step 2)", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(null);
    mockPrisma.supplierPriceRecord.findFirst.mockResolvedValue(makeMockPriceRecord({ observedPrice: 95000 }));

    const result = await resolveEffectiveCost(TENANT, PRODUCT_ID);

    expect(result.price).toBe(95000);
    expect(result.resolved).toBe(true);
  });

  it("falls back to referencePrice when no contract price or record (step 3)", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(null);
    mockPrisma.supplierPriceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({ id: PRODUCT_ID, referencePrice: 80000 });

    const result = await resolveEffectiveCost(TENANT, PRODUCT_ID);

    expect(result.price).toBe(80000);
    expect(result.resolved).toBe(true);
  });

  it("returns 0 unresolved when no pricing data at all (step 4)", async () => {
    mockPrisma.supplierContractPrice.findFirst.mockResolvedValue(null);
    mockPrisma.supplierPriceRecord.findFirst.mockResolvedValue(null);
    mockPrisma.supplierProduct.findFirst.mockResolvedValue({ id: PRODUCT_ID, referencePrice: 0 });

    const result = await resolveEffectiveCost(TENANT, PRODUCT_ID);

    expect(result.price).toBe(0);
    expect(result.resolved).toBe(false);
  });
});

// ─── resolveEffectiveCostsBulk ────────────────────────────────────────────────

describe("resolveEffectiveCostsBulk", () => {
  it("returns empty map for empty input", async () => {
    const result = await resolveEffectiveCostsBulk(TENANT, []);
    expect(result.size).toBe(0);
  });

  it("resolves via contract prices first, then records, then referencePrice", async () => {
    const ids = ["sp-1", "sp-2", "sp-3"];

    // sp-1 has a contract price
    mockPrisma.supplierContractPrice.findMany.mockResolvedValue([
      { supplierProductId: "sp-1", price: 100000 },
    ]);
    // sp-2 has a price record (no contract)
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([
      { supplierProductId: "sp-2", observedPrice: 70000 },
    ]);
    // sp-3 falls back to referencePrice
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { id: "sp-3", referencePrice: 50000 },
    ]);

    const result = await resolveEffectiveCostsBulk(TENANT, ids);

    expect(result.get("sp-1")).toEqual({ price: 100000, resolved: true });
    expect(result.get("sp-2")).toEqual({ price: 70000, resolved: true });
    expect(result.get("sp-3")).toEqual({ price: 50000, resolved: true });
  });

  it("marks products with no data as unresolved", async () => {
    mockPrisma.supplierContractPrice.findMany.mockResolvedValue([]);
    mockPrisma.supplierPriceRecord.findMany.mockResolvedValue([]);
    mockPrisma.supplierProduct.findMany.mockResolvedValue([
      { id: "sp-1", referencePrice: 0 },
    ]);

    const result = await resolveEffectiveCostsBulk(TENANT, ["sp-1"]);

    expect(result.get("sp-1")).toEqual({ price: 0, resolved: false });
  });
});
