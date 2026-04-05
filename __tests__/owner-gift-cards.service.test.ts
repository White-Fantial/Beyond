import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    giftCard: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    giftCardTransaction: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import {
  listGiftCards,
  getGiftCardDetail,
  issueGiftCard,
  voidGiftCard,
  lookupGiftCardByCode,
  validateGiftCard,
  applyGiftCardToOrder,
} from "@/services/owner/owner-gift-cards.service";

const mockPrisma = prisma as unknown as {
  giftCard: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  giftCardTransaction: { create: ReturnType<typeof vi.fn> };
  $transaction: ReturnType<typeof vi.fn>;
};

const TENANT = "tenant-1";

const mockCard = {
  id: "gc-1",
  tenantId: TENANT,
  storeId: null,
  code: "ABCD-1234-EFGH-5678",
  initialValue: 5000,
  currentBalance: 5000,
  issuedToEmail: "alice@example.com",
  expiresAt: null,
  isVoided: false,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};

const mockTx = {
  id: "gct-1",
  giftCardId: "gc-1",
  type: "ISSUE",
  amount: 5000,
  orderId: null,
  note: "Gift card issued",
  createdAt: new Date("2026-01-01"),
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── listGiftCards ────────────────────────────────────────────────────────────

describe("listGiftCards", () => {
  it("returns paginated gift cards", async () => {
    mockPrisma.giftCard.findMany.mockResolvedValue([mockCard]);
    mockPrisma.giftCard.count.mockResolvedValue(1);

    const result = await listGiftCards(TENANT);

    expect(result.items).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.items[0].code).toBe("ABCD-1234-EFGH-5678");
  });

  it("converts Decimal/Date fields to strings", async () => {
    mockPrisma.giftCard.findMany.mockResolvedValue([mockCard]);
    mockPrisma.giftCard.count.mockResolvedValue(1);

    const result = await listGiftCards(TENANT);
    expect(typeof result.items[0].createdAt).toBe("string");
    expect(result.items[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("filters by storeId", async () => {
    mockPrisma.giftCard.findMany.mockResolvedValue([]);
    mockPrisma.giftCard.count.mockResolvedValue(0);

    await listGiftCards(TENANT, { storeId: "store-1" });

    expect(mockPrisma.giftCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: "store-1" }) })
    );
  });

  it("filters by isVoided", async () => {
    mockPrisma.giftCard.findMany.mockResolvedValue([]);
    mockPrisma.giftCard.count.mockResolvedValue(0);

    await listGiftCards(TENANT, { isVoided: false });

    expect(mockPrisma.giftCard.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isVoided: false }) })
    );
  });

  it("defaults to page 1, pageSize 20", async () => {
    mockPrisma.giftCard.findMany.mockResolvedValue([]);
    mockPrisma.giftCard.count.mockResolvedValue(0);

    const result = await listGiftCards(TENANT);
    expect(result.page).toBe(1);
    expect(result.pageSize).toBe(20);
  });
});

// ─── getGiftCardDetail ────────────────────────────────────────────────────────

describe("getGiftCardDetail", () => {
  it("returns card with transactions", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, transactions: [mockTx] });

    const detail = await getGiftCardDetail(TENANT, "gc-1");

    expect(detail.id).toBe("gc-1");
    expect(detail.transactions).toHaveLength(1);
    expect(detail.transactions[0].type).toBe("ISSUE");
  });

  it("throws if card not found", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(null);

    await expect(getGiftCardDetail(TENANT, "gc-missing")).rejects.toThrow("not found");
  });
});

// ─── issueGiftCard ────────────────────────────────────────────────────────────

describe("issueGiftCard", () => {
  it("creates card and ISSUE transaction", async () => {
    mockPrisma.giftCard.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        giftCard: { create: vi.fn().mockResolvedValue(mockCard) },
        giftCardTransaction: { create: vi.fn().mockResolvedValue(mockTx) },
      };
      return fn(fakeTx);
    });

    const result = await issueGiftCard(TENANT, { initialValue: 5000, issuedToEmail: "alice@example.com" });

    expect(result.initialValue).toBe(5000);
    expect(result.currentBalance).toBe(5000);
  });

  it("sets currentBalance equal to initialValue", async () => {
    mockPrisma.giftCard.findUnique.mockResolvedValue(null);
    mockPrisma.$transaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const fakeTx = {
        giftCard: { create: vi.fn().mockResolvedValue({ ...mockCard, initialValue: 2500, currentBalance: 2500 }) },
        giftCardTransaction: { create: vi.fn().mockResolvedValue(mockTx) },
      };
      return fn(fakeTx);
    });

    const result = await issueGiftCard(TENANT, { initialValue: 2500 });
    expect(result.currentBalance).toBe(2500);
  });
});

