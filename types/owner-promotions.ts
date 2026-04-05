export type PromoDiscountType = "PERCENT" | "FIXED_AMOUNT" | "FREE_ITEM";
export type PromoStatus = "ACTIVE" | "INACTIVE" | "EXPIRED";

export interface PromoCode {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  description: string | null;
  discountType: PromoDiscountType;
  /** Stored as string from Decimal */
  discountValue: string;
  minOrderAmount: string | null;
  maxUses: number | null;
  usedCount: number;
  status: PromoStatus;
  startsAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PromoRedemption {
  id: string;
  promoCodeId: string;
  orderId: string | null;
  userId: string | null;
  discountMinor: number;
  redeemedAt: string;
}

export interface PromoCodeListResult {
  items: PromoCode[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreatePromoCodeInput {
  code: string;
  description?: string;
  discountType: PromoDiscountType;
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  storeId?: string;
  startsAt?: string;
  expiresAt?: string;
}

export interface UpdatePromoCodeInput {
  description?: string;
  discountValue?: number;
  minOrderAmount?: number;
  maxUses?: number;
  status?: PromoStatus;
  startsAt?: string;
  expiresAt?: string;
}

export interface PromoCodeFilters {
  status?: PromoStatus;
  storeId?: string;
  page?: number;
  pageSize?: number;
}

export interface PromoCodeDetail extends PromoCode {
  redemptions: PromoRedemption[];
  redemptionCount: number;
}

export interface ApplyPromoResult {
  promoCodeId: string;
  code: string;
  discountType: PromoDiscountType;
  discountValue: string;
  discountMinor: number;
}
