// Customer Portal Phase 1 — type definitions

// ─── Orders ───────────────────────────────────────────────────────────────────

export interface CustomerOrderModifier {
  modifierGroupName: string | null;
  modifierOptionName: string;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;
}

export interface CustomerOrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;
  notes: string | null;
  modifiers: CustomerOrderModifier[];
}

export interface CustomerOrderEvent {
  id: string;
  eventType: string;
  message: string | null;
  createdAt: string; // ISO 8601
}

export interface CustomerOrderSummary {
  id: string;
  status: string;
  sourceChannel: string;
  storeName: string | null;
  orderedAt: string; // ISO 8601
  totalAmount: number;
  currencyCode: string;
  itemCount: number;
}

export interface CustomerOrderListResult {
  orders: CustomerOrderSummary[];
  total: number;
  limit: number;
  offset: number;
}

export interface CustomerOrderDetail {
  id: string;
  status: string;
  sourceChannel: string;
  storeName: string | null;
  orderedAt: string; // ISO 8601
  acceptedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  currencyCode: string;
  notes: string | null;
  items: CustomerOrderItem[];
  events: CustomerOrderEvent[];
}

export interface CustomerOrderListOptions {
  status?: string | string[];
  limit?: number;
  offset?: number;
}

// ─── Subscriptions ────────────────────────────────────────────────────────────

export interface CustomerSubscriptionSummary {
  id: string;
  status: string;
  planId: string;
  planName: string;
  planInterval: string;
  planPrice: number;
  storeName: string | null;
  storeId: string | null;
  nextOrderAt: string | null; // ISO 8601
  nextBillingDate: string; // ISO 8601
  startDate: string; // ISO 8601
  pausedAt: string | null;
  cancelledAt: string | null;
}

// ─── Account ──────────────────────────────────────────────────────────────────

export interface CustomerAccountInfo {
  id: string;
  name: string;
  email: string;
  phone: string | null;
}
