export type GiftCardTransactionType = "ISSUE" | "REDEEM" | "REFUND" | "VOID";

export interface GiftCard {
  id: string;
  tenantId: string;
  storeId: string | null;
  code: string;
  initialValue: number;
  currentBalance: number;
  issuedToEmail: string | null;
  expiresAt: string | null;
  isVoided: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GiftCardTransaction {
  id: string;
  giftCardId: string;
  type: GiftCardTransactionType;
  amount: number;
  orderId: string | null;
  note: string | null;
  createdAt: string;
}

export interface GiftCardDetail extends GiftCard {
  transactions: GiftCardTransaction[];
}

export interface GiftCardListResult {
  items: GiftCard[];
  total: number;
  page: number;
  pageSize: number;
}

export interface IssueGiftCardInput {
  storeId?: string;
  initialValue: number;
  issuedToEmail?: string;
  expiresAt?: string;
}

export interface GiftCardFilters {
  storeId?: string;
  isVoided?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ApplyGiftCardResult {
  giftCardId: string;
  code: string;
  amountApplied: number;
  remainingBalance: number;
}
