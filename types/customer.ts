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

// ─── Addresses (Phase 2) ──────────────────────────────────────────────────────

export interface CustomerAddress {
  id: string;
  label: string;
  line1: string;
  line2: string | null;
  city: string;
  region: string | null;
  postalCode: string | null;
  country: string;
  isDefault: boolean;
  createdAt: string; // ISO 8601
}

export interface CustomerAddressInput {
  label?: string;
  line1: string;
  line2?: string | null;
  city: string;
  region?: string | null;
  postalCode?: string | null;
  country?: string;
}

// ─── Notifications (Phase 2) ──────────────────────────────────────────────────

export type CustomerNotificationType =
  | "ORDER_STATUS_UPDATE"
  | "SUBSCRIPTION_REMINDER"
  | "PAYMENT_ISSUE"
  | "GENERAL";

export interface CustomerNotification {
  id: string;
  userId: string;
  type: CustomerNotificationType;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null; // ISO 8601
  createdAt: string; // ISO 8601
}

export interface CustomerNotificationListResult {
  items: CustomerNotification[];
  total: number;
  unreadCount: number;
  page: number;
  pageSize: number;
}
