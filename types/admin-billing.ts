import type { PaginatedResult, PaginationMeta } from "@/types/admin";

export type { PaginatedResult, PaginationMeta };

// Plan types
export type PlanStatus = "ACTIVE" | "INACTIVE" | "ARCHIVED";
export type BillingInterval = "MONTHLY" | "YEARLY" | "CUSTOM";
export type SubscriptionStatus = "TRIAL" | "ACTIVE" | "PAST_DUE" | "SUSPENDED" | "CANCELLED" | "EXPIRED" | "INCOMPLETE";
export type BillingRecordType = "INVOICE" | "PAYMENT" | "ADJUSTMENT" | "CREDIT" | "NOTE";
export type BillingRecordStatus = "DRAFT" | "OPEN" | "PAID" | "VOID" | "UNCOLLECTIBLE";
export type SubscriptionEventType = "PLAN_ASSIGNED" | "PLAN_CHANGED" | "TRIAL_EXTENDED" | "STATUS_CHANGED" | "CANCEL_AT_PERIOD_END_SET" | "SUBSCRIPTION_REACTIVATED" | "BILLING_OVERRIDE_APPLIED" | "BILLING_NOTE_ADDED";

// Plan limit (for admin display)
export interface PlanLimitItem {
  id: string;
  key: string;
  valueInt: number | null;
  valueText: string | null;
  valueBool: boolean | null;
  unit: string | null;
}

// Plan feature (for admin display)
export interface PlanFeatureItem {
  id: string;
  key: string;
  enabled: boolean;
  configJson: Record<string, unknown> | null;
}

// Plan list row
export interface AdminPlanListItem {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  billingInterval: BillingInterval;
  priceAmountMinor: number;
  currencyCode: string;
  trialDays: number | null;
  isDefault: boolean;
  sortOrder: number;
  tenantCount: number;
  updatedAt: Date;
}

