/**
 * Owner Gift Cards Service — Phase 13.
 *
 * Manage gift cards and track transactions. All functions scoped to tenantId.
 */
import { prisma } from "@/lib/prisma";
import type {
  GiftCard,
  GiftCardDetail,
  GiftCardListResult,
  GiftCardTransaction,
  GiftCardFilters,
  IssueGiftCardInput,
  ApplyGiftCardResult,
  GiftCardTransactionType,
} from "@/types/owner-gift-cards";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toGiftCard(row: {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  initialValue: number;
  currentBalance: number;
  issuedToEmail: string | null;
  expiresAt: Date | null;
  isVoided: boolean;
  createdAt: Date;
  updatedAt: Date;
}): GiftCard {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    code: row.code,
    initialValue: row.initialValue,
    currentBalance: row.currentBalance,
    issuedToEmail: row.issuedToEmail,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    isVoided: row.isVoided,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toGiftCardTransaction(row: {
  id: string;
  giftCardId: string;
  type: string;
  amount: number;
  orderId: string | null;
  note: string | null;
  createdAt: Date;
}): GiftCardTransaction {
  return {
    id: row.id,
    giftCardId: row.giftCardId,
    type: row.type as GiftCardTransactionType,
    amount: row.amount,
    orderId: row.orderId,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  };
}

function generateGiftCardCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listGiftCards(
  tenantId: string,
  filters: GiftCardFilters = {}
): Promise<GiftCardListResult> {
  const { storeId, isVoided, page = 1, pageSize = 20 } = filters;

  const where = {
    tenantId,
    ...(storeId ? { storeId } : {}),
    ...(isVoided !== undefined ? { isVoided } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.giftCard.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.giftCard.count({ where }),
  ]);

  return { items: rows.map(toGiftCard), total, page, pageSize };
}

export async function getGiftCardDetail(
  tenantId: string,
  giftCardId: string
): Promise<GiftCardDetail> {
  const row = await prisma.giftCard.findFirst({
    where: { id: giftCardId, tenantId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 50,
      },
    },
  });
  if (!row) throw new Error(`GiftCard ${giftCardId} not found`);

  return {
    ...toGiftCard(row),
    transactions: row.transactions.map(toGiftCardTransaction),
  };
}

export async function issueGiftCard(
  tenantId: string,
  input: IssueGiftCardInput
): Promise<GiftCard> {
  let code: string;
  let attempts = 0;
  do {
    code = generateGiftCardCode();
    const conflict = await prisma.giftCard.findUnique({ where: { code } });
    if (!conflict) break;
    if (++attempts > 10) throw new Error("Could not generate unique gift card code");
  } while (true);

  const row = await prisma.$transaction(async (tx) => {
    const card = await tx.giftCard.create({
      data: {
        tenantId,
        storeId: input.storeId ?? null,
        code: code!,
        initialValue: input.initialValue,
        currentBalance: input.initialValue,
        issuedToEmail: input.issuedToEmail ?? null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      },
    });
    await tx.giftCardTransaction.create({
      data: {
        giftCardId: card.id,
        type: "ISSUE",
        amount: input.initialValue,
        note: input.issuedToEmail ? `Issued to ${input.issuedToEmail}` : "Gift card issued",
      },
    });
    return card;
  });

  return toGiftCard(row);
}

export async function voidGiftCard(tenantId: string, giftCardId: string): Promise<GiftCard> {
  const existing = await prisma.giftCard.findFirst({ where: { id: giftCardId, tenantId } });
  if (!existing) throw new Error(`GiftCard ${giftCardId} not found`);
  if (existing.isVoided) throw new Error(`GiftCard ${giftCardId} is already voided`);

  const [row] = await prisma.$transaction([
    prisma.giftCard.update({
      where: { id: giftCardId },
      data: { isVoided: true, currentBalance: 0 },
    }),
    prisma.giftCardTransaction.create({
      data: {
        giftCardId,
        type: "VOID",
        amount: existing.currentBalance,
        note: "Gift card voided",
      },
    }),
  ]);

  return toGiftCard(row);
}

export async function lookupGiftCardByCode(
  tenantId: string,
  code: string
): Promise<GiftCard> {
  const row = await prisma.giftCard.findFirst({
    where: { tenantId, code: code.toUpperCase().trim() },
  });
  if (!row) throw new Error(`Gift card "${code}" not found`);
  return toGiftCard(row);
}

/**
 * Applies a gift card to an order. Returns amount applied and remaining balance.
 * Does NOT write the redemption transaction — caller must persist via applyGiftCardToOrder.
 */
export async function validateGiftCard(
  tenantId: string,
  code: string,
  orderAmountMinor: number
): Promise<ApplyGiftCardResult> {
  const card = await prisma.giftCard.findFirst({
    where: { tenantId, code: code.toUpperCase().trim() },
  });
  if (!card) throw new Error(`Gift card "${code}" is not valid`);
  if (card.isVoided) throw new Error(`Gift card "${code}" has been voided`);
  if (card.currentBalance <= 0) throw new Error(`Gift card "${code}" has no remaining balance`);
  if (card.expiresAt && card.expiresAt < new Date()) throw new Error(`Gift card "${code}" has expired`);

  const amountApplied = Math.min(card.currentBalance, orderAmountMinor);
  const remainingBalance = card.currentBalance - amountApplied;

  return {
    giftCardId: card.id,
    code: card.code,
    amountApplied,
    remainingBalance,
  };
}

/**
 * Redeems a gift card against an order, writing a REDEEM transaction.
 */
export async function applyGiftCardToOrder(
  tenantId: string,
  code: string,
  orderAmountMinor: number,
  orderId?: string
): Promise<ApplyGiftCardResult> {
  const validated = await validateGiftCard(tenantId, code, orderAmountMinor);

  await prisma.$transaction([
    prisma.giftCard.update({
      where: { id: validated.giftCardId },
      data: { currentBalance: validated.remainingBalance },
    }),
    prisma.giftCardTransaction.create({
      data: {
        giftCardId: validated.giftCardId,
        type: "REDEEM",
        amount: validated.amountApplied,
        orderId: orderId ?? null,
        note: `Redeemed at checkout`,
      },
    }),
  ]);

  return validated;
}
