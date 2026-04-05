/**
 * Owner Promotions Service — Phase 12.
 *
 * Manage promo codes and track redemptions. All functions scoped to tenantId.
 */
import { prisma } from "@/lib/prisma";
import type {
  PromoCode,
  PromoCodeListResult,
  CreatePromoCodeInput,
  UpdatePromoCodeInput,
  PromoCodeFilters,
  PromoCodeDetail,
  ApplyPromoResult,
  PromoDiscountType,
  PromoStatus,
} from "@/types/owner-promotions";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toPromoCode(row: {
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
}): PromoCode {
  return {
    id: row.id,
    tenantId: row.tenantId,
    storeId: row.storeId,
    code: row.code,
    description: row.description,
    discountType: row.discountType as PromoDiscountType,
    discountValue: String(row.discountValue),
    minOrderAmount: row.minOrderAmount != null ? String(row.minOrderAmount) : null,
    maxUses: row.maxUses,
    usedCount: row.usedCount,
    status: row.status as PromoStatus,
    startsAt: row.startsAt?.toISOString() ?? null,
    expiresAt: row.expiresAt?.toISOString() ?? null,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function listPromoCodes(
  tenantId: string,
  filters: PromoCodeFilters = {}
): Promise<PromoCodeListResult> {
  const { status, storeId, page = 1, pageSize = 20 } = filters;

  const where = {
    tenantId,
    ...(status ? { status } : {}),
    ...(storeId ? { storeId } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.promoCode.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.promoCode.count({ where }),
  ]);

  return { items: rows.map(toPromoCode), total, page, pageSize };
}

export async function getPromoCodeDetail(
  tenantId: string,
  promoId: string
): Promise<PromoCodeDetail> {
  const row = await prisma.promoCode.findFirst({
    where: { id: promoId, tenantId },
    include: {
      redemptions: {
        orderBy: { redeemedAt: "desc" },
        take: 50,
      },
    },
  });
  if (!row) throw new Error(`PromoCode ${promoId} not found`);

  return {
    ...toPromoCode(row),
    redemptions: row.redemptions.map((r) => ({
      id: r.id,
      promoCodeId: r.promoCodeId,
      orderId: r.orderId,
      userId: r.userId,
      discountMinor: r.discountMinor,
      redeemedAt: r.redeemedAt.toISOString(),
    })),
    redemptionCount: row.redemptions.length,
  };
}

export async function createPromoCode(
  tenantId: string,
  userId: string,
  input: CreatePromoCodeInput
): Promise<PromoCode> {
  const row = await prisma.promoCode.create({
    data: {
      tenantId,
      code: input.code.toUpperCase().trim(),
      description: input.description ?? null,
      discountType: input.discountType,
      discountValue: input.discountValue,
      minOrderAmount: input.minOrderAmount ?? null,
      maxUses: input.maxUses ?? null,
      storeId: input.storeId ?? null,
      startsAt: input.startsAt ? new Date(input.startsAt) : null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      createdBy: userId,
      status: "ACTIVE",
    },
  });
  return toPromoCode(row);
}

export async function updatePromoCode(
  tenantId: string,
  promoId: string,
  input: UpdatePromoCodeInput
): Promise<PromoCode> {
  const existing = await prisma.promoCode.findFirst({ where: { id: promoId, tenantId } });
  if (!existing) throw new Error(`PromoCode ${promoId} not found`);

  const row = await prisma.promoCode.update({
    where: { id: promoId },
    data: {
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.discountValue !== undefined ? { discountValue: input.discountValue } : {}),
      ...(input.minOrderAmount !== undefined ? { minOrderAmount: input.minOrderAmount } : {}),
      ...(input.maxUses !== undefined ? { maxUses: input.maxUses } : {}),
      ...(input.status ? { status: input.status } : {}),
      ...(input.startsAt !== undefined
        ? { startsAt: input.startsAt ? new Date(input.startsAt) : null }
        : {}),
      ...(input.expiresAt !== undefined
        ? { expiresAt: input.expiresAt ? new Date(input.expiresAt) : null }
        : {}),
    },
  });
  return toPromoCode(row);
}

export async function deletePromoCode(tenantId: string, promoId: string): Promise<void> {
  const existing = await prisma.promoCode.findFirst({ where: { id: promoId, tenantId } });
  if (!existing) throw new Error(`PromoCode ${promoId} not found`);
  await prisma.promoCode.delete({ where: { id: promoId } });
}

/**
 * Validates a promo code for a given order amount and records redemption.
 * Returns the discount to apply.
 */
export async function applyPromoCode(
  tenantId: string,
  code: string,
  orderAmountMinor: number,
  userId?: string,
  orderId?: string
): Promise<ApplyPromoResult> {
  const promo = await prisma.promoCode.findFirst({
    where: { tenantId, code: code.toUpperCase().trim(), status: "ACTIVE" },
  });

  if (!promo) throw new Error(`Promo code "${code}" is not valid`);

  const now = new Date();
  if (promo.startsAt && promo.startsAt > now)
    throw new Error(`Promo code "${code}" is not yet active`);
  if (promo.expiresAt && promo.expiresAt < now)
    throw new Error(`Promo code "${code}" has expired`);
  if (promo.maxUses != null && promo.usedCount >= promo.maxUses)
    throw new Error(`Promo code "${code}" has reached its usage limit`);

  const minOrder = promo.minOrderAmount ? Number(promo.minOrderAmount) * 100 : 0;
  if (orderAmountMinor < minOrder) {
    throw new Error(`Minimum order amount not met for promo code "${code}"`);
  }

  let discountMinor = 0;
  if (promo.discountType === "PERCENT") {
    discountMinor = Math.round((orderAmountMinor * Number(promo.discountValue)) / 100);
  } else if (promo.discountType === "FIXED_AMOUNT") {
    discountMinor = Math.min(Math.round(Number(promo.discountValue) * 100), orderAmountMinor);
  }

  await prisma.$transaction([
    prisma.promoRedemption.create({
      data: {
        promoCodeId: promo.id,
        orderId: orderId ?? null,
        userId: userId ?? null,
        discountMinor,
      },
    }),
    prisma.promoCode.update({
      where: { id: promo.id },
      data: { usedCount: { increment: 1 } },
    }),
  ]);

  return {
    promoCodeId: promo.id,
    code: promo.code,
    discountType: promo.discountType as PromoDiscountType,
    discountValue: String(promo.discountValue),
    discountMinor,
  };
}
