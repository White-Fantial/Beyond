export interface Payment {
  id: string;
  orderId: string;
  storeId: string;
  method: PaymentMethod;
  status: PaymentStatus;
  amount: number;
  externalTransactionId?: string;
  provider?: PaymentProvider;
  paidAt?: Date;
  createdAt: Date;
}

export type PaymentMethod = "CARD" | "CASH" | "MOBILE" | "KAKAOPAY" | "NAVERPAY" | "TOSSMONEY";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "PARTIAL_REFUNDED";
export type PaymentProvider = "TOSS_PAYMENTS" | "KG_INICIS" | "NICE_PAYMENTS";
