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
