import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mock Prisma ──────────────────────────────────────────────────────────────

vi.mock("@/lib/prisma", () => ({
  prisma: {
    promoCode: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    promoRedemption: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listPromoCodes,
  getPromoCodeDetail,
  createPromoCode,
  updatePromoCode,
  deletePromoCode,
  applyPromoCode,
} from "@/services/owner/owner-promotions.service";

const mockPrisma = prisma as unknown as {
  promoCode: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
  promoRedemption: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

const TENANT = "tenant-aaa";
const PROMO_ID = "promo-001";
const USER_ID = "user-001";
const NOW = new Date("2026-01-15T12:00:00Z");

function makePromoRow(overrides: Partial<{
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  description: string | null;
  discountType: string;
  discountValue: object;
  minOrderAmount: object | null;
  maxUses: number | null;
  usedCount: number;
  status: string;
  startsAt: Date | null;
  expiresAt: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  redemptions?: object[];
}> = {}) {
  return {
    id: PROMO_ID,
    tenantId: TENANT,
    storeId: null,
    code: "SUMMER20",
    description: null,
    discountType: "PERCENT",
    discountValue: { toString: () => "20.0000" },
    minOrderAmount: null,
    maxUses: null,
    usedCount: 0,
    status: "ACTIVE",
    startsAt: null,
    expiresAt: null,
    createdBy: USER_ID,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listPromoCodes ───────────────────────────────────────────────────────────

describe("listPromoCodes", () => {
  it("returns paginated items", async () => {
    const row = makePromoRow();
    mockPrisma.promoCode.findMany.mockResolvedValue([row]);
    mockPrisma.promoCode.count.mockResolvedValue(1);

    const result = await listPromoCodes(TENANT);

    expect(result.total).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].code).toBe("SUMMER20");
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });

  it("passes page and pageSize to findMany", async () => {
    mockPrisma.promoCode.findMany.mockResolvedValue([]);
    mockPrisma.promoCode.count.mockResolvedValue(0);

    await listPromoCodes(TENANT, { page: 3, pageSize: 10 });

    expect(mockPrisma.promoCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 })
    );
  });

  it("filters by status", async () => {
    mockPrisma.promoCode.findMany.mockResolvedValue([]);
    mockPrisma.promoCode.count.mockResolvedValue(0);

    await listPromoCodes(TENANT, { status: "INACTIVE" });

    expect(mockPrisma.promoCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ status: "INACTIVE" }) })
    );
  });

  it("filters by storeId", async () => {
    mockPrisma.promoCode.findMany.mockResolvedValue([]);
    mockPrisma.promoCode.count.mockResolvedValue(0);

    await listPromoCodes(TENANT, { storeId: "store-123" });

    expect(mockPrisma.promoCode.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: "store-123" }) })
    );
  });

  it("converts Decimal discountValue to string", async () => {
    const row = makePromoRow({ discountValue: { toString: () => "15.5000" } });
    mockPrisma.promoCode.findMany.mockResolvedValue([row]);
    mockPrisma.promoCode.count.mockResolvedValue(1);

    const result = await listPromoCodes(TENANT);
    expect(typeof result.items[0].discountValue).toBe("string");
  });
});

// ─── getPromoCodeDetail ───────────────────────────────────────────────────────

describe("getPromoCodeDetail", () => {
  it("returns promo with redemptions", async () => {
    const redemption = {
      id: "r-1",
      promoCodeId: PROMO_ID,
      orderId: "order-1",
      userId: USER_ID,
      discountMinor: 500,
      redeemedAt: NOW,
    };
    const row = makePromoRow({ redemptions: [redemption] });
    mockPrisma.promoCode.findFirst.mockResolvedValue(row);

    const detail = await getPromoCodeDetail(TENANT, PROMO_ID);

    expect(detail.code).toBe("SUMMER20");
    expect(detail.redemptions).toHaveLength(1);
    expect(detail.redemptionCount).toBe(1);
    expect(detail.redemptions[0].discountMinor).toBe(500);
  });

  it("returns ISO string for redeemedAt", async () => {
    const redemption = {
      id: "r-2",
      promoCodeId: PROMO_ID,
      orderId: null,
      userId: null,
      discountMinor: 200,
      redeemedAt: NOW,
    };
    const row = makePromoRow({ redemptions: [redemption] });
    mockPrisma.promoCode.findFirst.mockResolvedValue(row);

    const detail = await getPromoCodeDetail(TENANT, PROMO_ID);
    expect(detail.redemptions[0].redeemedAt).toBe(NOW.toISOString());
  });

  it("throws if not found", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(null);
    await expect(getPromoCodeDetail(TENANT, "bad-id")).rejects.toThrow("not found");
  });
});

// ─── createPromoCode ─────────────────────────────────────────────────────────

