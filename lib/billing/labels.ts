import type { BillingInterval, PlanStatus, SubscriptionStatus, BillingRecordType, BillingRecordStatus, SubscriptionEventType } from "@/types/admin-billing";

export function formatPriceMinor(amountMinor: number, currencyCode: string): string {
  const amount = amountMinor / 100;
  return new Intl.NumberFormat("en-NZ", {
    style: "currency",
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function labelBillingInterval(interval: BillingInterval): string {
  switch (interval) {
    case "MONTHLY": return "Monthly";
    case "YEARLY": return "Yearly";
    case "CUSTOM": return "Custom";
  }
}

export function labelPlanStatus(status: PlanStatus): string {
  switch (status) {
    case "ACTIVE": return "Active";
    case "INACTIVE": return "Inactive";
    case "ARCHIVED": return "Archived";
  }
}

export function labelSubscriptionStatus(status: SubscriptionStatus): string {
  switch (status) {
    case "TRIAL": return "Trials";
    case "ACTIVE": return "Active";
    case "PAST_DUE": return "Past Due";
    case "SUSPENDED": return "Suspended";
    case "CANCELLED": return "Cancelled";
    case "EXPIRED": return "Expired";
    case "INCOMPLETE": return "Incomplete";
  }
}

export function subscriptionStatusColor(status: SubscriptionStatus): string {
  switch (status) {
    case "TRIAL": return "blue";
    case "ACTIVE": return "green";
    case "PAST_DUE": return "yellow";
    case "SUSPENDED": return "orange";
    case "CANCELLED": return "gray";
    case "EXPIRED": return "gray";
    case "INCOMPLETE": return "red";
    default: return "gray";
  }
}

export function labelBillingRecordType(type: BillingRecordType): string {
  switch (type) {
    case "INVOICE": return "Invoice";
    case "PAYMENT": return "Payment";
    case "ADJUSTMENT": return "Adjustment";
    case "CREDIT": return "Credit";
    case "NOTE": return "Note";
  }
}

export function labelBillingRecordStatus(status: BillingRecordStatus): string {
  switch (status) {
    case "DRAFT": return "Draft";
    case "OPEN": return "Open";
    case "PAID": return "Paid";
    case "VOID": return "Void";
    case "UNCOLLECTIBLE": return "Uncollectible";
  }
}

export function labelSubscriptionEventType(type: SubscriptionEventType): string {
  switch (type) {
    case "PLAN_ASSIGNED": return "Plan assigned";
    case "PLAN_CHANGED": return "Change Plan";
    case "TRIAL_EXTENDED": return "Extend Trial";
    case "STATUS_CHANGED": return "Change Status";
    case "CANCEL_AT_PERIOD_END_SET": return "Cancel at period end set";
    case "SUBSCRIPTION_REACTIVATED": return "Subscription reactivated";
    case "BILLING_OVERRIDE_APPLIED": return "Billing override applied";
    case "BILLING_NOTE_ADDED": return "Billing note added";
  }
}

export function labelLimitKey(key: string): string {
  const map: Record<string, string> = {
    max_stores: "Max Stores",
    max_users: "Max Users",
    max_active_integrations: "Max Integrations",
    monthly_order_limit: "Monthly Order Limit",
  };
  return map[key] ?? key;
}

export function labelFeatureKey(key: string): string {
  const map: Record<string, string> = {
    advanced_analytics: "Advanced Analytics",
    subscriptions_enabled: "Subscription Service",
    multi_store: "Multi-Store",
    delivery_integrations: "Delivery Integration",
    priority_support: "Priority Support",
    custom_branding: "Custom Branding",
  };
  return map[key] ?? key;
}

// ─── Owner-facing status labels ────────────────────────────────────────────────

export type OwnerSubscriptionStatusType =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "INCOMPLETE";

export function labelOwnerSubscriptionStatus(status: OwnerSubscriptionStatusType): string {
  switch (status) {
    case "TRIAL": return "Free trial";
    case "ACTIVE": return "Active";
    case "PAST_DUE": return "Payment overdue";
    case "SUSPENDED": return "Billing paused";
    case "CANCELLED": return "Cancelled";
    case "EXPIRED": return "Expired";
    case "INCOMPLETE": return "Payment incomplete";
    default: return status;
  }
}

export type OwnerBillingInvoiceStatusType =
  | "PAID"
  | "OPEN"
  | "PAST_DUE"
  | "FAILED"
  | "VOID"
  | "REFUNDED"
  | "DRAFT";

export function labelOwnerInvoiceStatus(status: OwnerBillingInvoiceStatusType): string {
  switch (status) {
    case "PAID": return "Paid";
    case "OPEN": return "Open";
    case "PAST_DUE": return "Past due";
    case "FAILED": return "Failed";
    case "VOID": return "Void";
    case "REFUNDED": return "Refunded";
    case "DRAFT": return "Draft";
    default: return status;
  }
}

export type OwnerUsageMetricStatusType = "NORMAL" | "NEAR_LIMIT" | "REACHED" | "EXCEEDED";

export function labelOwnerUsageStatus(status: OwnerUsageMetricStatusType): string {
  switch (status) {
    case "NORMAL": return "Normal";
    case "NEAR_LIMIT": return "Near limit";
    case "REACHED": return "Limit reached";
    case "EXCEEDED": return "Over limit";
    default: return status;
  }
}

export function colorOwnerInvoiceStatus(status: OwnerBillingInvoiceStatusType): string {
  switch (status) {
    case "PAID": return "green";
    case "OPEN": return "blue";
    case "PAST_DUE": return "orange";
    case "FAILED": return "red";
    case "VOID": return "gray";
    case "REFUNDED": return "purple";
    case "DRAFT": return "gray";
    default: return "gray";
  }
}

export function colorOwnerSubscriptionStatus(status: OwnerSubscriptionStatusType): string {
  switch (status) {
    case "ACTIVE": return "green";
    case "TRIAL": return "blue";
    case "PAST_DUE": return "orange";
    case "SUSPENDED": return "yellow";
    case "CANCELLED": return "gray";
    case "EXPIRED": return "gray";
    case "INCOMPLETE": return "red";
    default: return "gray";
  }
}

export function colorOwnerUsageStatus(status: OwnerUsageMetricStatusType): string {
  switch (status) {
    case "NORMAL": return "green";
    case "NEAR_LIMIT": return "yellow";
    case "REACHED": return "orange";
    case "EXCEEDED": return "red";
    default: return "gray";
  }
}

export const OWNER_METRIC_LABELS: Record<string, string> = {
  "stores.max": "Stores",
  "staff.max": "Staff users",
  "channels.max": "Connected channels",
  "orders.monthly": "Monthly orders",
  "subscriptions.monthly": "Monthly subscriptions",
  "analytics.advanced": "Advanced analytics",
  "automation.basic": "Basic automation",
};

export const OWNER_METRIC_UNITS: Record<string, string> = {
  "stores.max": "stores",
  "staff.max": "users",
  "channels.max": "channels",
  "orders.monthly": "orders",
  "subscriptions.monthly": "subscriptions",
};

export function labelOwnerMetricKey(key: string): string {
  return OWNER_METRIC_LABELS[key] ?? key;
}