// Plan detail
export interface AdminPlanDetail {
  id: string;
  code: string;
  name: string;
  description: string | null;
  status: PlanStatus;
  billingInterval: BillingInterval;
  priceAmountMinor: number;
  currencyCode: string;
  trialDays: number | null;
  isDefault: boolean;
  sortOrder: number;
  metadataJson: Record<string, unknown> | null;
  limits: PlanLimitItem[];
  features: PlanFeatureItem[];
  tenantCount: number;
  tenants: PlanTenantRow[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlanTenantRow {
  tenantId: string;
  tenantDisplayName: string;
  tenantSlug: string;
  subscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  currentPeriodEnd: Date | null;
  storesCount: number;
  usersCount: number;
}

// Tenant subscription list params
export interface AdminTenantBillingListParams {
  q?: string;
  planId?: string;
  status?: string;
  overLimitOnly?: boolean;
  trialOnly?: boolean;
  pastDueOnly?: boolean;
  page?: number;
  pageSize?: number;
}

// Tenant billing list row
export interface AdminTenantBillingListItem {
  tenantId: string;
  tenantDisplayName: string;
  tenantSlug: string;
  planCode: string;
  planName: string;
  subscriptionId: string;
  subscriptionStatus: SubscriptionStatus;
  trialEnd: Date | null;
  currentPeriodEnd: Date | null;
  billingEmail: string | null;
  storesCount: number;
  usersCount: number;
  activeIntegrationsCount: number;
  isOverLimit: boolean;
  updatedAt: Date;
}

// Tenant billing account
export interface TenantBillingAccountData {
  id: string;
  tenantId: string;
  billingEmail: string;
  companyName: string | null;
  legalName: string | null;
  taxNumber: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  countryCode: string | null;
  externalCustomerRef: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Usage snapshot
export interface TenantUsageData {
  tenantId: string;
  storesCount: number;
  usersCount: number;
  activeIntegrationsCount: number;
  ordersCount: number;
  subscriptionsCount: number;
  capturedAt: Date | null;
}

// Usage comparison result
export interface UsageLimitComparison {
  key: string;
  label: string;
  current: number;
  limit: number | null;
  unit: string | null;
  status: "ok" | "warning" | "exceeded" | "unlimited";
  percentUsed: number | null;
}

// Subscription event row
export interface SubscriptionEventRow {
  id: string;
  eventType: SubscriptionEventType;
  actorLabel: string | null;
  fromStatus: string | null;
  toStatus: string | null;
  fromPlanCode: string | null;
  toPlanCode: string | null;
  note: string | null;
  createdAt: Date;
}

// Billing record row
export interface BillingRecordRow {
  id: string;
  recordType: BillingRecordType;
  status: BillingRecordStatus;
  amountMinor: number | null;
  currencyCode: string | null;
  dueAt: Date | null;
  paidAt: Date | null;
  summary: string;
  createdAt: Date;
}

// Full tenant billing detail
export interface AdminTenantBillingDetail {
  tenantId: string;
  tenantDisplayName: string;
  tenantSlug: string;
  tenantStatus: string;
  subscription: {
    id: string;
    planId: string;
    planCode: string;
    planName: string;
    status: SubscriptionStatus;
    billingInterval: BillingInterval;
    currentPeriodStart: Date | null;
    currentPeriodEnd: Date | null;
    trialStart: Date | null;
    trialEnd: Date | null;
    cancelAtPeriodEnd: boolean;
    cancelledAt: Date | null;
    suspendedAt: Date | null;
    reactivatedAt: Date | null;
    startedAt: Date;
    externalSubscriptionRef: string | null;
  } | null;
  billingAccount: TenantBillingAccountData | null;
  usage: TenantUsageData;
  usageComparisons: UsageLimitComparison[];
  billingRecords: BillingRecordRow[];
  subscriptionEvents: SubscriptionEventRow[];
}

// Admin billing overview
export interface AdminBillingOverview {
  totalTenantsWithSubscription: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  pastDueSubscriptions: number;
  suspendedSubscriptions: number;
  cancelledSubscriptions: number;
  planDistribution: PlanDistributionRow[];
  recentSubscriptionEvents: RecentSubscriptionEventRow[];
  recentBillingRecords: RecentBillingRecordRow[];
  mrrEstimateMinor: number;
}

export interface PlanDistributionRow {
  planId: string;
  planCode: string;
  planName: string;
  tenantCount: number;
  priceAmountMinor: number;
  currencyCode: string;
}

export interface RecentSubscriptionEventRow {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  eventType: SubscriptionEventType;
  note: string | null;
  createdAt: Date;
}

export interface RecentBillingRecordRow {
  id: string;
  tenantId: string;
  tenantDisplayName: string;
  recordType: BillingRecordType;
  status: BillingRecordStatus;
  amountMinor: number | null;
  currencyCode: string | null;
  summary: string;
  createdAt: Date;
}

// Input types for write operations
export interface CreatePlanInput {
  code: string;
  name: string;
  description?: string;
  billingInterval: BillingInterval;
  priceAmountMinor: number;
  currencyCode?: string;
  trialDays?: number;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface UpdatePlanInput {
  name?: string;
  description?: string;
  billingInterval?: BillingInterval;
  priceAmountMinor?: number;
  currencyCode?: string;
  trialDays?: number | null;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface PlanLimitInput {
  key: string;
  valueInt?: number | null;
  valueText?: string | null;
  valueBool?: boolean | null;
  unit?: string | null;
}

export interface PlanFeatureInput {
  key: string;
  enabled: boolean;
  configJson?: Record<string, unknown> | null;
}

export interface AssignTenantPlanInput {
  tenantId: string;
  planId: string;
  billingInterval?: BillingInterval;
  trialDays?: number;
  note?: string;
  actorUserId: string;
}

export interface ChangeTenantPlanInput {
  tenantId: string;
  subscriptionId: string;
  newPlanId: string;
  note?: string;
  actorUserId: string;
}

export interface ExtendTenantTrialInput {
  tenantId: string;
  subscriptionId: string;
  extensionDays: number;
  note?: string;
  actorUserId: string;
}

export interface UpdateTenantSubscriptionStatusInput {
  tenantId: string;
  subscriptionId: string;
  newStatus: SubscriptionStatus;
  note?: string;
  actorUserId: string;
}

export interface UpdateTenantBillingAccountInput {
  tenantId: string;
  billingEmail?: string;
  companyName?: string | null;
  legalName?: string | null;
  taxNumber?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  countryCode?: string | null;
  externalCustomerRef?: string | null;
  notes?: string | null;
  actorUserId: string;
}

export interface AddBillingRecordInput {
  tenantId: string;
  tenantSubscriptionId?: string;
  recordType: BillingRecordType;
  status?: BillingRecordStatus;
  amountMinor?: number;
  currencyCode?: string;
  dueAt?: Date;
  summary: string;
  metadataJson?: Record<string, unknown>;
  actorUserId: string;
}

// Plan list params
export interface AdminPlanListParams {
  status?: string;
  page?: number;
  pageSize?: number;
}