describe("createPromoCode", () => {
  it("creates with uppercase code", async () => {
    const row = makePromoRow({ code: "SUMMER20" });
    mockPrisma.promoCode.create.mockResolvedValue(row);

    await createPromoCode(TENANT, USER_ID, {
      code: "summer20",
      discountType: "PERCENT",
      discountValue: 20,
    });

    expect(mockPrisma.promoCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "SUMMER20" }),
      })
    );
  });

  it("trims whitespace from code", async () => {
    const row = makePromoRow({ code: "SAVE10" });
    mockPrisma.promoCode.create.mockResolvedValue(row);

    await createPromoCode(TENANT, USER_ID, {
      code: "  save10  ",
      discountType: "FIXED_AMOUNT",
      discountValue: 10,
    });

    expect(mockPrisma.promoCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ code: "SAVE10" }),
      })
    );
  });

  it("sets status to ACTIVE", async () => {
    const row = makePromoRow();
    mockPrisma.promoCode.create.mockResolvedValue(row);

    await createPromoCode(TENANT, USER_ID, {
      code: "TEST",
      discountType: "PERCENT",
      discountValue: 5,
    });

    expect(mockPrisma.promoCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
  });

  it("sets maxUses when provided", async () => {
    const row = makePromoRow({ maxUses: 100 });
    mockPrisma.promoCode.create.mockResolvedValue(row);

    await createPromoCode(TENANT, USER_ID, {
      code: "LIMITED",
      discountType: "PERCENT",
      discountValue: 10,
      maxUses: 100,
    });

    expect(mockPrisma.promoCode.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ maxUses: 100 }),
      })
    );
  });
});

// ─── updatePromoCode ─────────────────────────────────────────────────────────

describe("updatePromoCode", () => {
  it("updates allowed fields", async () => {
    const existing = makePromoRow();
    const updated = makePromoRow({ status: "INACTIVE" });
    mockPrisma.promoCode.findFirst.mockResolvedValue(existing);
    mockPrisma.promoCode.update.mockResolvedValue(updated);

    const result = await updatePromoCode(TENANT, PROMO_ID, { status: "INACTIVE" });
    expect(result.status).toBe("INACTIVE");
    expect(mockPrisma.promoCode.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "INACTIVE" }),
      })
    );
  });

  it("throws if promo not found", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(null);
    await expect(updatePromoCode(TENANT, "bad-id", {})).rejects.toThrow("not found");
  });
});

// ─── deletePromoCode ─────────────────────────────────────────────────────────

describe("deletePromoCode", () => {
  it("deletes existing promo", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(makePromoRow());
    mockPrisma.promoCode.delete.mockResolvedValue({});

    await deletePromoCode(TENANT, PROMO_ID);
    expect(mockPrisma.promoCode.delete).toHaveBeenCalledWith({ where: { id: PROMO_ID } });
  });

  it("throws if not found", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(null);
    await expect(deletePromoCode(TENANT, "missing")).rejects.toThrow("not found");
  });
});

// ─── applyPromoCode ───────────────────────────────────────────────────────────

describe("applyPromoCode", () => {
  it("calculates PERCENT discount correctly", async () => {
    const promo = makePromoRow({
      discountType: "PERCENT",
      discountValue: { toString: () => "20.0000" },
    });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const result = await applyPromoCode(TENANT, "SUMMER20", 1000);
    expect(result.discountMinor).toBe(200); // 20% of 1000
  });

  it("calculates FIXED_AMOUNT discount correctly", async () => {
    const promo = makePromoRow({
      discountType: "FIXED_AMOUNT",
      discountValue: { toString: () => "5.0000" },
    });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const result = await applyPromoCode(TENANT, "SAVE5", 2000);
    expect(result.discountMinor).toBe(500); // $5.00 off → 500 minor
  });

  it("caps FIXED_AMOUNT at order total", async () => {
    const promo = makePromoRow({
      discountType: "FIXED_AMOUNT",
      discountValue: { toString: () => "50.0000" },
    });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const result = await applyPromoCode(TENANT, "BIG50", 1000);
    expect(result.discountMinor).toBe(1000); // capped at order amount
  });

  it("throws if promo not found / inactive", async () => {
    mockPrisma.promoCode.findFirst.mockResolvedValue(null);
    await expect(applyPromoCode(TENANT, "INVALID", 500)).rejects.toThrow("not valid");
  });

  it("throws if promo not yet started", async () => {
    const future = new Date(Date.now() + 86400000);
    const promo = makePromoRow({ startsAt: future });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);

    await expect(applyPromoCode(TENANT, "SOON", 500)).rejects.toThrow("not yet active");
  });

  it("throws if promo has expired", async () => {
    const past = new Date(Date.now() - 86400000);
    const promo = makePromoRow({ expiresAt: past });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);

    await expect(applyPromoCode(TENANT, "OLD", 500)).rejects.toThrow("expired");
  });

  it("throws when usage limit reached", async () => {
    const promo = makePromoRow({ maxUses: 5, usedCount: 5 });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);

    await expect(applyPromoCode(TENANT, "FULL", 500)).rejects.toThrow("usage limit");
  });

  it("throws when min order amount not met", async () => {
    const promo = makePromoRow({
      minOrderAmount: { toString: () => "10.0000" },
    });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);

    await expect(applyPromoCode(TENANT, "BIG", 500)).rejects.toThrow("Minimum order amount");
  });

  it("records redemption in a transaction", async () => {
    const promo = makePromoRow();
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    await applyPromoCode(TENANT, "SUMMER20", 1000, USER_ID, "order-abc");

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it("returns correct promoCodeId and code", async () => {
    const promo = makePromoRow({ id: "promo-xyz", code: "SUMMER20" });
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    const result = await applyPromoCode(TENANT, "SUMMER20", 1000);
    expect(result.promoCodeId).toBe("promo-xyz");
    expect(result.code).toBe("SUMMER20");
  });

  it("normalises code to uppercase before lookup", async () => {
    const promo = makePromoRow();
    mockPrisma.promoCode.findFirst.mockResolvedValue(promo);
    mockPrisma.$transaction.mockResolvedValue([{}, {}]);

    await applyPromoCode(TENANT, "summer20", 1000);

    expect(mockPrisma.promoCode.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ code: "SUMMER20" }),
      })
    );
  });
});
