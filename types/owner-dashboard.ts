// Owner Dashboard view-model types — tenant-scoped aggregation

export type ConnectionSummaryStatus =
  | "CONNECTED"
  | "PARTIAL"
  | "NOT_CONNECTED"
  | "ERROR"
  | "REAUTH_REQUIRED";

export type AlertSeverity = "INFO" | "WARNING" | "CRITICAL";

export type AlertType =
  | "POS_CONNECTION_ISSUE"
  | "DELIVERY_CONNECTION_ISSUE"
  | "SYNC_FAILED"
  | "PENDING_INVITATION"
  | "BILLING_ISSUE";

export interface OwnerDashboardStoreSummary {
  storeId: string;
  storeName: string;
  storeCode: string;
  storeStatus: string;
  posStatus: ConnectionSummaryStatus;
  deliveryStatus: ConnectionSummaryStatus;
  todayOrders: number;
  todayRevenueAmount: number;
  currencyCode: string;
}

export interface OwnerDashboardAlert {
  id: string;
  severity: AlertSeverity;
  type: AlertType;
  title: string;
  message: string;
  storeId?: string;
  storeName?: string;
  href?: string;
}

export interface OwnerDashboardData {
  businessOverview: {
    totalStores: number;
    totalStaff: number;
    posConnections: number;
    deliveryConnections: number;
    todayOrders: number;
    todayRevenueAmount: number;
    monthlyRevenueAmount: number;
    currencyCode: string;
  };
  storeSummaries: OwnerDashboardStoreSummary[];
  alerts: OwnerDashboardAlert[];
}

export interface GetOwnerDashboardInput {
  tenantId: string;
  actorUserId: string;
}
