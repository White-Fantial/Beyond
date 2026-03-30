export interface PaymentAdapterConfig {
  clientKey?: string;
  secretKey?: string;
  webhookSecret?: string;
}

export interface PaymentRequest {
  orderId: string;
  amount: number;
  orderName: string;
  customerEmail?: string;
  customerName?: string;
}

export interface PaymentResult {
  externalTransactionId: string;
  status: "SUCCESS" | "FAILED" | "PENDING";
  paidAmount: number;
  paidAt?: string;
  method?: string;
}
