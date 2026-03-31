// ─── Canonical order domain types ────────────────────────────────────────────
//
// These types mirror the Prisma-generated types and are the single source of
// truth for the order domain throughout the application layer.
//
// Do NOT use the legacy types below for new code. They exist only for
// compatibility with the legacy ordering UI that has not yet been migrated.

// ── Enums ─────────────────────────────────────────────────────────────────────

/** The channel that originated this order. */
export type OrderSourceChannel =
  | "POS"
  | "UBER_EATS"
  | "DOORDASH"
  | "ONLINE"
  | "SUBSCRIPTION"
  | "MANUAL"
  | "UNKNOWN";

/** Channel types used in OrderChannelLink. */
export type OrderChannelType =
  | "POS"
  | "UBER_EATS"
  | "DOORDASH"
  | "ONLINE"
  | "SUBSCRIPTION";

/** Role of an OrderChannelLink relative to an order. */
export type OrderChannelRole = "SOURCE" | "FORWARDED" | "MIRROR";

/** Direction of the channel link event. */
export type OrderLinkDirection = "INBOUND" | "OUTBOUND";

/** Canonical order lifecycle status. */
export type OrderStatus =
  | "RECEIVED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "READY"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

/** State of forwarding an order to POS for docket printing. */
export type PosSubmissionStatus =
  | "NOT_REQUIRED"
  | "PENDING"
  | "SENT"
  | "ACCEPTED"
  | "FAILED"
  | "SKIPPED";

/** Audit event types for OrderEvent. */
export type OrderEventType =
  | "ORDER_RECEIVED"
  | "ORDER_CREATED"
  | "ORDER_UPDATED"
  | "ORDER_STATUS_CHANGED"
  | "POS_FORWARD_REQUESTED"
  | "POS_FORWARD_SENT"
  | "POS_FORWARD_ACCEPTED"
  | "POS_FORWARD_FAILED"
  | "POS_RECONCILED"
  | "ORDER_CANCELLED"
  | "RAW_WEBHOOK_RECEIVED"
  | "RAW_SYNC_RECEIVED";

// ── Canonical models ──────────────────────────────────────────────────────────

/**
 * Canonical order — represents one real customer purchase regardless of channel.
 * A single order record is shared across all channel representations.
 */
export interface CanonicalOrder {
  id: string;
  tenantId: string;
  storeId: string;

  // Source channel
  sourceChannel: OrderSourceChannel;
  sourceConnectionId?: string | null;
  /** External order ref from the originating channel. */
  sourceOrderRef?: string | null;
  sourceCustomerRef?: string | null;
  originSubmittedAt?: Date | null;

  // Lifecycle
  orderedAt: Date;
  acceptedAt?: Date | null;
  completedAt?: Date | null;
  cancelledAt?: Date | null;
  status: OrderStatus;

  // Money (integer minor units)
  subtotalAmount: number;
  discountAmount: number;
  taxAmount: number;
  tipAmount: number;
  totalAmount: number;
  currencyCode: string;

  // Customer
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;

  // POS forwarding
  posForwardingRequired: boolean;
  posConnectionId?: string | null;
  posSubmissionStatus: PosSubmissionStatus;
  posOrderRef?: string | null;
  posSubmittedAt?: Date | null;
  posAcceptedAt?: Date | null;

  // Idempotency
  canonicalOrderKey?: string | null;
  externalCreatedByBeyond: boolean;

  notes?: string | null;
  rawSourcePayload?: unknown;

  createdAt: Date;
  updatedAt: Date;
}

/** Line item within a canonical order. */
export interface CanonicalOrderItem {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;

  productId?: string | null;
  productName: string;
  productSku?: string | null;
  sourceProductRef?: string | null;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;

  notes?: string | null;
  rawPayload?: unknown;

  modifiers?: CanonicalOrderItemModifier[];

  createdAt: Date;
  updatedAt: Date;
}

/** Modifier/option within a canonical order item. */
export interface CanonicalOrderItemModifier {
  id: string;
  orderItemId: string;
  tenantId: string;
  storeId: string;

  modifierGroupId?: string | null;
  modifierOptionId?: string | null;
  modifierGroupName?: string | null;
  modifierOptionName: string;
  quantity: number;
  unitPriceAmount: number;
  totalPriceAmount: number;

  sourceModifierGroupRef?: string | null;
  sourceModifierOptionRef?: string | null;
  rawPayload?: unknown;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Per-channel link record for an order.
 * - SOURCE: the channel that originated the order (one per order).
 * - FORWARDED: the order was sent outbound to this channel (e.g. POS).
 * - MIRROR: reconciliation/sync record.
 */
export interface OrderChannelLink {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;

  channelType: OrderChannelType;
  connectionId?: string | null;
  role: OrderChannelRole;
  direction: OrderLinkDirection;

  externalOrderRef?: string | null;
  externalDisplayRef?: string | null;
  externalStatus?: string | null;
  externalCreatedAt?: Date | null;
  externalUpdatedAt?: Date | null;

  requestPayload?: unknown;
  responsePayload?: unknown;
  rawPayload?: unknown;

  /** How this link was established: "webhook" | "sync" | "forward-response" | "manual" */
  linkedBy?: string | null;
  createdByBeyond: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/** Immutable audit trail entry for an order. */
export interface OrderEvent {
  id: string;
  orderId: string;
  tenantId: string;
  storeId: string;
  eventType: OrderEventType;
  channelType?: OrderChannelType | null;
  connectionId?: string | null;
  payload?: unknown;
  message?: string | null;
  createdAt: Date;
}

/** Raw inbound webhook call log. */
export interface InboundWebhookLog {
  id: string;
  tenantId?: string | null;
  storeId?: string | null;
  connectionId?: string | null;
  channelType?: OrderChannelType | null;
  eventName?: string | null;
  externalEventRef?: string | null;
  deliveryId?: string | null;
  signatureValid?: boolean | null;
  processingStatus: string;
  requestHeaders?: unknown;
  requestBody?: unknown;
  receivedAt: Date;
  processedAt?: Date | null;
  errorMessage?: string | null;
}

// ─── Legacy types (deprecated) ────────────────────────────────────────────────
//
// These are kept for backward compatibility only.
// New code must use CanonicalOrder and related types above.

/** @deprecated Use CanonicalOrder instead. */
export interface Order {
  id: string;
  storeId: string;
  channelType: LegacyOrderChannelType;
  externalOrderId?: string;
  status: LegacyOrderStatus;
  items: LegacyOrderItem[];
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** @deprecated Use CanonicalOrderItem instead. */
export interface LegacyOrderItem {
  id: string;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  options?: LegacyOrderItemOption[];
}

/** @deprecated */
export interface LegacyOrderItemOption {
  name: string;
  value: string;
  additionalPrice: number;
}

/** @deprecated Use OrderChannelType instead. */
export type LegacyOrderChannelType =
  | "POS"
  | "BAEMIN"
  | "COUPANG_EATS"
  | "ONLINE"
  | "PHONE";

/** @deprecated Use OrderStatus instead. */
export type LegacyOrderStatus =
  | "PENDING"
  | "ACCEPTED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";
