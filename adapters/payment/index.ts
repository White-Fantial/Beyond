import { PaymentAdapterConfig, PaymentRequest, PaymentResult } from "./types";

export interface PaymentAdapter {
  readonly provider: string;
  initialize(config: PaymentAdapterConfig): Promise<void>;
  requestPayment(payment: PaymentRequest): Promise<PaymentResult>;
  confirmPayment(paymentKey: string, amount: number): Promise<PaymentResult>;
  refundPayment(transactionId: string, amount?: number): Promise<boolean>;
}

export function createPaymentAdapter(_provider: string): PaymentAdapter {
  throw new Error(`Payment adapter for provider "${_provider}" is not yet implemented. Add it to adapters/payment/`);
}
