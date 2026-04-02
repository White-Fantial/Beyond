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
    case "CANCELLED": return "Cancel됨";
    case "EXPIRED": return "만료됨";
    case "INCOMPLETE": return "미Completed";
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
    case "INVOICE": return "인보이스";
    case "PAYMENT": return "결제";
    case "ADJUSTMENT": return "Adjustment";
    case "CREDIT": return "Credit";
    case "NOTE": return "Note";
  }
}

export function labelBillingRecordStatus(status: BillingRecordStatus): string {
  switch (status) {
    case "DRAFT": return "초안";
    case "OPEN": return "오픈";
    case "PAID": return "결제Completed";
    case "VOID": return "무효";
    case "UNCOLLECTIBLE": return "수금불가";
  }
}

export function labelSubscriptionEventType(type: SubscriptionEventType): string {
  switch (type) {
    case "PLAN_ASSIGNED": return "플랜 할당";
    case "PLAN_CHANGED": return "Change Plan";
    case "TRIAL_EXTENDED": return "Extend Trial";
    case "STATUS_CHANGED": return "Change Status";
    case "CANCEL_AT_PERIOD_END_SET": return "Period 종료 시 Cancel Settings";
    case "SUBSCRIPTION_REACTIVATED": return "구독 재Active화";
    case "BILLING_OVERRIDE_APPLIED": return "Billing 오버라이드 Apply";
    case "BILLING_NOTE_ADDED": return "메모 Add";
  }
}

export function labelLimitKey(key: string): string {
  const map: Record<string, string> = {
    max_stores: "최대 Store 수",
    max_users: "최대 User 수",
    max_active_integrations: "최대 연동 수",
    monthly_order_limit: "Monthly 주문 한도",
  };
  return map[key] ?? key;
}

export function labelFeatureKey(key: string): string {
  const map: Record<string, string> = {
    advanced_analytics: "고급 분석",
    subscriptions_enabled: "Subscription Service",
    multi_store: "멀티 Store",
    delivery_integrations: "Delivery Integration",
    priority_support: "우선 지원",
    custom_branding: "커스텀 브랜딩",
  };
  return map[key] ?? key;
}
