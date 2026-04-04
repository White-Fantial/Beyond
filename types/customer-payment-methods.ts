// Customer Portal Phase 3 — Payment Method types

export interface SavedPaymentMethod {
  id: string;
  userId: string;
  provider: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
  providerMethodId: string;
  createdAt: string; // ISO 8601
}

export interface AddPaymentMethodInput {
  providerMethodId: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
}
