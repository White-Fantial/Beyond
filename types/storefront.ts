// Storefront Phase 2 — Checkout & Order Placement types

// ─── Checkout ─────────────────────────────────────────────────────────────────

export interface StorefrontCheckoutItem {
  productId: string;
  productName: string;
  unitPriceAmount: number;
  quantity: number;
  selectedModifiers: StorefrontCheckoutModifier[];
  notes?: string;
}

export interface StorefrontCheckoutModifier {
  modifierGroupId: string;
  modifierGroupName: string;
  optionId: string;
  optionName: string;
  priceDeltaAmount: number;
}

export interface PlaceGuestOrderInput {
  storeId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  pickupTime: string; // ISO string
  notes?: string;
  items: StorefrontCheckoutItem[];
  currencyCode: string;
  promoCode?: string;
  redeemLoyaltyPoints?: boolean;
  userId?: string; // for loyalty tracking when customer is logged in
}

export interface PlaceGuestOrderResult {
  orderId: string;
  status: string;
  estimatedPickupAt: string;
  discountApplied?: number; // discount in minor units
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
}

// ─── Order Status ─────────────────────────────────────────────────────────────

export interface GuestOrderStatus {
  orderId: string;
  status: string;
  customerName: string | null;
  estimatedPickupAt: string | null;
  updatedAt: string;
}

// ─── Subscription Checkout ─────────────────────────────────────────────────

export type SubscriptionFrequency = "WEEKLY" | "BIWEEKLY" | "MONTHLY";

export interface SubscriptionPlanPublic {
  id: string;
  name: string;
  price: number; // minor units
  interval: string; // "WEEKLY" | "BIWEEKLY" | "MONTHLY"
  benefits: string[];
}

export interface PlaceGuestSubscriptionInput {
  storeId: string;
  planId: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  frequency: SubscriptionFrequency;
  startDate: string; // YYYY-MM-DD
  notes?: string;
  currencyCode: string;
}

export interface PlaceGuestSubscriptionResult {
  subscriptionId: string;
  status: string;
  startDate: string;
  nextBillingDate: string;
  totalAmount: number;
  currencyCode: string;
}

export interface GuestSubscriptionStatus {
  subscriptionId: string;
  status: string;
  customerName: string | null;
  frequency: string | null;
  startDate: string;
  nextBillingDate: string;
  updatedAt: string;
}
