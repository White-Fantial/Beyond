export type WebhookDeliveryStatus = "PENDING" | "SUCCESS" | "FAILED";

export const WEBHOOK_EVENTS = [
  "order.created",
  "order.status_changed",
  "subscription.created",
  "subscription.cancelled",
  "subscription.paused",
  "subscription.resumed",
  "promo_code.redeemed",
  "gift_card.issued",
  "gift_card.redeemed",
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENTS)[number];

export interface WebhookEndpoint {
  id: string;
  tenantId: string;
  url: string;
  events: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookDelivery {
  id: string;
  endpointId: string;
  event: string;
  payload: Record<string, unknown>;
  status: WebhookDeliveryStatus;
  httpStatus: number | null;
  responseBody: string | null;
  attemptCount: number;
  lastAttemptAt: string | null;
  createdAt: string;
}

export interface WebhookEndpointDetail extends WebhookEndpoint {
  recentDeliveries: WebhookDelivery[];
}

export interface WebhookEndpointListResult {
  items: WebhookEndpoint[];
  total: number;
}

export interface CreateWebhookEndpointInput {
  url: string;
  events: string[];
  secret?: string;
}
