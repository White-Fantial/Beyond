// Owner portal billing types

import type { BillingInterval } from "@/types/admin-billing";

// ─── Status types ─────────────────────────────────────────────────────────────

export type OwnerSubscriptionStatus =
  | "TRIAL"
  | "ACTIVE"
  | "PAST_DUE"
  | "SUSPENDED"
  | "CANCELLED"
  | "EXPIRED"
  | "INCOMPLETE";

export type OwnerBillingInvoiceStatus =
  | "PAID"
  | "OPEN"
  | "PAST_DUE"
  | "FAILED"
  | "VOID"
  | "REFUNDED"
  | "DRAFT";

export type OwnerPaymentAttemptStatus =
  | "SUCCEEDED"
  | "FAILED"
  | "REQUIRES_ACTION"
  | "PROCESSING"
  | "CANCELED";

export type OwnerUsageMetricStatus = "NORMAL" | "NEAR_LIMIT" | "REACHED" | "EXCEEDED";

export type OwnerSubscriptionChangeType = "UPGRADE" | "DOWNGRADE";
export type OwnerSubscriptionChangeStatus =
  | "PENDING"
  | "BLOCKED"
  | "CONFIRMED"
  | "APPLIED"
  | "CANCELED";
export type OwnerSubscriptionChangeEffectiveMode = "IMMEDIATE" | "NEXT_CYCLE";

// ─── Plan ─────────────────────────────────────────────────────────────────────

export interface OwnerPlanSummary {
  id: string;
  code: string;
  name: string;
  description: string | null;
  billingInterval: BillingInterval;
  priceAmountMinor: number;
  currencyCode: string;
  isDefault: boolean;
  sortOrder: number;
}

export interface OwnerPlanFeature {
  key: string;
  enabled: boolean;
  label: string;
}

export interface OwnerPlanLimit {
  key: string;
  label: string;
  valueInt: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  unit: string | null;
}

export interface OwnerPlanDetail extends OwnerPlanSummary {
  limits: OwnerPlanLimit[];
  features: OwnerPlanFeature[];
  trialDays: number | null;
}

// ─── Subscription ─────────────────────────────────────────────────────────────

export interface OwnerSubscriptionSummary {
  id: string;
  planId: string;
  planCode: string;
  planName: string;
  status: OwnerSubscriptionStatus;
  statusLabel: string;
  billingInterval: BillingInterval;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  nextBillingAt: Date | null;
  trialStart: Date | null;
  trialEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: Date | null;
  priceAmountMinor: number;
  currencyCode: string;
}

// ─── Usage ────────────────────────────────────────────────────────────────────

export interface OwnerUsageMetric {
  metricKey: string;
  label: string;
  currentValue: number;
  limitValue: number | null;
  utilizationPercent: number | null;
  status: OwnerUsageMetricStatus;
  statusLabel: string;
  helperMessage: string;
  showUpgradeCta: boolean;
  unit: string;
}

// ─── Billing Overview ─────────────────────────────────────────────────────────

export type BillingAlertSeverity = "critical" | "warning" | "info";

export interface BillingAlert {
  id: string;
  severity: BillingAlertSeverity;
  title: string;
  message: string;
  actionLabel?: string;
  actionHref?: string;
}

export interface OwnerBillingOverview {
  subscription: OwnerSubscriptionSummary | null;
  plan: OwnerPlanDetail | null;
  billingStatusLabel: string;
  nextBillingDate: Date | null;
  paymentMethodSummary: string | null;
  trialDaysRemaining: number | null;
  alerts: BillingAlert[];
  usageMetrics: OwnerUsageMetric[];
  recentInvoices: OwnerInvoiceRow[];
  quickActions: OwnerBillingQuickAction[];
}

export interface OwnerBillingQuickAction {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary" | "danger";
  show: boolean;
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export interface OwnerInvoiceRow {
  id: string;
  invoiceNumber: string | null;
  status: OwnerBillingInvoiceStatus;
  statusLabel: string;
  currency: string;
  totalMinor: number;
  amountDueMinor: number;
  billedAt: Date | null;
  dueAt: Date | null;
  paidAt: Date | null;
  billingPeriodStart: Date | null;
  billingPeriodEnd: Date | null;
  hostedInvoiceUrl: string | null;
  pdfUrl: string | null;
}

export interface OwnerInvoiceLine {
  id: string;
  type: string;
  description: string;
  quantity: number | null;
  unitAmountMinor: number | null;
  amountMinor: number;
}

export interface OwnerPaymentAttemptRow {
  id: string;
  status: OwnerPaymentAttemptStatus;
  attemptedAt: Date;
  failureCode: string | null;
  failureMessage: string | null;
  retryable: boolean;
}

export interface OwnerInvoiceDetail extends OwnerInvoiceRow {
  subtotalMinor: number;
  taxMinor: number;
  amountPaidMinor: number;
  lines: OwnerInvoiceLine[];
  paymentAttempts: OwnerPaymentAttemptRow[];
}

export interface OwnerInvoiceListResult {
  items: OwnerInvoiceRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Plan Catalog / Change ────────────────────────────────────────────────────

export interface OwnerPlanCatalog {
  currentPlan: OwnerPlanDetail | null;
  plans: OwnerPlanCatalogItem[];
  featureKeys: string[];
}

export interface OwnerPlanCatalogItem extends OwnerPlanDetail {
  isCurrent: boolean;
  changeType: "UPGRADE" | "DOWNGRADE" | "CURRENT" | null;
  priceDisplayMonthly: string;
  priceDisplayYearly: string | null;
}

export interface OwnerPlanChangeLimitDiff {
  key: string;
  label: string;
  currentPlanValue: string;
  targetPlanValue: string;
  isReduction: boolean;
  currentUsage: number | null;
  wouldExceed: boolean;
}

export interface OwnerPlanChangeBlockingReason {
  metricKey: string;
  label: string;
  currentUsage: number;
  targetLimit: number;
  message: string;
}

export interface OwnerPlanChangePreview {
  currentPlan: OwnerPlanDetail;
  targetPlan: OwnerPlanDetail;
  changeType: OwnerSubscriptionChangeType;
  effectiveMode: OwnerSubscriptionChangeEffectiveMode;
  limitDiffs: OwnerPlanChangeLimitDiff[];
  prorationPreviewMinor: number | null;
  prorationDisplayText: string | null;
  blockingReasons: OwnerPlanChangeBlockingReason[];
  isBlocked: boolean;
  summaryText: string;
}
