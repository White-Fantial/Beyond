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
    case "MONTHLY": return "월간";
    case "YEARLY": return "연간";
    case "CUSTOM": return "사용자 정의";
  }
}

export function labelPlanStatus(status: PlanStatus): string {
  switch (status) {
    case "ACTIVE": return "활성";
    case "INACTIVE": return "비활성";
    case "ARCHIVED": return "보관됨";
  }
}

export function labelSubscriptionStatus(status: SubscriptionStatus): string {
  switch (status) {
    case "TRIAL": return "트라이얼";
    case "ACTIVE": return "활성";
    case "PAST_DUE": return "연체";
    case "SUSPENDED": return "정지";
    case "CANCELLED": return "취소됨";
    case "EXPIRED": return "만료됨";
    case "INCOMPLETE": return "미완료";
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
    case "ADJUSTMENT": return "조정";
    case "CREDIT": return "크레딧";
    case "NOTE": return "메모";
  }
}

export function labelBillingRecordStatus(status: BillingRecordStatus): string {
  switch (status) {
    case "DRAFT": return "초안";
    case "OPEN": return "오픈";
    case "PAID": return "결제완료";
    case "VOID": return "무효";
    case "UNCOLLECTIBLE": return "수금불가";
  }
}

export function labelSubscriptionEventType(type: SubscriptionEventType): string {
  switch (type) {
    case "PLAN_ASSIGNED": return "플랜 할당";
    case "PLAN_CHANGED": return "플랜 변경";
    case "TRIAL_EXTENDED": return "트라이얼 연장";
    case "STATUS_CHANGED": return "상태 변경";
    case "CANCEL_AT_PERIOD_END_SET": return "기간 종료 시 취소 설정";
    case "SUBSCRIPTION_REACTIVATED": return "구독 재활성화";
    case "BILLING_OVERRIDE_APPLIED": return "Billing 오버라이드 적용";
    case "BILLING_NOTE_ADDED": return "메모 추가";
  }
}

export function labelLimitKey(key: string): string {
  const map: Record<string, string> = {
    max_stores: "최대 매장 수",
    max_users: "최대 사용자 수",
    max_active_integrations: "최대 연동 수",
    monthly_order_limit: "월간 주문 한도",
  };
  return map[key] ?? key;
}

export function labelFeatureKey(key: string): string {
  const map: Record<string, string> = {
    advanced_analytics: "고급 분석",
    subscriptions_enabled: "구독 서비스",
    multi_store: "멀티 매장",
    delivery_integrations: "배달 연동",
    priority_support: "우선 지원",
    custom_branding: "커스텀 브랜딩",
  };
  return map[key] ?? key;
}