// ─── voidGiftCard ─────────────────────────────────────────────────────────────

describe("voidGiftCard", () => {
  it("voids a card and sets balance to 0", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(mockCard);
    const voidedCard = { ...mockCard, isVoided: true, currentBalance: 0 };
    mockPrisma.$transaction.mockResolvedValue([voidedCard, mockTx]);

    const result = await voidGiftCard(TENANT, "gc-1");
    expect(result.isVoided).toBe(true);
    expect(result.currentBalance).toBe(0);
  });

  it("throws if card not found", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(null);
    await expect(voidGiftCard(TENANT, "gc-missing")).rejects.toThrow("not found");
  });

  it("throws if already voided", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, isVoided: true });
    await expect(voidGiftCard(TENANT, "gc-1")).rejects.toThrow("already voided");
  });
});

// ─── lookupGiftCardByCode ─────────────────────────────────────────────────────

describe("lookupGiftCardByCode", () => {
  it("returns card by code", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(mockCard);
    const result = await lookupGiftCardByCode(TENANT, "ABCD-1234-EFGH-5678");
    expect(result.code).toBe("ABCD-1234-EFGH-5678");
  });

  it("throws if code not found", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(null);
    await expect(lookupGiftCardByCode(TENANT, "INVALID")).rejects.toThrow("not found");
  });
});

// ─── validateGiftCard ─────────────────────────────────────────────────────────

describe("validateGiftCard", () => {
  it("returns correct amountApplied and remainingBalance", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(mockCard);

    const result = await validateGiftCard(TENANT, "ABCD-1234-EFGH-5678", 3000);

    expect(result.amountApplied).toBe(3000);
    expect(result.remainingBalance).toBe(2000);
  });

  it("caps amountApplied at currentBalance", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, currentBalance: 1000 });

    const result = await validateGiftCard(TENANT, "ABCD-1234-EFGH-5678", 5000);

    expect(result.amountApplied).toBe(1000);
    expect(result.remainingBalance).toBe(0);
  });

  it("throws if card is voided", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, isVoided: true });
    await expect(validateGiftCard(TENANT, "ABCD-1234-EFGH-5678", 3000)).rejects.toThrow("voided");
  });

  it("throws if balance is zero", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, currentBalance: 0 });
    await expect(validateGiftCard(TENANT, "ABCD-1234-EFGH-5678", 3000)).rejects.toThrow("no remaining balance");
  });

  it("throws if card is expired", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, expiresAt: new Date("2020-01-01") });
    await expect(validateGiftCard(TENANT, "ABCD-1234-EFGH-5678", 3000)).rejects.toThrow("expired");
  });

  it("throws if card not found", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(null);
    await expect(validateGiftCard(TENANT, "INVALID", 3000)).rejects.toThrow("not valid");
  });
});

// ─── applyGiftCardToOrder ─────────────────────────────────────────────────────

describe("applyGiftCardToOrder", () => {
  it("deducts balance and creates REDEEM transaction", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue(mockCard);
    mockPrisma.$transaction.mockResolvedValue([{ ...mockCard, currentBalance: 2000 }, mockTx]);

    const result = await applyGiftCardToOrder(TENANT, "ABCD-1234-EFGH-5678", 3000, "order-1");

    expect(result.amountApplied).toBe(3000);
    expect(result.remainingBalance).toBe(2000);
    expect(mockPrisma.$transaction).toHaveBeenCalled();
  });

  it("applies full balance when order amount exceeds balance", async () => {
    mockPrisma.giftCard.findFirst.mockResolvedValue({ ...mockCard, currentBalance: 1000 });
    mockPrisma.$transaction.mockResolvedValue([{ ...mockCard, currentBalance: 0 }, mockTx]);

    const result = await applyGiftCardToOrder(TENANT, "ABCD-1234-EFGH-5678", 9999);
    expect(result.amountApplied).toBe(1000);
    expect(result.remainingBalance).toBe(0);
  });
});
