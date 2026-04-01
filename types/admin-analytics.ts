// Admin Analytics types — platform operations view models for the Admin Console.

export interface AdminAnalyticsFilters {
  from: Date;
  to: Date;
  tenantId?: string;
  storeId?: string;
  provider?: string;
  sourceChannel?: string;
  connectionStatus?: string;
}

export interface AdminKpiCard {
  label: string;
  value: number;
  previousValue: number;
  delta: number; // percentage change vs previous period
  unit?: string; // e.g. "NZD", "%"
  note?: string;
}

export interface AdminTrendPoint {
  date: string; // ISO date string YYYY-MM-DD
  totalOrders: number;
  completedOrders: number;
  grossSales: number;
}

export interface AdminProviderHealthRow {
  provider: string;
  connected: number;
  error: number;
  reauthRequired: number;
  disconnected: number;
  notConnected: number;
  total: number;
}

export interface AdminFailureBreakdownRow {
  category: string; // "webhook" | "sync" | "refresh" | "pos_forwarding"
  provider: string;
  count: number;
}

export interface AdminProblemStoreRow {
  storeId: string;
  storeName: string;
  tenantId: string;
  tenantDisplayName: string;
  problemScore: number;
  labels: string[]; // e.g. ["REAUTH_REQUIRED", "SYNC_FAILED"]
  reauthRequired: number;
  syncFailed: number;
  webhookFailed: number;
  posFailed: number;
  failedJobsCount: number;
}

export type AdminAttentionItemType =
  | "REAUTH_REQUIRED_CONNECTION"
  | "REPEATED_SYNC_FAILURE"
  | "WEBHOOK_ERROR_SPIKE"
  | "POS_FORWARD_FAILURE_SPIKE"
  | "FAILED_JOBS_BACKLOG"
  | "STORE_NO_RECENT_ORDERS"
  | "BILLING_FAILURE_RECENT";

export type AdminAttentionSeverity = "critical" | "warning" | "info";

export interface AdminAttentionItem {
  type: AdminAttentionItemType;
  severity: AdminAttentionSeverity;
  title: string;
  description: string;
  count: number;
  /** Link to the relevant admin page with filters pre-applied */
  href: string;
}

export interface AdminAttentionSummary {
  critical: number;
  warning: number;
  info: number;
  items: AdminAttentionItem[];
}

export interface AdminAnalyticsOverview {
  totalOrders: AdminKpiCard;
  completedOrders: AdminKpiCard;
  grossSales: AdminKpiCard;
  avgOrderValue: AdminKpiCard;
  activeConnections: AdminKpiCard;
  reauthRequiredConnections: AdminKpiCard;
  webhookFailureRate: AdminKpiCard;
  posForwardFailureRate: AdminKpiCard;
  catalogSyncSuccessRate: AdminKpiCard;
  failedJobs: AdminKpiCard;
  currencyCode: string;
}

export interface AdminConnectionRecoveryContext {
  connectionId: string;
  tenantId: string;
  storeId: string;
  provider: string;
  type: string;
  status: string;
  authScheme: string | null;
  canRefreshCredentials: boolean;
  supportsCatalogSync: boolean;
  lastConnectedAt: Date | null;
  lastAuthValidatedAt: Date | null;
  lastSyncAt: Date | null;
  lastSyncStatus: string | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  isReauthRequired: boolean;
}

export interface AdminRecoveryJobResult {
  jobRunId: string;
  jobType: string;
  status: string;
  message: string;
}

export interface AdminValidationResult {
  success: boolean;
  message: string;
  connectionStatus?: string;
  lastAuthValidatedAt?: Date | null;
}
