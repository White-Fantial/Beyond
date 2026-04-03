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
}

export interface PlaceGuestOrderResult {
  orderId: string;
  status: string;
  estimatedPickupAt: string;
}

// ─── Order Status ─────────────────────────────────────────────────────────────

export interface GuestOrderStatus {
  orderId: string;
  status: string;
  customerName: string | null;
  estimatedPickupAt: string | null;
  updatedAt: string;
}
